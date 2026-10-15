from __future__ import annotations

import argparse
import sys
import threading
import time
from typing import Any

from argos_ids.client import ApiClient
from argos_ids.config import load_config
from argos_ids.detectors.arp_spoof import ArpSpoofDetector
from argos_ids.eve_reader import follow_eve
from argos_ids.normalize import eve_alert_to_contract

HEARTBEAT_SECONDS = 60


def _heartbeat_loop(client: ApiClient, interval: int = HEARTBEAT_SECONDS) -> None:
    while True:
        time.sleep(interval)
        client.heartbeat()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="argos-ids")
    parser.add_argument("--env", default=None)
    parser.add_argument("--once-file", default=None, help="Parse a static eve/jsonl file once (tests)")
    args = parser.parse_args(argv)

    try:
        cfg = load_config(args.env)
    except Exception as exc:  # noqa: BLE001
        print(f"[argos-ids] config error: {exc}", file=sys.stderr)
        return 1

    if not cfg.sensor_token:
        print("[argos-ids] ARGOS_SENSOR_TOKEN required", file=sys.stderr)
        return 1

    client = ApiClient(cfg.api_url, cfg.sensor_token, cfg.queue_dir)

    def emit(alerts: list[dict[str, Any]]) -> None:
        if alerts:
            client.post_alerts(alerts)

    if args.once_file:
        from pathlib import Path
        import json

        alerts = []
        for line in Path(args.once_file).read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            eve = json.loads(line)
            normalized = eve_alert_to_contract(eve)
            if normalized:
                alerts.append(normalized)
        emit(alerts)
        client.heartbeat()
        print(f"[argos-ids] sent {len(alerts)} alerts from file")
        return 0

    if not client.heartbeat():
        print("[argos-ids] warning: initial heartbeat failed (API down or bad token?)", file=sys.stderr)
    else:
        print("[argos-ids] heartbeat ok")

    threading.Thread(target=_heartbeat_loop, args=(client,), daemon=True).start()

    if cfg.enable_arp_spoof:
        detector = ArpSpoofDetector(on_alert=lambda a: emit([a]))

        def arp_thread() -> None:
            try:
                detector.run_scapy(cfg.iface)
            except Exception as exc:  # noqa: BLE001
                print(f"[argos-ids] arp_spoof disabled: {exc}")

        threading.Thread(target=arp_thread, daemon=True).start()

    print(f"[argos-ids] following {cfg.eve_path}")
    for eve in follow_eve(cfg.eve_path):
        normalized = eve_alert_to_contract(eve)
        if normalized:
            emit([normalized])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
