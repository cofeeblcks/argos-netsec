from argos_scanner.baseline import build_events
from argos_scanner.discovery import Host


def test_new_unauthorized_device_emits_events():
    discovered = [Host(mac="AA:BB:CC:DD:EE:99", ip="192.168.1.99", hostname="phone")]
    known = [
        {
            "mac": "AA:BB:CC:DD:EE:01",
            "ip": "192.168.1.10",
            "authorized": True,
            "hostname": "pc",
        }
    ]

    events = build_events(discovered, known)
    types = {e["type"] for e in events}
    assert "device_new" in types
    assert "device_unauthorized" in types
    assert "device_gone" in types


def test_ip_duplicate_event():
    discovered = [
        Host(mac="AA:BB:CC:DD:EE:01", ip="192.168.1.10"),
        Host(mac="AA:BB:CC:DD:EE:02", ip="192.168.1.10"),
    ]
    events = build_events(discovered, [])
    assert any(e["type"] == "ip_duplicate" for e in events)
