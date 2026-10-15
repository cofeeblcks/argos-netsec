from __future__ import annotations

import ipaddress
import os
import socket
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


@dataclass(frozen=True)
class Config:
    api_url: str
    sensor_token: str
    network_cidr: str
    discovery_minutes: int
    nmap_timing: str
    queue_dir: Path
    authorized_refresh: bool


def _local_cidrs() -> list[str]:
    cidrs: list[str] = []
    hostname = socket.gethostname()
    try:
        for info in socket.getaddrinfo(hostname, None, socket.AF_INET):
            ip = info[4][0]
            if ip.startswith("127."):
                continue
            cidrs.append(str(ipaddress.ip_network(f"{ip}/24", strict=False)))
    except OSError:
        pass
    return cidrs


def validate_cidr(cidr: str) -> str:
    network = ipaddress.ip_network(cidr, strict=False)
    if network.is_loopback:
        raise ValueError("CIDR de loopback no permitido")

    local_addrs: list[ipaddress.IPv4Address | ipaddress.IPv6Address] = []
    hostname = socket.gethostname()
    try:
        for info in socket.getaddrinfo(hostname, None):
            local_addrs.append(ipaddress.ip_address(info[4][0]))
    except OSError:
        pass

    # Also include common interface addrs via UDP trick
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_addrs.append(ipaddress.ip_address(s.getsockname()[0]))
        s.close()
    except OSError:
        pass

    for addr in local_addrs:
        if addr in network:
            return str(network)

    raise ValueError(f"CIDR {cidr} no pertenece a una interfaz local")


def load_config(env_file: str | None = None) -> Config:
    load_dotenv(env_file)

    cidr = os.getenv("ARGOS_NETWORK_CIDR", "").strip()
    if not cidr:
        found = _local_cidrs()
        if not found:
            # UDP trick fallback
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                s.connect(("8.8.8.8", 80))
                ip = s.getsockname()[0]
                s.close()
                cidr = str(ipaddress.ip_network(f"{ip}/24", strict=False))
            except OSError as exc:
                raise RuntimeError("No se pudo detectar la red local; define ARGOS_NETWORK_CIDR") from exc
        else:
            cidr = found[0]

    cidr = validate_cidr(cidr)

    queue = Path(os.getenv("ARGOS_QUEUE_DIR", ".queue"))
    queue.mkdir(parents=True, exist_ok=True)

    return Config(
        api_url=os.getenv("ARGOS_API_URL", "http://127.0.0.1:8000").rstrip("/"),
        sensor_token=os.getenv("ARGOS_SENSOR_TOKEN", ""),
        network_cidr=cidr,
        discovery_minutes=int(os.getenv("ARGOS_DISCOVERY_MINUTES", "5")),
        nmap_timing=os.getenv("ARGOS_NMAP_TIMING", "-T3"),
        queue_dir=queue,
        authorized_refresh=os.getenv("ARGOS_AUTHORIZED_REFRESH", "true").lower() in {"1", "true", "yes"},
    )
