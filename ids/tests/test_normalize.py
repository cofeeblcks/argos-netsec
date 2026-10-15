from argos_ids.normalize import eve_alert_to_contract, severity_from_suricata


def test_severity_mapping():
    assert severity_from_suricata({"alert": {"severity": 1}}) == "critical"
    assert severity_from_suricata({"alert": {"severity": 2}}) == "high"


def test_eve_to_contract():
    eve = {
        "event_type": "alert",
        "timestamp": "2026-10-15T18:00:00.000000+0000",
        "src_ip": "203.0.113.10",
        "dest_ip": "192.168.1.10",
        "alert": {"severity": 2, "signature": "ET SSH Brute Force", "signature_id": 2001219},
    }
    alert = eve_alert_to_contract(eve)
    assert alert is not None
    assert alert["severity"] == "high"
    assert alert["rule"] == "ET SSH Brute Force"
    assert alert["srcIp"] == "203.0.113.10"
