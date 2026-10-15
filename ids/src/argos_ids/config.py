from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


@dataclass(frozen=True)
class Config:
    api_url: str
    sensor_token: str
    eve_path: Path
    iface: str
    queue_dir: Path
    enable_arp_spoof: bool


def load_config(env_file: str | None = None) -> Config:
    load_dotenv(env_file)
    queue = Path(os.getenv("ARGOS_QUEUE_DIR", ".queue"))
    queue.mkdir(parents=True, exist_ok=True)
    return Config(
        api_url=os.getenv("ARGOS_API_URL", "http://127.0.0.1:8000").rstrip("/"),
        sensor_token=os.getenv("ARGOS_SENSOR_TOKEN", ""),
        eve_path=Path(os.getenv("ARGOS_EVE_PATH", "/var/log/suricata/eve.json")),
        iface=os.getenv("ARGOS_IFACE", "wlan0"),
        queue_dir=queue,
        enable_arp_spoof=os.getenv("ARGOS_ENABLE_ARP_SPOOF", "true").lower() in {"1", "true", "yes"},
    )
