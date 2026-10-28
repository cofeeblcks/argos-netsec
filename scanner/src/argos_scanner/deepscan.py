from __future__ import annotations

import re
import shutil
import subprocess
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import Any

from argos_scanner.discovery import _mac_from_arp, _normalize_mac


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _is_root() -> bool:
    try:
        import os

        return os.geteuid() == 0
    except AttributeError:
        return False


def run_deep_scan(
    targets: list[str],
    timing: str = "-T3",
    mac_by_ip: dict[str, str] | None = None,
    batch_size: int = 20,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Return (device updates, services) from nmap -sV XML.

    OS fingerprint (-O) only when running as root; otherwise nmap aborts entirely.
    Targets are scanned in batches so large inventories do not hit a single timeout.
    """
    if not targets or not shutil.which("nmap"):
        return [], []

    unique_targets = list(dict.fromkeys(targets))
    devices: list[dict[str, Any]] = []
    services: list[dict[str, Any]] = []
    total = len(unique_targets)
    print(f"[argos-scanner] nmap deep scan: {total} targets in batches of {batch_size}")

    for start in range(0, total, batch_size):
        chunk = unique_targets[start : start + batch_size]
        batch_no = start // batch_size + 1
        batches = (total + batch_size - 1) // batch_size
        print(f"[argos-scanner] nmap batch {batch_no}/{batches} ({len(chunk)} hosts)")

        cmd = [
            "nmap",
            "-Pn",  # don't skip hosts that ignore ICMP; still scan TCP
            "-sV",
            "--top-ports",
            "100",
            timing,
            "-oX",
            "-",
            *chunk,
        ]
        if _is_root():
            cmd[3:3] = ["-O", "--osscan-guess"]

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=900, check=False)
        except (OSError, subprocess.TimeoutExpired) as exc:
            print(f"[argos-scanner] nmap batch {batch_no} failed: {exc}")
            continue

        if not result.stdout.strip():
            err = (result.stderr or "").strip()
            if err:
                print(f"[argos-scanner] nmap batch {batch_no} stderr: {err[:400]}")
            continue

        batch_devices, batch_services = parse_nmap_xml(result.stdout, mac_by_ip=mac_by_ip)
        devices.extend(batch_devices)
        services.extend(batch_services)
        print(
            f"[argos-scanner] nmap batch {batch_no} done: "
            f"{len(batch_devices)} hosts, {len(batch_services)} open ports"
        )

    return devices, services


def parse_nmap_xml(
    xml_text: str,
    mac_by_ip: dict[str, str] | None = None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    root = ET.fromstring(xml_text)
    now = _now()
    devices: list[dict[str, Any]] = []
    services: list[dict[str, Any]] = []
    mac_by_ip = {ip: _normalize_mac(mac) for ip, mac in (mac_by_ip or {}).items()}

    for host in root.findall("host"):
        status = host.find("status")
        # With -Pn, "down" is rare; still skip explicit down
        if status is not None and status.get("state") == "down":
            continue

        addr_ip = None
        addr_mac = None
        vendor = None
        for addr in host.findall("address"):
            if addr.get("addrtype") == "ipv4":
                addr_ip = addr.get("addr")
            elif addr.get("addrtype") == "mac":
                addr_mac = _normalize_mac(addr.get("addr", ""))
                vendor = addr.get("vendor")

        if not addr_ip:
            continue
        if not addr_mac:
            addr_mac = mac_by_ip.get(addr_ip) or _mac_from_arp(addr_ip)
        if not addr_mac:
            print(f"[argos-scanner] skip {addr_ip}: sin MAC (nmap/ARP/API)")
            continue

        hostname = None
        hostnames = host.find("hostnames")
        if hostnames is not None:
            hn = hostnames.find("hostname")
            if hn is not None:
                hostname = hn.get("name")

        os_guess = _extract_os_guess(host)
        host_services: list[dict[str, Any]] = []

        ports = host.find("ports")
        if ports is not None:
            for port in ports.findall("port"):
                state = port.find("state")
                if state is None or state.get("state") != "open":
                    continue
                portid = int(port.get("portid", "0"))
                protocol = port.get("protocol", "tcp")
                service = port.find("service")
                name = service.get("name") if service is not None else None
                product = service.get("product") if service is not None else None
                version = service.get("version") if service is not None else None
                extrainfo = service.get("extrainfo") if service is not None else None
                tunnel = service.get("tunnel") if service is not None else None
                version_parts = [x for x in [product, version, extrainfo] if x]
                if tunnel:
                    version_parts.append(f"tunnel={tunnel}")
                version_str = " ".join(version_parts) or None

                cve_ids: list[str] = []
                severity = "low"
                for script in port.findall("script"):
                    if script.get("id") == "vulners":
                        output = script.get("output") or ""
                        cve_ids.extend(re.findall(r"(CVE-\d{4}-\d+)", output))
                        if "CRITICAL" in output.upper():
                            severity = "critical"
                        elif "HIGH" in output.upper():
                            severity = "high"
                        elif "MEDIUM" in output.upper():
                            severity = "medium"

                host_services.append(
                    {
                        "deviceMac": addr_mac,
                        "port": portid,
                        "protocol": protocol,
                        "name": name,
                        "version": version_str,
                        "cveIds": sorted(set(cve_ids)),
                        "severity": severity,
                        "lastSeen": now,
                    }
                )

        if not os_guess:
            os_guess = _infer_os_from_services(host_services)

        devices.append(
            {
                "mac": addr_mac,
                "ip": addr_ip,
                "hostname": hostname,
                "vendor": vendor,
                "osGuess": os_guess,
                "authorized": False,
                "firstSeen": now,
                "lastSeen": now,
                "risk": "unknown",
            }
        )
        services.extend(host_services)

    return devices, services


def _extract_os_guess(host: ET.Element) -> str | None:
    os_el = host.find("os")
    if os_el is None:
        return None

    best_name: str | None = None
    best_acc = -1
    for match in os_el.findall("osmatch"):
        name = match.get("name")
        if not name:
            continue
        try:
            acc = int(match.get("accuracy") or "0")
        except ValueError:
            acc = 0
        if acc > best_acc:
            best_acc = acc
            best_name = f"{name} ({acc}%)" if acc else name

    if best_name:
        return best_name

    osclass = os_el.find("osclass")
    if osclass is not None:
        parts = [
            osclass.get("vendor"),
            osclass.get("osfamily"),
            osclass.get("osgen"),
            osclass.get("type"),
        ]
        joined = " ".join(p for p in parts if p)
        return joined or None

    return None


def _infer_os_from_services(services: list[dict[str, Any]]) -> str | None:
    """Soft OS hint from banners when nmap -O is unavailable."""
    blob = " ".join(
        f"{s.get('name') or ''} {s.get('version') or ''}".lower() for s in services
    )
    rules: list[tuple[str, str]] = [
        ("windows", "Windows (inferido)"),
        ("microsoft", "Windows (inferido)"),
        ("openssh", "Unix/Linux (inferido)"),
        ("linux", "Linux (inferido)"),
        ("android", "Android (inferido)"),
        ("apple", "Apple/iOS/macOS (inferido)"),
        ("iphone", "Apple/iOS (inferido)"),
        ("chromecast", "Google Cast / Chromecast (inferido)"),
        ("castv2", "Google Cast (inferido)"),
        ("dropbear", "Linux/embedded (inferido)"),
        ("busybox", "Linux/embedded (inferido)"),
        ("router", "Router/firmware (inferido)"),
    ]
    for needle, label in rules:
        if needle in blob:
            return label
    return None
