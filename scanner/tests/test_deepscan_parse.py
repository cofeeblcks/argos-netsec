from argos_scanner.deepscan import parse_nmap_xml

SAMPLE = """<?xml version="1.0"?>
<nmaprun>
  <host>
    <status state="up"/>
    <address addr="192.168.1.10" addrtype="ipv4"/>
    <address addr="AA:BB:CC:DD:EE:01" addrtype="mac" vendor="Demo"/>
    <hostnames><hostname name="lab-pc"/></hostnames>
    <ports>
      <port protocol="tcp" portid="22">
        <state state="open"/>
        <service name="ssh" product="OpenSSH" version="9.0"/>
      </port>
    </ports>
  </host>
</nmaprun>
"""


def test_parse_nmap_xml_services():
    devices, services = parse_nmap_xml(SAMPLE)
    assert len(devices) == 1
    assert devices[0]["mac"] == "AA:BB:CC:DD:EE:01"
    assert devices[0]["hostname"] == "lab-pc"
    assert devices[0]["osGuess"] == "Unix/Linux (inferido)"
    assert len(services) == 1
    assert services[0]["port"] == 22
    assert services[0]["name"] == "ssh"


SAMPLE_OS = """<?xml version="1.0"?>
<nmaprun>
  <host>
    <status state="up"/>
    <address addr="192.168.1.20" addrtype="ipv4"/>
    <address addr="AA:BB:CC:DD:EE:02" addrtype="mac"/>
    <os>
      <osmatch name="Linux 5.4" accuracy="96"/>
      <osmatch name="Linux 4.15" accuracy="90"/>
    </os>
    <ports>
      <port protocol="tcp" portid="80">
        <state state="open"/>
        <service name="http" product="nginx" version="1.18"/>
      </port>
    </ports>
  </host>
</nmaprun>
"""


def test_parse_nmap_xml_os_fingerprint():
    devices, services = parse_nmap_xml(SAMPLE_OS)
    assert devices[0]["osGuess"] == "Linux 5.4 (96%)"
    assert services[0]["version"] == "nginx 1.18"


SAMPLE_NO_MAC = """<?xml version="1.0"?>
<nmaprun>
  <host>
    <status state="up"/>
    <address addr="192.168.1.50" addrtype="ipv4"/>
    <ports>
      <port protocol="tcp" portid="443">
        <state state="open"/>
        <service name="https"/>
      </port>
    </ports>
  </host>
</nmaprun>
"""


def test_parse_nmap_xml_mac_fallback_map():
    devices, services = parse_nmap_xml(
        SAMPLE_NO_MAC,
        mac_by_ip={"192.168.1.50": "aa:bb:cc:dd:ee:50"},
    )
    assert len(devices) == 1
    assert devices[0]["mac"] == "AA:BB:CC:DD:EE:50"
    assert services[0]["port"] == 443
