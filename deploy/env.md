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
| `TELEGRAM_BOT_TOKEN` | | Token del bot (ver sección Telegram abajo) |
| `TELEGRAM_CHAT_ID` | | ID del chat destino (ver sección Telegram abajo) |
| `TELEGRAM_MIN_SEVERITY` | `high` | Solo `high` y `critical` |
| `TELEGRAM_DEDUPE_MINUTES` | `15` | No reenviar la misma alerta `(rule, src_ip, dst_ip)` en esta ventana |

### Telegram: crear bot y obtener token / chat_id

Las alertas `high`/`critical` se envían con la [Bot API](https://core.telegram.org/bots/api). Sin `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID`, el job registra un warning y no envía (el resto del sistema sigue igual).

#### 1. Crear el bot con BotFather

1. Abre Telegram y busca **[@BotFather](https://t.me/BotFather)** (oficial de Telegram).
2. Envía `/newbot`.
3. Elige un **nombre visible** (ej. `Argos NetSec Lab`) y un **username** que termine en `bot` (ej. `argos_netsec_lab_bot`).
4. BotFather responde con el **HTTP API token** (formato `123456789:AAH...`). Cópialo a `TELEGRAM_BOT_TOKEN` en `api/.env`.
5. Opcional: `/setdescription`, `/setcommands`, `/setprivacy` según prefieras. Para un chat privado contigo, privacy no suele importar; en **grupos**, si el bot no lee mensajes normales, úsalo igual: basta con que el bot esté en el grupo y conozcas el `chat_id`.

No subas el token a git ni lo pongas en fixtures/logs.

#### 2. Obtener el `TELEGRAM_CHAT_ID`

El chat_id es el destino de las alertas (tu usuario, un grupo o un canal).

**Opción A — chat privado contigo**

1. Abre el bot que creaste y pulsa **Start** (o envía `/start`).
2. En el navegador o con `curl`:

```bash
curl -s "https://api.telegram.org/bot/8769458009:AAG33wwcqE7kP4fK1fx18RYpHGDfn2r774w/getUpdates" | jq .
```

3. En la respuesta busca `message.chat.id` (número entero, positivo para usuario). Ese valor es `TELEGRAM_CHAT_ID`.

**Opción B — grupo**

1. Crea un grupo, añade el bot y envía un mensaje cualquiera en el grupo.
2. Vuelve a llamar a `getUpdates` como arriba.
3. Usa el `chat.id` del grupo (suele ser **negativo**, p. ej. `-1001234567890`).

**Opción C — canal**

1. Crea un canal, añade el bot como **administrador** (permiso para publicar).
2. Publica un mensaje en el canal y consulta `getUpdates`, o reenvía un mensaje del canal a [@userinfobot](https://t.me/userinfobot) / usa la API; el id de canal también es negativo (`-100...`).

Si `getUpdates` devuelve `"result": []`, el bot aún no ha recibido ningún mensaje: envía `/start` o escribe en el grupo/canal y reintenta. Si usas webhook en otro proyecto, `getUpdates` puede quedar vacío; para Argos el job solo hace `sendMessage` (long polling no hace falta).

#### 3. Probar el envío

```bash
# Sustituye TOKEN y CHAT_ID
curl -s -X POST "https://api.telegram.org/botTOKEN/sendMessage" \
  -d "chat_id=CHAT_ID" \
  -d "text=Argos NetSec: prueba de alerta"
```

Si llega el mensaje, guarda los valores en `api/.env` y reinicia/recarga la cola (`php artisan queue:work`) para que lea la config.

#### 4. Variables opcionales

| Variable | Efecto |
| --- | --- |
| `TELEGRAM_MIN_SEVERITY=high` | Solo notifica `high` y `critical` (default del producto) |
| `TELEGRAM_DEDUPE_MINUTES=15` | Anti-ruido: misma regla + IPs no se reenvía en 15 min |

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
