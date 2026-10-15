# Variables de entorno Argos NetSec

Claves compartidas entre subproyectos. Cada carpeta tiene su `.env.example`; copia a `.env` y rellena.

## API (`api/.env`)

| Variable | Ejemplo local | Notas |
| --- | --- | --- |
| `APP_URL` | `http://127.0.0.1:8000` | Debe coincidir con la URL que usa el dashboard |
| `DB_CONNECTION` | `mariadb` | Tests: SQLite en memoria vía `phpunit.xml` |
| `BROADCAST_CONNECTION` | `reverb` | En tests: `null` |
| `QUEUE_CONNECTION` | `database` | Worker: `php artisan queue:work` |
| `REVERB_APP_ID` / `KEY` / `SECRET` | `php artisan reverb:install` | Mismos valores en `VITE_REVERB_*` |
| `REVERB_HOST` | `127.0.0.1` | Host que ve el **cliente** |
| `REVERB_PORT` | `8080` | |
| `REVERB_SCHEME` | `http` | Lab local |
| `REVERB_SERVER_HOST` | `127.0.0.1` | Bind del proceso Reverb |
| `REVERB_SERVER_PORT` | `8080` | |
| `TELEGRAM_BOT_TOKEN` | | Bot API |
| `TELEGRAM_CHAT_ID` | | Chat destino |
| `TELEGRAM_MIN_SEVERITY` | `high` | Solo `high` y `critical` |

## Dashboard (`dashboard/.env`)

| Variable | Ejemplo | Notas |
| --- | --- | --- |
| `VITE_API_URL` | `http://127.0.0.1:8000` | Misma base que `APP_URL` |
| `VITE_REVERB_APP_KEY` | | = `REVERB_APP_KEY` |
| `VITE_REVERB_HOST` | `127.0.0.1` | No mezclar con `localhost` |
| `VITE_REVERB_PORT` | `8080` | |
| `VITE_REVERB_SCHEME` | `http` | |
| `VITE_DEMO` | `false` | `true` = fixtures + login demo; `false` = Sanctum real |
| Login dashboard | `admin@argos.local` / `password` | Tras `php artisan db:seed` |

## Scanner / IDS

| Variable | Ejemplo | Notas |
| --- | --- | --- |
| `ARGOS_API_URL` | `http://127.0.0.1:8000` | |
| `ARGOS_SENSOR_TOKEN` | | Token plano del sensor (hash en DB) |
| `ARGOS_NETWORK_CIDR` | auto / `192.168.1.0/24` | Debe ser interfaz local |
| `ARGOS_IFACE` | `enp4s0` | IDS / Suricata (iface UP local) |

## Credenciales seed local (`php artisan db:seed`)

| Uso | Valor |
| --- | --- |
| Dashboard login | `admin@argos.local` / `password` |
| Token scanner | `scanner-dev-token` |
| Token IDS | `ids-dev-token` |

## Reglas (guía Unipaz)

1. Usar `127.0.0.1` de forma uniforme en lab (no mezclar con `localhost`).
2. `BROADCAST_CONNECTION=reverb` o el WS no recibe eventos.
3. Reverb es un proceso aparte: `php artisan reverb:start` o unidad `argos-reverb`.
4. Echo `authEndpoint`: `{VITE_API_URL}/api/broadcasting/auth` + Bearer Sanctum.
