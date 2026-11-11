# Manual de uso

El panel es la forma de mirar la red. No bloquea tráfico ni apaga equipos: muestra inventario, puertos, cambios y alertas, y deja acusar recibo de una alerta.

Ábrelo en http://127.0.0.1:5173. El badge **Live** (arriba a la derecha en escritorio) significa que las pantallas leen la API. El badge **Demo** significa que `VITE_DEMO=true` y los datos salen del fixture estático, sin MariaDB.

## Entrar y salir

1. En **Iniciar sesión** escribe el correo y la contraseña.
2. Tras `php artisan db:seed` (o el seed de Docker) las credenciales de laboratorio son `admin@argos.local` / `password`.
3. Si venías de una ruta protegida, el panel te devuelve a esa ruta. Si no, abre **Resumen**.
4. **Cerrar sesión** está en el icono de salida del encabezado (escritorio) o al final del menú (móvil). Invalida el token de Sanctum.

En modo demo el formulario acepta el mismo usuario y contraseña sin llamar a la API. El aviso amarillo del login lo indica.

Una sesión ausente en cualquier pantalla distinta de `/login` redirige al login.

## Navegación

| Sección | Ruta | Qué responde |
| --- | --- | --- |
| Resumen | `/` | Cifras del inventario, alertas, sensores y listados cortos |
| Mapa | `/mapa` | Cada dispositivo como una tarjeta, verde si está autorizado y roja si no |
| Exposición | `/exposicion` | Hosts, sistema operativo, puertos y servicios del deep scan |
| Actividad | `/actividad` | Tabla de alertas y de eventos. También se abre desde **Alertas** en el menú móvil |

En el móvil el menú sale del encabezado. El logo vuelve a Resumen.

Resumen, Mapa y Exposición cargan al entrar. Para ver datos nuevos en esas tres, recarga la página. Actividad se vuelve a pedir sola cada 15 segundos.

## Resumen

La primera fila son los totales que importan al abrir el día:

- **Dispositivos** y cuántos están autorizados.
- **No autorizados**. Si el número es mayor que cero, hay MACs que el scanner vio y nadie ha marcado como conocidas.
- **Alertas abiertas**, con el subconjunto `high` y `critical`.
- **Riesgo promedio** del inventario (`unknown`, `low`, `medium`, `high`, `critical`).

La segunda fila cuenta puertos abiertos, CVE distintos, hosts con sistema operativo estimado y eventos de las últimas 24 horas. La tercera fila cuenta sensores online, hosts que ya tienen puertos, dispositivos de riesgo alto o crítico, y servicios que traen al menos un CVE.

Debajo hay dos gráficas de barras (alertas abiertas por severidad y dispositivos por riesgo) y tablas:

| Tabla | Lectura |
| --- | --- |
| Dispositivos recientes | Nombre o MAC, IP, si está autorizado, riesgo y cuántos puertos tiene |
| Puertos más frecuentes | Los cinco puertos que más se repiten en el inventario |
| Alertas recientes | Hasta seis, las más nuevas |
| Eventos recientes | Hasta seis cambios de inventario |
| Servicios en riesgo | Severidad alta o crítica, o con CVE |
| Sensores | Nombre, tipo (`scanner` o `ids`) y si el último contacto tiene menos de 15 minutos |

Un sensor en cero no implica que la API esté caída. Puede ser que el proceso del scanner o del IDS no se haya arrancado, o que lleve más de 15 minutos sin hablar con la API.

## Mapa

Cada nodo es un dispositivo ya ingerido. El borde verde y la etiqueta **OK** corresponden a `authorized = true`. El borde rojo y **Nuevo** corresponden a un dispositivo aún no autorizado. La tarjeta muestra el hostname (o los últimos octetos de la MAC) y la IP.

El mapa es una lista de tarjetas, no un grafo de topología. No se arrastran nodos ni se ve el enlace con el gateway.

Si dice «Sin dispositivos», el discovery todavía no entregó hosts. Arranca el scanner (ver el [manual de instalación](manual-instalacion-y-ejecucion.md)) y recarga.

## Exposición

Esta pantalla es el informe del deep scan (`nmap -sV`, top 100 puertos). El discovery solo llena hosts; sin `make scan` o `make docker-scan` las pestañas de puertos salen vacías.

Tres pestañas:

### Hosts / SO

Una tarjeta por host de la página actual, con:

- hostname o IP, y si está autorizado
- riesgo y cantidad de puertos abiertos
- IP, MAC, sistema operativo estimado, fabricante (OUI), número de CVE y última vez visto
- cada puerto como `puerto/protocolo`, nombre del servicio, severidad y, si nmap lo obtuvo, versión y CVE

Un host con «0 puertos» y el texto de que el deep scan ya corrió suele ser un móvil o un equipo que filtra. Un host con el texto «sin deep scan de puertos aún» todavía no pasó por `make scan`.

La paginación (tamaño de página y anterior/siguiente) está arriba y abajo de la lista.

El sistema operativo solo aparece si el deep scan corrió como root (`-O`). Sin root, nmap no hace fingerprint y la ficha dice «Sin fingerprint», salvo que una pasada anterior ya hubiera guardado un valor.

### Puertos

Tabla de puertos abiertos: host, IP, puerto, protocolo, estado `open`, nombre y banner. El estado que muestra la tabla es el de puertos abiertos que el scanner envió; los cerrados no se guardan.

### Servicios

La misma información con versión, CVE, severidad y fecha. La severidad sale `low` salvo que el XML de nmap incluya el script `vulners` con una marca CRITICAL, HIGH o MEDIUM. El comando actual de deep scan no activa ese script, así que la columna CVE se queda en «—» en un lab normal.

## Actividad

Dos tablas.

**Alertas.** Cuándo, regla, severidad, IP origen → IP destino, y estado.

| Estado | Significado |
| --- | --- |
| `open` | Nadie la ha clasificado. Aparece en los contadores de Resumen |
| `acked` | Acusada: la viste y la das por atendida |
| `false_positive` | Falso positivo |

Con la alerta en `open` hay dos botones:

- **Acusar** → `acked`
- **FP** → `false_positive`

Eso llama a `PATCH /api/v1/alerts/{id}`. No borra la fila y no deshace el mensaje de Telegram si ya se envió. En modo demo el cambio solo vive en la pantalla.

**Eventos.** Cambios que calculó el scanner al comparar lo que vio con la línea base. El detalle es JSON. Tipos que emite hoy:

| Tipo | Cuándo |
| --- | --- |
| `device_new` | MAC que no estaba en el inventario |
| `device_unauthorized` | MAC nueva, o MAC conocida con `authorized = false` |
| `device_gone` | Una MAC autorizada no respondió en este discovery |
| `ip_duplicate` | Dos MAC distintas anunciaron la misma IP |
| `port_new` | Puerto abierto en un deep scan |
| `other` | La IP de una MAC conocida cambió (`detail.message = ip_changed`) |

`device_unauthorized` se repite en cada discovery mientras la MAC siga sin autorizar. `port_new` se emite por cada puerto abierto del deep scan, también si ese puerto ya se había visto: el sensor no consulta los servicios previos.

## Autorizar un dispositivo

El panel muestra el estado, pero no tiene un botón para cambiarlo. La API sí: `PATCH /api/v1/devices/{id}` con `{ "authorized": true }`, sesión de dashboard (Bearer de Sanctum), no el token del sensor.

```bash
TOKEN=$(curl -s -X POST http://127.0.0.1:8000/api/v1/auth/login \
  -H "Content-Type: application/json" -H "Accept: application/json" \
  -d '{"email":"admin@argos.local","password":"password"}' \
  | jq -r '.data.token')

curl -s http://127.0.0.1:8000/api/v1/devices \
  -H "Authorization: Bearer $TOKEN" -H "Accept: application/json"

curl -s -X PATCH http://127.0.0.1:8000/api/v1/devices/1 \
  -H "Authorization: Bearer $TOKEN" -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{"authorized": true}'
```

Sustituye `1` por el `id` de la lista. Autorizar un dispositivo que estaba en riesgo `high` lo baja a `low`. El resto de riesgos no se toca. A partir del siguiente discovery, el scanner deja de emitir `device_unauthorized` para esa MAC y la trata como conocida. Si desaparece, emitirá `device_gone`.

Para volver a marcarla como no autorizada, el mismo PATCH con `"authorized": false`.

## Qué hacer ante un hallazgo

1. **Host nuevo en el mapa (rojo).** Confirma en Resumen la MAC, la IP y el fabricante. Si es un equipo tuyo, autoriza por la API. Si no lo reconoces, míralo en Exposición (puertos) y en Actividad (eventos `device_new`).
2. **Alerta `high` o `critical`.** Ábrela en Actividad. La regla dice qué vio Suricata (por ejemplo muchas conexiones SSH o un posible escaneo) o el detector ARP (`argos.arp_spoof`: una IP anunciada por más de una MAC). Acúsala o márcala como falso positivo cuando la hayas clasificado.
3. **Puerto inesperado.** En Exposición, pestaña Puertos, localiza host y servicio. Un deep scan nuevo (`make scan` o `make docker-scan`) refresca versiones. El panel no cierra ese puerto.
4. **Sensor offline.** Comprueba que el proceso sigue en marcha. El IDS debe imprimir `heartbeat ok`. El scanner imprime `discovery on <cidr>` al arrancar y al terminar cada pasada.

## Telegram

Si configuraste bot y chat ( [deploy/env.md](../deploy/env.md) ) y la cola está corriendo, las alertas `high` y `critical` llegan además al chat. El mensaje lleva regla, severidad, IPs y hostname si la API pudo asociar la IP a un dispositivo.

La misma combinación de regla + IP origen + IP destino no se reenvía durante 15 minutos (`TELEGRAM_DEDUPE_MINUTES`). El dashboard sigue mostrando cada alerta. Severidades `low` y `medium` no salen por Telegram.

Sin token o sin chat, el job anota un aviso en el log y no envía nada. El resto del sistema no se detiene.

## Modo demo

Sirve para enseñar el panel sin sensores ni base de datos. En `dashboard/.env`:

```env
VITE_DEMO=true
```

Reinicia `pnpm dev`. El login de demo es el mismo par `admin@argos.local` / `password`. Los datos salen de `dashboard/public/demo-data.json` (o de la respuesta vacía si ese archivo no está). Acusar una alerta no se persiste.

Para generar un fixture a partir de la base local:

```bash
make demo
```

Eso intenta `php artisan argos:export-demo` y luego construye el dashboard con `VITE_DEMO=true`. Si el comando de export aún no está registrado, el `make` lo avisa y sigue con el build.

Vuelve a `VITE_DEMO=false` para operar sobre la red real.
