from __future__ import annotations

import re
import shutil
import subprocess
from dataclasses import dataclass
from datetime import datetime, timezone

from argos_scanner.vendors import lookup_vendor


@dataclass
class Host:
    mac: str
    ip: str
    hostname: str | None = None
    vendor: str | None = None


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _normalize_mac(mac: str) -> str:
    mac = mac.strip().upper().replace("-", ":")
    parts = mac.split(":")
    return ":".join(p.zfill(2) for p in parts)


def discover_with_arp_scan(cidr: str) -> list[Host]:
    if not shutil.which("arp-scan"):
        return []

    try:
        result = subprocess.run(
            ["arp-scan", "-l", "--retry=2"],
            capture_output=True,
            text=True,
            timeout=60,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return []

    hosts: list[Host] = []
    for line in result.stdout.splitlines():
        # ip\tmac\tvendor
        m = re.match(r"^(\d+\.\d+\.\d+\.\d+)\s+([0-9a-fA-F:]{11,17})\s*(.*)$", line.strip())
        if not m:
            continue
        ip, mac, vendor = m.group(1), _normalize_mac(m.group(2)), m.group(3).strip() or None
        hosts.append(Host(mac=mac, ip=ip, vendor=vendor or lookup_vendor(mac)))
    return hosts


def discover_with_nmap(cidr: str, timing: str = "-T3") -> list[Host]:
    if not shutil.which("nmap"):
        return []

    try:
        result = subprocess.run(
            ["nmap", "-sn", timing, cidr, "-oG", "-"],
            capture_output=True,
            text=True,
            timeout=180,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return []

    hosts: list[Host] = []
    for line in result.stdout.splitlines():
        if not line.startswith("Host:"):
            continue
        # Host: 192.168.1.1 (gateway) Status: Up
        m = re.match(r"Host:\s+(\S+)\s+\(([^)]*)\)", line)
        if not m:
            m = re.match(r"Host:\s+(\S+)", line)
            if not m:
                continue
            ip, hostname = m.group(1), None
        else:
            ip, hostname = m.group(1), m.group(2) or None
            if hostname == "":
                hostname = None

        # MAC often appears in separate nmap -sn with privileges
        mac_match = re.search(r"MAC Address:\s+([0-9A-Fa-f:]{11,17})", line)
        mac = _normalize_mac(mac_match.group(1)) if mac_match else None
        if not mac:
            # Try ARP table
            mac = _mac_from_arp(ip)
        if not mac:
            continue
        hosts.append(Host(mac=mac, ip=ip, hostname=hostname, vendor=lookup_vendor(mac)))
    return hosts


def _mac_from_arp(ip: str) -> str | None:
    try:
        result = subprocess.run(["ip", "neigh", "show", ip], capture_output=True, text=True, check=False)
        m = re.search(r"lladdr\s+([0-9a-fA-F:]{11,17})", result.stdout)
        if m:
            return _normalize_mac(m.group(1))
    except OSError:
        pass
    return None


def discover(cidr: str, timing: str = "-T3") -> list[Host]:
    hosts = discover_with_arp_scan(cidr)
    if hosts:
        return _dedupe(hosts)
    return _dedupe(discover_with_nmap(cidr, timing))


def _dedupe(hosts: list[Host]) -> list[Host]:
    by_mac: dict[str, Host] = {}
    for host in hosts:
        by_mac[host.mac] = host
    return list(by_mac.values())


def hosts_to_devices(hosts: list[Host], authorized_macs: set[str] | None = None) -> list[dict]:
    authorized_macs = authorized_macs or set()
    now = _now()
    devices = []
    for host in hosts:
        auth = host.mac in authorized_macs
        devices.append(
            {
                "mac": host.mac,
                "ip": host.ip,
                "hostname": host.hostname,
                "vendor": host.vendor,
                "osGuess": None,
                "authorized": auth,
                "firstSeen": now,
                "lastSeen": now,
                "risk": "low" if auth else "high",
            }
        )
    return devices
