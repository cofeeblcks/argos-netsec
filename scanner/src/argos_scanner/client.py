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

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

    def post(self, path: str, payload: dict[str, Any], retries: int = 3) -> bool:
        url = f"{self.api_url}{path}"
        delay = 1.0
        last_error: Exception | None = None

        for _ in range(retries):
            try:
                with httpx.Client(timeout=self.timeout) as client:
                    response = client.post(url, headers=self._headers(), json=payload)
                if response.status_code < 300:
                    return True
                # 4xx (except 429): permanent — do not offline-queue
                if 400 <= response.status_code < 500 and response.status_code != 429:
                    print(f"[argos-scanner] reject {path}: HTTP {response.status_code}: {response.text}")
                    return False
                last_error = RuntimeError(f"HTTP {response.status_code}: {response.text}")
            except Exception as exc:  # noqa: BLE001
                last_error = exc
            time.sleep(delay)
            delay *= 2

        self._enqueue(path, payload)
        if last_error:
            print(f"[argos-scanner] enqueue after failure: {last_error}")
        return False

    def _enqueue(self, path: str, payload: dict[str, Any]) -> None:
        item = {"path": path, "payload": payload, "id": str(uuid.uuid4())}
        target = self.queue_dir / f"{item['id']}.json"
        target.write_text(json.dumps(item), encoding="utf-8")

    def flush_queue(self) -> int:
        sent = 0
        for file in sorted(self.queue_dir.glob("*.json")):
            try:
                item = json.loads(file.read_text(encoding="utf-8"))
                ok = self.post(item["path"], item["payload"], retries=1)
                if ok:
                    file.unlink(missing_ok=True)
                    sent += 1
            except Exception as exc:  # noqa: BLE001
                print(f"[argos-scanner] queue flush error {file.name}: {exc}")
        return sent

    def get_devices(self) -> list[dict[str, Any]]:
        url = f"{self.api_url}/api/v1/ingest/devices"
        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.get(url, headers=self._headers())
            if response.status_code >= 300:
                return []
            body = response.json()
            data = body.get("data", [])
            return data if isinstance(data, list) else []
        except Exception:  # noqa: BLE001
            return []

