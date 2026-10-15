from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Callable


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


class ArpSpoofDetector:
    """Detect same IP claimed by multiple MACs (requires scapy optional extra)."""

    def __init__(self, on_alert: Callable[[dict[str, Any]], None]) -> None:
        self.on_alert = on_alert
        self.ip_to_macs: dict[str, set[str]] = defaultdict(set)

    def observe(self, ip: str, mac: str) -> None:
        mac = mac.upper()
        seen = self.ip_to_macs[ip]
        if mac in seen:
            return
        seen.add(mac)
        if len(seen) < 2:
            return
        self.on_alert(
            {
                "occurredAt": _now(),
                "rule": "argos.arp_spoof",
                "severity": "high",
                "srcIp": ip,
                "dstIp": None,
                "raw": {"macs": sorted(seen)},
                "status": "open",
            }
        )

    def run_scapy(self, iface: str) -> None:
        try:
            from scapy.all import ARP, sniff  # type: ignore
        except ImportError as exc:
            raise RuntimeError("Falta scapy en el venv: pip install -e '.[dev]'") from exc

        def handle(pkt: Any) -> None:
            if pkt.haslayer(ARP) and pkt[ARP].op in (1, 2):
                self.observe(pkt[ARP].psrc, pkt[ARP].hwsrc)

        print(f"[argos-ids] arp_spoof sniffing on {iface}")
        try:
            sniff(filter="arp", iface=iface, prn=handle, store=False)
        except PermissionError as exc:
            raise RuntimeError(
                f"Sniff ARP en {iface} necesita privilegios: "
                "sudo .venv/bin/python -m argos_ids.main"
            ) from exc
