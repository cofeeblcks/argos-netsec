from __future__ import annotations

import argparse
import sys

from apscheduler.schedulers.blocking import BlockingScheduler

from argos_scanner.baseline import build_events, new_port_events
from argos_scanner.client import ApiClient
from argos_scanner.config import load_config
from argos_scanner.deepscan import run_deep_scan
from argos_scanner.discovery import discover, hosts_to_devices


def run_discovery(client: ApiClient, cidr: str, timing: str) -> None:
    print(f"[argos-scanner] discovery on {cidr}")
    client.flush_queue()
    known = client.get_devices()
    authorized = {str(d["mac"]).upper() for d in known if d.get("authorized")}
    hosts = discover(cidr, timing)
    if not hosts:
        print("[argos-scanner] no hosts found (need nmap/arp-scan + privileges?)")
        return

    devices = hosts_to_devices(hosts, authorized)
    client.post("/api/v1/ingest/scan", {"devices": devices, "services": []})
    events = build_events(hosts, known)
    if events:
        client.post("/api/v1/ingest/events", {"events": events})
    print(f"[argos-scanner] discovery done: {len(hosts)} hosts, {len(events)} events")


def run_deep(client: ApiClient, cidr: str, timing: str, targets: list[str] | None = None) -> None:
    print("[argos-scanner] deep scan starting")
    client.flush_queue()
    known = client.get_devices()
    mac_by_ip: dict[str, str] = {
        str(d["ip"]): str(d["mac"]).upper() for d in known if d.get("ip") and d.get("mac")
    }

    if not targets:
        # Prefer known inventory + live discovery (phones appear/disappear often)
        hosts = discover(cidr, timing)
        for host in hosts:
            mac_by_ip[host.ip] = host.mac.upper()
        targets = sorted({*(d.get("ip") for d in known if d.get("ip")), *(h.ip for h in hosts)})
    if not targets:
        print("[argos-scanner] no targets for deep scan")
        return

    devices, services = run_deep_scan(targets, timing, mac_by_ip=mac_by_ip)
    # Preserve authorization from baseline when possible
    auth_map = {str(d["mac"]).upper(): bool(d.get("authorized")) for d in known}
    for device in devices:
        mac = device["mac"].upper()
        device["authorized"] = auth_map.get(mac, False)
        device["risk"] = "low" if device["authorized"] else device.get("risk", "unknown")

    if devices or services:
        client.post("/api/v1/ingest/scan", {"devices": devices, "services": services})

    known_ports: set[tuple[str, int, str]] = set()
    # We don't have prior services list on sensor yet; emit port_new for all open ports first deep scan.
    events = new_port_events(services, known_ports)
    if events:
        client.post("/api/v1/ingest/events", {"events": events})

    with_ports = {s["deviceMac"].upper() for s in services}
    without = [d["ip"] for d in devices if d["mac"].upper() not in with_ports]
    print(
        f"[argos-scanner] deep scan done: {len(targets)} targets → "
        f"{len(devices)} hosts, {len(services)} open ports"
        + (f"; sin puertos top-100: {', '.join(without)}" if without else "")
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="argos-scanner")
    parser.add_argument("--deep", action="store_true", help="Run a deep scan once and exit")
    parser.add_argument("--once", action="store_true", help="Run discovery once and exit")
    parser.add_argument("--env", default=None, help="Path to .env")
    args = parser.parse_args(argv)

    try:
        cfg = load_config(args.env)
    except Exception as exc:  # noqa: BLE001
        print(f"[argos-scanner] config error: {exc}", file=sys.stderr)
        return 1

    if not cfg.sensor_token:
        print("[argos-scanner] ARGOS_SENSOR_TOKEN is required", file=sys.stderr)
        return 1

    client = ApiClient(cfg.api_url, cfg.sensor_token, cfg.queue_dir)

    if args.deep:
        run_deep(client, cfg.network_cidr, cfg.nmap_timing)
        return 0
    if args.once:
        run_discovery(client, cfg.network_cidr, cfg.nmap_timing)
        return 0

    scheduler = BlockingScheduler()
    scheduler.add_job(
        run_discovery,
        "interval",
        minutes=cfg.discovery_minutes,
        args=[client, cfg.network_cidr, cfg.nmap_timing],
        id="discovery",
    )
    # Weekly deep scan: Monday 03:00
    scheduler.add_job(
        run_deep,
        "cron",
        day_of_week="mon",
        hour=3,
        minute=0,
        args=[client, cfg.network_cidr, cfg.nmap_timing],
        id="deepscan",
    )
    print(f"[argos-scanner] scheduler started (discovery every {cfg.discovery_minutes}m)")
    run_discovery(client, cfg.network_cidr, cfg.nmap_timing)
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        print("[argos-scanner] stopped")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
