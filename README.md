# Argos NetSec

Sistema de seguridad en redes para lab / red doméstica en Linux.

Sensores Python → API Laravel → MariaDB / Reverb → dashboard React + alertas Telegram.

Plan de implementación: [docs/Argos NetSec Plan de implementación.md](docs/Argos%20NetSec%20Plan%20de%20implementaci%C3%B3n.md)

| Manual | Para qué |
| --- | --- |
| [Instalación y ejecución](docs/manual-instalacion-y-ejecucion.md) | Requisitos, Docker, nativo, systemd y comprobaciones |
| [Uso](docs/manual-de-uso.md) | Login, pantallas, alertas, autorización y Telegram |
| [Funcionamiento](docs/manual-de-funcionamiento.md) | Arquitectura, sensores, API, tiempo real y límites actuales |

Variables de entorno: [deploy/env.md](deploy/env.md) · Docker Compose: [.env.docker.example](.env.docker.example)

## Deploy con Docker

Núcleo (`db`, `api`, `reverb`, `queue`, `dashboard`) siempre; sensores (`scanner`, `suricata`, `ids`) con profile `sensors`.

```bash
cp -n .env.docker.example .env   # ajusta ARGOS_IFACE / secretos
make docker-up                   # o: docker compose up -d --build
# UI http://127.0.0.1:5173 · API :8000 · Reverb :8080
# Login seed: admin@argos.local / password

make docker-up-sensors           # o: docker compose --profile sensors up -d
make docker-scan                 # deep scan nmap -sV (llena Exposición / puertos)
make docker-down                 # para el stack; no borra volúmenes
```

El contenedor `scanner` solo hace **discovery** periódico. Los puertos/servicios de Exposición requieren un **deep scan** (`make docker-scan` o `make scan` en nativo).

Ajusta `ARGOS_IFACE` en `.env` a tu NIC LAN. ARP spoof en contenedor queda en `ARGOS_ENABLE_ARP_SPOOF=false` por defecto.

No uses `docker compose down -v` salvo que quieras borrar MariaDB y logs de Suricata.

## Deploy (lab local nativo)

### 1. Dependencias e instalación

```bash
# Requisitos del host: PHP 8.3+, Composer, pnpm, MariaDB, Python 3.11+,
# nmap, arp-scan; Suricata si vas a usar IDS.
cd /srv/http/argos-netsec
make setup
```

### 2. Configurar `.env`

```bash
# Copiar si aún no existen (make setup ya lo hace)
cp -n api/.env.example api/.env
cp -n dashboard/.env.example dashboard/.env
cp -n scanner/.env.example scanner/.env
cp -n ids/.env.example ids/.env

# Completar según deploy/env.md — mínimo:
#   api/.env          → APP_KEY, DB_*, REVERB_*, TELEGRAM_* (opcional)
#   dashboard/.env    → VITE_API_URL, VITE_REVERB_* (= REVERB_APP_KEY), VITE_DEMO=false
#   scanner/.env      → ARGOS_API_URL, ARGOS_SENSOR_TOKEN, ARGOS_NETWORK_CIDR
#   ids/.env          → ARGOS_API_URL, ARGOS_SENSOR_TOKEN, ARGOS_IFACE
#
# Telegram (opcional): crear bot con @BotFather y obtener token + chat_id
# → pasos en deploy/env.md § Telegram
```

Asegura `APP_KEY` y claves Reverb alineadas:

```bash
cd api && php artisan key:generate   # solo si APP_KEY está vacío
# REVERB_APP_KEY debe ser idéntico a VITE_REVERB_APP_KEY
# Usa 127.0.0.1 en hosts (no mezclar con localhost)
```

### 3. Base de datos

```bash
# Crear DB MariaDB (ejemplo) y ajustar DB_* en api/.env
# mysql -e "CREATE DATABASE IF NOT EXISTS \`argos-netsec\`;"

make migrate
cd api && php artisan db:seed
```

Credenciales seed: login `admin@argos.local` / `password` · tokens `scanner-dev-token` / `ids-dev-token`.

### 4. Arrancar el núcleo (4 procesos)

```bash
# Terminal 1 — API
cd /srv/http/argos-netsec/api && php artisan serve --host=127.0.0.1 --port=8000

# Terminal 2 — WebSocket (Reverb)
cd /srv/http/argos-netsec/api && php artisan reverb:start --host=127.0.0.1 --port=8080

# Terminal 3 — Cola (Telegram / jobs)
cd /srv/http/argos-netsec/api && php artisan queue:work

# Terminal 4 — Dashboard
cd /srv/http/argos-netsec/dashboard && pnpm dev --host 127.0.0.1
```

UI: `http://127.0.0.1:5173` → login. `make dev` imprime estos mismos comandos.

### 5. Sensores

```bash
# Discovery continuo (cada ARGOS_DISCOVERY_MINUTES)
cd /srv/http/argos-netsec/scanner && .venv/bin/python -m argos_scanner.main

# Deep scan de puertos/servicios (llena el módulo Exposición)
make scan

# IDS — Suricata + lector (iface desde ids/.env)
make ids   # imprime los comandos con ruta absoluta
sudo suricata -c /srv/http/argos-netsec/ids/suricata/suricata.yaml -i enp4s0
cd /srv/http/argos-netsec/ids && .venv/bin/python -m argos_ids.main
```

### 6. Persistente con systemd (opcional)

```bash
sudo cp /srv/http/argos-netsec/deploy/argos-api.service /etc/systemd/system/
sudo cp /srv/http/argos-netsec/deploy/argos-reverb.service /etc/systemd/system/
sudo cp /srv/http/argos-netsec/deploy/argos-queue.service /etc/systemd/system/
# Ajusta User=/WorkingDirectory= en las unidades si tu path o usuario difieren
sudo systemctl daemon-reload
sudo systemctl enable --now argos-api argos-reverb argos-queue
sudo systemctl status argos-api argos-reverb argos-queue
```

Dashboard en producción estática (sin `pnpm dev`):

```bash
cd /srv/http/argos-netsec/dashboard
# VITE_* deben apuntar a la API/Reverb definitivos antes del build
pnpm build
# Sirve dashboard/dist con nginx/caddy o `pnpm preview`
```

### Checklist rápido

| Paso | Comando / nota |
| --- | --- |
| Setup | `make setup` |
| Env | [deploy/env.md](deploy/env.md) · `VITE_DEMO=false` para API real |
| DB | `make migrate` · `cd api && php artisan db:seed` |
| Núcleo | API `:8000` · Reverb `:8080` · `queue:work` · dashboard |
| Hosts | scanner `argos_scanner.main` |
| Puertos | `make scan` |
| IDS | Suricata + `argos_ids.main` |

## Estructura

| Carpeta | Rol |
| --- | --- |
| `contracts/` | JSON Schema + OpenAPI |
| `api/` | Laravel 13 (+ `Dockerfile`) |
| `dashboard/` | Vite + React (+ `Dockerfile`) |
| `scanner/` | Descubrimiento / escaneo (+ `Dockerfile`) |
| `ids/` | Suricata + lector (+ `Dockerfile`) |
| `compose.yaml` | Stack Docker (núcleo + profile `sensors`) |
| `deploy/` | systemd + env |
