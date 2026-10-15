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
    assert len(services) == 1
    assert services[0]["port"] == 22
    assert services[0]["name"] == "ssh"
