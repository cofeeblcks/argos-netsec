from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from argos_scanner.discovery import Host


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def build_events(
    discovered: list[Host],
    known: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Compare discovery against API baseline and emit change events."""
    known_by_mac = {str(d["mac"]).upper(): d for d in known}
    seen_macs = {h.mac.upper() for h in discovered}
    events: list[dict[str, Any]] = []
    now = _now()

    # IP duplicates among discovered
    ip_map: dict[str, list[str]] = {}
    for host in discovered:
        ip_map.setdefault(host.ip, []).append(host.mac)
    for ip, macs in ip_map.items():
        if len(macs) > 1:
            events.append(
                {
                    "occurredAt": now,
                    "type": "ip_duplicate",
                    "deviceMac": macs[0],
                    "detail": {"ip": ip, "macs": macs},
                }
            )

    for host in discovered:
        prev = known_by_mac.get(host.mac.upper())
        if prev is None:
            events.append(
                {
                    "occurredAt": now,
                    "type": "device_new",
                    "deviceMac": host.mac,
                    "detail": {"ip": host.ip, "hostname": host.hostname},
                }
            )
            events.append(
                {
                    "occurredAt": now,
                    "type": "device_unauthorized",
                    "deviceMac": host.mac,
                    "detail": {"ip": host.ip, "reason": "new_mac"},
                }
            )
            continue

        if not prev.get("authorized", False):
            events.append(
                {
                    "occurredAt": now,
                    "type": "device_unauthorized",
                    "deviceMac": host.mac,
                    "detail": {"ip": host.ip, "reason": "not_authorized"},
                }
            )

        if prev.get("ip") and prev["ip"] != host.ip:
            events.append(
                {
                    "occurredAt": now,
                    "type": "other",
                    "deviceMac": host.mac,
                    "detail": {"message": "ip_changed", "from": prev["ip"], "to": host.ip},
                }
            )

    for mac, prev in known_by_mac.items():
        if mac not in seen_macs and prev.get("authorized"):
            events.append(
                {
                    "occurredAt": now,
                    "type": "device_gone",
                    "deviceMac": mac,
                    "detail": {"ip": prev.get("ip"), "hostname": prev.get("hostname")},
                }
            )

    return events


def new_port_events(
    services: list[dict[str, Any]],
    known_ports: set[tuple[str, int, str]],
) -> list[dict[str, Any]]:
    now = _now()
    events: list[dict[str, Any]] = []
    for svc in services:
        key = (str(svc["deviceMac"]).upper(), int(svc["port"]), str(svc["protocol"]))
        if key not in known_ports:
            events.append(
                {
                    "occurredAt": now,
                    "type": "port_new",
                    "deviceMac": svc["deviceMac"],
                    "detail": {"port": svc["port"], "protocol": svc["protocol"], "name": svc.get("name")},
                }
            )
    return events
