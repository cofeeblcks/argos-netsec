# Manual de instalación y ejecución

Argos NetSec vigila una red propia de laboratorio o doméstica. Hay dos formas de ejecutarlo: **Docker Compose** (núcleo y sensores en contenedores) y **nativo en Linux** (procesos en el host). Las dos publican la misma interfaz.

| Servicio | URL local |
| --- | --- |
| Dashboard | http://127.0.0.1:5173 |
| API | http://127.0.0.1:8000 |
| Reverb (WebSocket) | http://127.0.0.1:8080 |
| MariaDB de Compose | `127.0.0.1:3307` (el 3306 del host queda libre) |

Usa `127.0.0.1` en todos los `.env`. Mezclarlo con `localhost` rompe CORS y la autenticación del WebSocket.

El escáner solo acepta un CIDR que pertenezca a una interfaz de esta máquina. No está pensado para redes ajenas.

## Requisitos

### Docker

- Docker Engine y Compose v2 (`docker compose`, no el binario viejo `docker-compose`).
- Para el profile `sensors`: la interfaz LAN del host (`ARGOS_IFACE`) y permiso para `NET_RAW` / `NET_ADMIN`. El escáner y Suricata usan `network_mode: host`.

### Nativo

| Pieza | Versión | Para qué |
| --- | --- | --- |
| PHP + Composer | PHP 8.3+ (`.mise.toml` fija 8.3) | API Laravel 13 |
| pnpm + Node | Node 22 | Dashboard Vite |
| Python | 3.11+ (`.mise.toml` fija 3.12) | Scanner e IDS |
| MariaDB | 10.11+ o 11.x | Datos en local. Los tests de la API usan SQLite y no necesitan este servicio |
| nmap y arp-scan | los del sistema | Descubrimiento y deep scan |
| Suricata | 7.x, opcional | IDS. Sin él el resto del sistema arranca igual |

Extensiones PHP que Laravel necesita en este proyecto: `pdo_mysql` (o `pdo_sqlite` solo para tests), `mbstring`, `openssl`, `tokenizer`, `xml`, `ctype`, `json`, `bcmath`.

## Opción A — Docker Compose

Esta vía levanta MariaDB, API, Reverb, cola y dashboard. El seed corre solo la primera vez que el contenedor `api` arranca (`RUN_SEED=1`).

```bash
cd /srv/http/argos-netsec
cp -n .env.docker.example .env
```

Edita `.env` antes de arrancar:

| Variable | Qué poner |
| --- | --- |
| `APP_KEY` | La de ejemplo vale solo para el lab. Para otro uso: `cd api && php artisan key:generate --show` y copia el valor |
| `MARIADB_PASSWORD` / `MARIADB_ROOT_PASSWORD` | Cámbialas si el host no es solo tuyo |
| `ARGOS_IFACE` | Interfaz LAN real (`ip -br link`). El ejemplo `enp4s0` falla si tu NIC tiene otro nombre |
| `TELEGRAM_*` | Opcional. Pasos en [deploy/env.md](../deploy/env.md) |
| `VITE_DEMO` | Déjalo en `false` para hablar con la API |

`REVERB_APP_KEY` del `.env` raíz es la misma clave que el dashboard usa como `VITE_REVERB_APP_KEY`. No hace falta duplicarla.

```bash
make docker-up
# equivalente: docker compose up -d --build
```

El primer arranque construye imágenes, espera a MariaDB, migra y siembra. Cuando `api` esté healthy:

- UI: http://127.0.0.1:5173
- Login de seed: `admin@argos.local` / `password`
- Tokens de sensor: `scanner-dev-token` y `ids-dev-token`

Sensores (descubrimiento + Suricata + lector de `eve.json`):

```bash
make docker-up-sensors
# equivalente: docker compose --profile sensors up -d --build
```

El contenedor `scanner` solo hace **discovery** (cada `ARGOS_DISCOVERY_MINUTES`, 5 por defecto) y un deep scan semanal los lunes a las 03:00 dentro del contenedor. Para llenar Exposición ahora:

```bash
make docker-scan
```

Ese comando lanza un contenedor de un solo uso con `python -m argos_scanner.main --deep`. Puede tardar varios minutos: nmap recorre los hosts conocidos y los que acaba de descubrir, en lotes de 20, con `--top-ports 100`.

Parar sin borrar datos:

```bash
make docker-down
```

`docker compose down -v` borra el volumen de MariaDB y los logs de Suricata. No lo uses si quieres conservar inventario y alertas.

`compose.override.yaml` se carga solo y monta el código de `api/` y `dashboard/src` para editar en caliente. Si cambias `composer.lock` o `pnpm-lock.yaml`, reconstruye la imagen.

## Opción B — nativo

### 1. Dependencias del proyecto

```bash
cd /srv/http/argos-netsec
make setup
```

`make setup` copia los `.env.example` que falten e instala Composer, pnpm y los venv de `scanner/` e `ids/` (`pip install -e ".[dev]"`).

### 2. Variables

Detalle de cada clave: [deploy/env.md](../deploy/env.md). Mínimo para un lab:

`api/.env` trae `DB_CONNECTION=sqlite`. Para MariaDB sustituye el bloque de base de datos:

```env
DB_CONNECTION=mariadb
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=argos_netsec
DB_USERNAME=argos
DB_PASSWORD=argos
```

Crea la base y el usuario en MariaDB, genera `APP_KEY` si está vacío y alinea Reverb:

```bash
cd api && php artisan key:generate
```

`REVERB_APP_KEY` en `api/.env` y `VITE_REVERB_APP_KEY` en `dashboard/.env` tienen que ser idénticos. `VITE_API_URL` debe ser `http://127.0.0.1:8000` y `VITE_DEMO=false`.

`scanner/.env`: `ARGOS_SENSOR_TOKEN=scanner-dev-token`. Deja `ARGOS_NETWORK_CIDR` vacío para que detecte la red local `/24`, o pon el CIDR de tu LAN.

`ids/.env`: `ARGOS_SENSOR_TOKEN=ids-dev-token` y `ARGOS_IFACE` con la interfaz que va a escuchar Suricata.

### 3. Base de datos

```bash
make migrate
cd api && php artisan db:seed
```

El seed crea el usuario del dashboard y los dos sensores. Es idempotente (`updateOrCreate`): volver a ejecutarlo no duplica filas.

### 4. Núcleo (cuatro procesos)

`make dev` solo imprime los comandos. Ábrelos en terminales distintas:

```bash
cd /srv/http/argos-netsec/api && php artisan serve --host=127.0.0.1 --port=8000
cd /srv/http/argos-netsec/api && php artisan reverb:start --host=127.0.0.1 --port=8080
cd /srv/http/argos-netsec/api && php artisan queue:work --sleep=1 --tries=3
cd /srv/http/argos-netsec/dashboard && pnpm dev --host 127.0.0.1
```

Sin `queue:work`, las alertas se guardan y el dashboard las ve, pero Telegram no sale. Sin Reverb, el canal WebSocket no tiene a quién hablar; Actividad igual se refresca por HTTP cada 15 segundos.

### 5. Sensores

Descubrimiento continuo (inmediato y luego cada 5 minutos, más deep scan semanal):

```bash
cd /srv/http/argos-netsec/scanner && .venv/bin/python -m argos_scanner.main
```

Una sola pasada, sin quedar residente:

```bash
cd scanner && .venv/bin/python -m argos_scanner.main --once
make scan    # deep scan y sale
```

`arp-scan` y nmap necesitan ver la LAN. Si el discovery imprime `no hosts found`, ejecuta el scanner con capacidades de red o como root del lab (`sudo .venv/bin/python -m argos_scanner.main`).

IDS, dos procesos. `make ids` solo imprime las líneas con la interfaz leída de `ids/.env`:

```bash
sudo suricata -c /srv/http/argos-netsec/ids/suricata/suricata.yaml -i enp4s0
cd /srv/http/argos-netsec/ids && .venv/bin/python -m argos_ids.main
```

Sustituye `enp4s0` por `ARGOS_IFACE`. El lector sigue `/var/log/suricata/eve.json` (o `ARGOS_EVE_PATH`). El detector ARP (`ARGOS_ENABLE_ARP_SPOOF`) escucha ARP con Scapy; en nativo el ejemplo lo deja en `true` y hace falta privilegio de captura. Si Scapy no puede abrir la interfaz, el lector de Suricata sigue. No activa un ataque: solo avisa si una IP aparece con más de una MAC.

### 6. systemd (opcional)

Las unidades viven en `deploy/`. Antes de instalarlas, edita `WorkingDirectory=` si el repo no está en `/srv/http/argos-netsec`.

`argos-api.service` trae `User=%i`. Eso solo tiene valor en una unidad plantilla (`argos-api@.service`). Si la copias como `argos-api.service`, sustituye esa línea por el usuario de la máquina, por ejemplo `User=argos`. `argos-reverb.service` y `argos-queue.service` no fijan usuario: añádelo para que no corran como root.

```bash
sudo cp deploy/argos-api.service deploy/argos-reverb.service deploy/argos-queue.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now argos-api argos-reverb argos-queue
sudo systemctl status argos-api argos-reverb argos-queue
```

El dashboard de producción no usa `pnpm dev`. Con los `VITE_*` ya apuntando a la API definitiva:

```bash
cd dashboard && pnpm build
# sirve dashboard/dist con nginx, Caddy o: pnpm preview --host 127.0.0.1
```

Los sensores no tienen unidad systemd. En nativo se arrancan a mano o con el profile Docker.

## Comprobar que quedó vivo

```bash
docker compose ps          # solo Docker: db, api, reverb, queue, dashboard healthy
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000
```

La API de `artisan serve` responde 200 en `/`. El login:

```bash
curl -s -X POST http://127.0.0.1:8000/api/v1/auth/login \
  -H "Content-Type: application/json" -H "Accept: application/json" \
  -d '{"email":"admin@argos.local","password":"password"}'
```

Una respuesta `status: success` con `data.token` confirma Sanctum y el seed. En el navegador, http://127.0.0.1:5173 debe mostrar el login y, tras entrar, el badge **Live** (no **Demo**).

Sensores: en Resumen, la tarjeta «Sensores online» cuenta un sensor como online si su último latido tiene menos de 15 minutos. El IDS late cada 60 s. El scanner no tiene un latido propio: actualiza `last_seen_at` cada vez que llama a la API (discovery, deep scan o lectura de la línea base).

## Tests

```bash
make test
```

Ejecuta Pest en `api/`, pytest en `scanner/` y pytest en `ids/`. La API de tests no usa MariaDB (`phpunit.xml` fuerza SQLite en memoria y `BROADCAST_CONNECTION=null`).

## Problemas frecuentes

| Síntoma | Causa habitual |
| --- | --- |
| Dashboard en blanco o login rechazado con la API arriba | `VITE_DEMO` no es `false`, o `VITE_API_URL` no es `http://127.0.0.1:8000`. Tras cambiar un `VITE_*`, reinicia `pnpm dev` o reconstruye la imagen del dashboard |
| `SQLSTATE` al migrar en nativo | `api/.env` sigue en `sqlite` o MariaDB no tiene la base `argos_netsec` |
| Puerto 8000/5173/8080 ocupado | Otro `artisan serve`, Vite o un Compose anterior. `make docker-down` o mata el proceso que escucha |
| Puerto 3306 ocupado y Compose no arranca | Compose publica la base en **3307**. Si igual choca, revisa que no haya otro mapeo |
| Discovery sin hosts | Falta `nmap`/`arp-scan`, o el proceso no puede enviar ARP. En Docker, el profile `sensors` y `network_mode: host` |
| Exposición sin puertos | Solo corriste discovery. Hace falta `make scan` o `make docker-scan` |
| Suricata no escribe `eve.json` | `ARGOS_IFACE` no existe o no está UP. `ip -br link` |
| Telegram mudo | Falta `queue:work` / contenedor `queue`, o `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID` vacíos. La alerta sí queda en Actividad |
| Sensores 401 | El token del `.env` no es el del seed (`scanner-dev-token` / `ids-dev-token`) o no se sembró la base |
