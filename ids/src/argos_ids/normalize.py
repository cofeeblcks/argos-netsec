from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def severity_from_suricata(eve: dict[str, Any]) -> str:
    alert = eve.get("alert") or {}
    sev = alert.get("severity")
    # Suricata: 1 critical … 3+ informational (inverted vs our scale)
    if sev == 1:
        return "critical"
    if sev == 2:
        return "high"
    if sev == 3:
        return "medium"
    return "low"


def eve_alert_to_contract(eve: dict[str, Any]) -> dict[str, Any] | None:
    if eve.get("event_type") != "alert":
        return None
    alert = eve.get("alert") or {}
    return {
        "occurredAt": eve.get("timestamp") or _now(),
        "rule": alert.get("signature") or f"suricata.{alert.get('signature_id', 'unknown')}",
        "severity": severity_from_suricata(eve),
        "srcIp": eve.get("src_ip"),
        "dstIp": eve.get("dest_ip"),
        "raw": eve,
        "status": "open",
    }
