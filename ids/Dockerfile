# syntax=docker/dockerfile:1

FROM python:3.12-slim-bookworm

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
      libpcap0.8 \
      tcpdump \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --link pyproject.toml ./
COPY --link src ./src

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir .

ENV ARGOS_QUEUE_DIR=/app/.queue \
    ARGOS_EVE_PATH=/var/log/suricata/eve.json \
    ARGOS_ENABLE_ARP_SPOOF=false
RUN mkdir -p /app/.queue

CMD ["python", "-m", "argos_ids.main"]
