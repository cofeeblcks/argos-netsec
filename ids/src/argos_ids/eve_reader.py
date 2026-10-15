from __future__ import annotations

import json
import time
from collections.abc import Iterator
from pathlib import Path
from typing import Any


def follow_eve(path: Path, poll_seconds: float = 0.5) -> Iterator[dict[str, Any]]:
    """Tail eve.json (JSON lines). Waits if file does not exist yet."""
    while not path.exists():
        print(f"[argos-ids] waiting for {path}")
        time.sleep(2)

    with path.open("r", encoding="utf-8", errors="replace") as fh:
        fh.seek(0, 2)
        while True:
            line = fh.readline()
            if not line:
                time.sleep(poll_seconds)
                continue
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError:
                continue
