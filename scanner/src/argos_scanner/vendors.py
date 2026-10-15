from __future__ import annotations

# Minimal OUI map for demo/lab; extend as needed.
OUI_MAP: dict[str, str] = {
    "AA:BB:CC": "Demo Vendor",
    "00:0C:29": "VMware",
    "00:50:56": "VMware",
    "B8:27:EB": "Raspberry Pi",
    "DC:A6:32": "Raspberry Pi",
    "00:1A:2B": "Unknown Lab",
}


def lookup_vendor(mac: str) -> str | None:
    parts = mac.upper().replace("-", ":").split(":")
    if len(parts) < 3:
        return None
    prefix = ":".join(parts[:3])
    return OUI_MAP.get(prefix)
