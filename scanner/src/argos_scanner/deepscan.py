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


def run_deep_scan(targets: list[str], timing: str = "-T3") -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Return (device updates, services) from nmap -sV XML.

    OS fingerprint (-O) only when running as root; otherwise nmap aborts entirely.
    """
    if not targets or not shutil.which("nmap"):
        return [], []

    cmd = [
        "nmap",
        "-sV",
        "--top-ports",
        "100",
        timing,
        "-oX",
        "-",
        *targets,
    ]
    if _is_root():
        cmd[2:2] = ["-O", "--osscan-guess"]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=900, check=False)
    except (OSError, subprocess.TimeoutExpired):
        return [], []

    if not result.stdout.strip():
        err = (result.stderr or "").strip()
        if err:
            print(f"[argos-scanner] nmap stderr: {err[:400]}")
        return [], []

    return parse_nmap_xml(result.stdout)


def parse_nmap_xml(xml_text: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    root = ET.fromstring(xml_text)
    now = _now()
    devices: list[dict[str, Any]] = []
    services: list[dict[str, Any]] = []

    for host in root.findall("host"):
        status = host.find("status")
        if status is not None and status.get("state") != "up":
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
            addr_mac = _mac_from_arp(addr_ip)
        if not addr_mac:
            continue

        hostname = None
        hostnames = host.find("hostnames")
        if hostnames is not None:
            hn = hostnames.find("hostname")
            if hn is not None:
                hostname = hn.get("name")

        os_guess = None
        os_el = host.find("os")
        if os_el is not None:
            match = os_el.find("osmatch")
            if match is not None:
                os_guess = match.get("name")

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

        ports = host.find("ports")
        if ports is None:
            continue
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
            version_str = " ".join(x for x in [product, version] if x) or None

            cve_ids: list[str] = []
            severity = "low"
            # Nmap vulners script output often in script elements
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

            services.append(
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

    return devices, services
