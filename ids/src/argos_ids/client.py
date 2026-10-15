from __future__ import annotations

import json
import time
import uuid
from pathlib import Path
from typing import Any

import httpx


class ApiClient:
    def __init__(self, api_url: str, token: str, queue_dir: Path, timeout: float = 15.0) -> None:
        self.api_url = api_url.rstrip("/")
        self.token = token
        self.queue_dir = queue_dir
        self.timeout = timeout
        self.queue_dir.mkdir(parents=True, exist_ok=True)

    def post_alerts(self, alerts: list[dict[str, Any]], retries: int = 3) -> bool:
        url = f"{self.api_url}/api/v1/ingest/alerts"
        payload = {"alerts": alerts}
        delay = 1.0
        last_error: Exception | None = None
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

        for _ in range(retries):
            try:
                with httpx.Client(timeout=self.timeout) as client:
                    response = client.post(url, headers=headers, json=payload)
                if response.status_code < 300:
                    return True
                last_error = RuntimeError(f"HTTP {response.status_code}")
            except Exception as exc:  # noqa: BLE001
                last_error = exc
            time.sleep(delay)
            delay *= 2

        item = {"path": "/api/v1/ingest/alerts", "payload": payload, "id": str(uuid.uuid4())}
        (self.queue_dir / f"{item['id']}.json").write_text(json.dumps(item), encoding="utf-8")
        if last_error:
            print(f"[argos-ids] enqueue after failure: {last_error}")
        return False
