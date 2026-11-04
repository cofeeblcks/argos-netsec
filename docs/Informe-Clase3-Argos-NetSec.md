# Informe Clase 3 – Codificación segura: teoría, investigación y evidencia

**Proyecto:** Argos NetSec  
**Herramienta:** ArgosNetSec  
**Equipo:** Sauron  
**Asignatura / OVA:** SecNet Academy · Clase 3 de 5  
**Fecha:** 3 de noviembre de 2026

> **Cómo usar este documento.**  
> Cada sección corresponde a un paso del OVA (`docs/Clases/CLASE 3.html`). Copia el texto a los campos del OVA y descarga el informe desde allí, o entrega la versión exportada: `docs/Informe_Clase3_Sauron_ArgosNetSec.html`.  
> Este informe **se anexa** a los de Clase 1 y Clase 2; no los reemplaza.

**Regla del docente:** cada control debe tener **teoría comprendida**, **investigación registrada** (archivo/línea + norma) y **evidencia fotográfica**. Sin las tres, el control no cuenta.

**Alcance de la auditoría:** monorepo completo (`api/`, `scanner/`, `ids/`, `dashboard/`, `contracts/`, `deploy/`, Compose) frente a los cuatro controles de la Clase 3: validación de entradas, errores/logging, cifrado, SAST y secretos.

---

## Portada · Contexto del equipo

| Campo | Valor |
| --- | --- |
| Nombre del equipo | Sauron |
| Nombre de la herramienta | ArgosNetSec |
| Stack Clase 2 (resumen) | Python (scanner/IDS) · Laravel/PHP (API) · React/TS (dashboard) · Suricata · MariaDB |

### Integrantes

| # | Cédula | Nombre completo |
| --- | --- | --- |
| 1 | 1005239396 | Hadik Andres Chavez Villafañe |
| 2 | 1097183232 | Juan Esteban Antolinez Suarez |
| 3 | 1002362683 | Eliel Josue Tarazona Castro |
| 4 | 1096800029 | Mayra Alejandra Rivera Castro |

---

## 0. Resumen de auditoría (veredicto ejecutivo)

| Control Clase 3 | Norma (OVA) | Estado en Argos | Severidad del gap |
| --- | --- | --- | --- |
| Validación de entradas | ASVS V5 / V2.2.1 · SSDF PW.7 | **Parcial** — Form Requests en ingest/auth; CIDR local en scanner; schemas JSON **sin enforcement runtime** | Media |
| Errores y logging | ASVS V7 · SSDF PW.9 | **Parcial** — mensajes genéricos si `APP_DEBUG=false`; defaults de lab con debug=true | Media (lab) |
| Cifrado (tránsito / reposo) | ASVS V6 / V9–V12 · SSDF PW.9 | **Mayormente ok** — bcrypt rounds 12; tokens de sensor hasheados; lab en `127.0.0.1` sin TLS | Baja (lab) / Alta si se expone |
| SAST y secretos | SSDF PW.7 · PS.1 | **Crítico en secretos** — token Telegram real estaba en `deploy/env.md` (redactado); **SAST no integrado** en CI | Crítica → corregida en doc; SAST pendiente |

---

## 1. Fase 1 · Teoría (Pasos 02–05) — resumen de controles

Texto de apoyo para demostrar comprensión (no se pega campo a campo en el OVA, pero alimenta la investigación).

### 1.1 Validación de entradas — “toda entrada es hostil”

- La validación del navegador **no cuenta**: un atacante usa `curl`/proxy y llega directo al servidor.
- ASVS exige **lista blanca** (qué se permite), no lista negra de caracteres.
- En una herramienta de red: IP con parser de librería, puerto 1–65535, sin metacaracteres de shell si se ejecutan comandos, límites de longitud/tamaño.
- **Norma OVA:** OWASP ASVS 5.0 V5 (reqs. 5.3 rechazo+log, 5.5 validación en servidor) · NIST SSDF **PW.7**.

### 1.2 Manejo de errores y logging — “no alimentes al atacante”

- Usuario: mensaje genérico. Detalle técnico solo en log interno.
- Auditoría: quién / qué / cuándo / desde dónde (login fallido, denegaciones, cambios admin).
- **Nunca** en logs: contraseñas, tokens en claro, claves API.
- **Norma OVA:** ASVS V7 (7.4.1 genérico; 7.1.1 no credenciales) · SSDF **PW.9**.

### 1.3 Cifrado — “no inventes tu propia criptografía”

- Tránsito: TLS 1.2+ (preferible 1.3); **nunca** `verify=False`.
- Reposo: Argon2 / bcrypt (costo ≥12) / PBKDF2 (≥600k); jamás MD5/SHA-1/SHA-256 simple para passwords.
- **Norma OVA:** ASVS V6 (criptografía) y V9/V12 (comunicaciones) · SSDF **PW.9**.

### 1.4 SAST y secretos

- SAST prioriza: ¿dato de usuario no confiable? ¿sanitización en el camino? ¿sink peligroso real?
- Secretos **nunca** en git; si se filtró uno → **revocar**, no solo borrar del archivo.
- **Norma OVA:** SSDF **PW.7** · **PS.1**.

---

## 2. INVESTIGACIÓN · 01 · Hallazgos de controles en el código (Paso 06)

Mínimo OVA: 4. Se registran **8** hallazgos de la auditoría al monorepo.

| # | Control | Norma / requisito | Archivo / línea | Hallazgo de la investigación |
| --- | --- | --- | --- | --- |
| 1 | Validación de entradas (ingest scan) | ASVS 5.0 **V2.2.1** / V5.5 · SSDF **PW.7** | `api/app/Http/Requests/Ingest/StoreScanRequest.php` L14–37 | **Parcial / bien orientado.** Valida `ip`, puerto 1–65535 y `protocol in:tcp,udp` en servidor. Gap: `mac`, `risk` y `severity` son `string` libre; el schema en `contracts/schemas/device.schema.json` exige patrón MAC y enums, pero **no se aplica en runtime**. |
| 2 | Validación CIDR (scanner) | ASVS **V2.2.1** · ISO/IEC **27033-1** (límites de confianza) | `scanner/src/argos_scanner/config.py` L37–63, L85 | **Implementado correctamente.** `validate_cidr()` parsea con `ipaddress`, rechaza loopback y exige que el CIDR contenga una interfaz local antes de descubrir. |
| 3 | Command injection / subprocess | ASVS **V5** · SSDF **PW.7** | `scanner/src/argos_scanner/discovery.py` L35–66; `deepscan.py` ~L67 | **Bien.** `subprocess.run([...])` en forma lista, **sin** `shell=True`. Residual: `ARGOS_NMAP_TIMING` (`config.py` L95) entra al argv sin allowlist `-T0`…`-T5`. |
| 4 | Manejo de errores API | ASVS **V7.4.1** · SSDF **PW.9** | `api/bootstrap/app.php` L102–111 | **Parcial.** Con `APP_DEBUG=false` el cliente solo ve mensaje genérico (`ErrorMessages::SERVER_ERROR`). Con debug=true se añade `error` = `exception->getMessage()` (fuga). Defaults lab: `APP_DEBUG=true` en `.env.example` / Compose. |
| 5 | Logging sin secretos | ASVS **V7.1.1** | `api/app/Jobs/SendAlertTelegramJob.php` ~L43–75; `User.php` L15 | **Bien.** Job de Telegram registra `alert_id`/HTTP status, no el bot token. Modelo `User` oculta `password`. No se halló logging de contraseñas/tokens en código de app. |
| 6 | Hashing de contraseñas y tokens de sensor | ASVS **V6** / hashing lento · SSDF **PW.9** | `api/app/Models/User.php` L30; `AuthenticateSensor.php` L25–27; `.env.example` `BCRYPT_ROUNDS=12` | **Bien.** Password con cast `hashed` (bcrypt). Tokens de sensor solo como `token_hash` verificados con `Hash::check`. No MD5/SHA-1. |
| 7 | TLS / verify en clientes | ASVS **V9/V12** | `scanner/.../client.py`; `ids/.../client.py`; `SendAlertTelegramJob.php` | **Bien en código.** `httpx` sin `verify=False`; Telegram por HTTPS. Lab usa HTTP a `127.0.0.1` (coherente con Clase 1: sin exposición). |
| 8 | Secretos en repositorio | SSDF **PS.1** | `deploy/env.md` (ex L48); `.gitignore` L2–9 | **Hallazgo crítico corregido en documentación.** Había un token real de BotFather en un ejemplo `curl`. Se reemplazó por `<TELEGRAM_BOT_TOKEN>`. `.env` está en `.gitignore`. **Acción obligatoria:** revocar el token en BotFather (ya estuvo en historial git). |

---

## 3. INVESTIGACIÓN · 02 · Análisis estático y secretos (Paso 07)

| Campo OVA | Valor a pegar |
| --- | --- |
| Herramienta SAST usada | **Bandit (Python)** — ejecutado ad hoc sobre `scanner/src` e `ids/src` (no hay workflow CI aún) |
| Total de hallazgos | **11** (1 Medium + 10 Low); 0 High |
| ¿Revisaron secretos? | **Sí, encontramos y removimos un secreto** (placeholder en `deploy/env.md`; **revocar en BotFather**) |

### Hallazgos relevantes y cómo los interpretaron

```text
Bandit (scanner + ids, 949 LOC):
1) B314 MEDIUM — deepscan.py:93 — ET.fromstring(xml_text) sobre XML de Nmap.
   Interpretación: el XML lo genera nmap local (fuente semi-confiable en lab).
   No es entrada HTTP directa, pero Bandit lo marca por CWE-20/XXE.
   Corrección planificada: defusedxml o validar que solo se parsea salida propia.
2) B603/B607 LOW — discovery.py / deepscan.py — subprocess sin shell=True + path parcial (nmap, arp-scan, ip).
   Interpretación: falso positivo de severidad práctica / riesgo residual bajo.
   Ya usamos argv-list (correcto según la teoría de la clase). Mejoras: ruta absoluta o allowlist de timing.
3) ids/ — sin hallazgos Medium+; sin subprocess.

No hay Bandit/Semgrep/PHPStan/eslint-plugin-security en CI del monorepo (gap SSDF PW.7).
ESLint del dashboard no incluye plugin de seguridad.
```

### Detalle de la revisión de secretos

```text
- .gitignore cubre .env de root/api/dashboard/scanner/ids; solo se versionan *.env.example y .env.docker.example.
- No hay .pem / claves privadas trackeadas.
- CRÍTICO: deploy/env.md contenía token Telegram real en ejemplo curl → redactado a <TELEGRAM_BOT_TOKEN>.
  Debe revocarse/rotarse en @BotFather; asumir compromiso si el repo se compartió.
- Defaults de lab documentados (admin@argos.local / password, scanner-dev-token, ids-dev-token, APP_KEY fija en Compose): aceptables solo en localhost aislado; inseguros si el stack es alcanzable en red.
- Reverb allowed_origins='*' y Sanctum expiration=null: deuda de hardening para post-lab.
- Login POST /auth/login sin throttle explícito (falta anti fuerza bruta ASVS V6.3.1 de Clase 1).
```

---

## 4. INVESTIGACIÓN · 03 · Conclusiones (Paso 08)

### ¿Qué controles encontraron implementados y cuáles faltan?

```text
Implementados (evidencia en código):
- Validación servidor en Form Requests de ingest/login/mutaciones dashboard.
- Validación CIDR anti-loopback y “solo red local” en el scanner.
- Subprocess sin shell=True; sin verify=False; sin SQL raw con input de usuario.
- Hashing bcrypt (rounds 12) para passwords y token_hash de sensores; auth dual (Sanctum vs middleware sensor).
- Errores API estructurados con mensaje genérico cuando APP_DEBUG=false; User oculta password; jobs no loguean tokens.

Faltan o están parciales:
- Enforcement runtime de JSON Schema (contracts/ es documentación, no gate).
- Regex MAC / enums risk-severity-type alineados al contrato.
- Rate limit en login; expiración de tokens Sanctum.
- APP_DEBUG=false y LOG_LEVEL no-debug como default documentado para “casi prod”.
- SAST en CI (Bandit + Semgrep o PHPStan + eslint-security).
- Auditoría explícita de login fallido / authorize device (requisito Clase 1 V16 aún débil en código).
- Token Telegram filtrado (doc corregida; rotación pendiente en BotFather).
```

### ¿Qué corregirán antes de la Clase 4?

```text
Estado tras remediación (nov 2026):
1. DONE (docs): placeholder en deploy/env.md — PENDIENTE humano: revocar token en BotFather.
2. DONE: Form Requests con MAC regex, enums type/risk/severity y max items/longitud (ValidationPatterns + contracts/).
3. DONE: allowlist ARGOS_NMAP_TIMING ∈ {-T0…-T5} en scanner config.py (+ tests).
4. DONE: throttle:login (5/min) + SANCTUM_EXPIRATION=60 + docs APP_DEBUG=false fuera de lab.
5. DONE: deepscan.py usa defusedxml (mitiga B314).
6. DONE: .github/workflows/security-sast.yml con Bandit -ll.
7. PENDIENTE Clase 4: log de auditoría de auth fallida y cambios authorize/status.
```

### Fuentes consultadas

```text
OWASP ASVS 5.0 — V2/V5 validación, V6 criptografía, V7 errores/logging, V9/V12 comunicaciones
NIST SP 800-218 (SSDF) — PW.7 (revisión de código), PW.9 (config segura), PS.1 (proteger repo/secretos)
Documentación Bandit 1.9 — B314, B603, B607
Guía OWASP Password Storage — bcrypt/Argon2
OVA Clase 3 (docs/Clases/CLASE 3.html) · Informes Clase 1 y 2 Argos NetSec · Plan de implementación
```

---

## 5. Evidencia (Paso 09)

| Campo OVA | Valor / adjunto |
| --- | --- |
| Fotos de evidencia | (1) Captura `StoreScanRequest.php` reglas ip/puerto. (2) Captura `validate_cidr` + `AuthenticateSensor` Hash::check. (3) Salida Bandit (1 Medium B314 + Lows). (4) Diff/redacción de `deploy/env.md` y líneas `.gitignore` de `.env`. (5) `bootstrap/app.php` render genérico de errores. |
| Descripción de las fotos | Foto 1: validación servidor ingest. Foto 2: cifrado/auth de sensor + CIDR. Foto 3: reporte SAST Bandit. Foto 4: revisión de secretos (placeholder + gitignore). Foto 5: manejo de errores API. |

> Las capturas las sube el equipo al OVA (PNG/JPG ≤5 MB). Este `.md` documenta qué fotografiar.

---

## 6. Matriz ampliada de auditoría (anexo técnico)

Severidades: **OK** · **PARCIAL** · **FALTA** · **RIESGO**.

| Área | Ubicación | Sev. | Nota |
| --- | --- | --- | --- |
| Form Requests ingest/auth/mutaciones | `api/app/Http/Requests/**` | PARCIAL | Base sólida; gaps MAC/enums/límites |
| JSON Schema runtime | `contracts/schemas/*.schema.json` | FALTA | Contrato sin validador en API/Python |
| Filtros query listados | Controllers Device/Alert/Event | PARCIAL | Eloquent bindings OK; sin enum Form Request |
| SQLi | búsqueda `DB::raw`/`whereRaw` | OK | No hallado con input de usuario |
| Auth rutas | `api/routes/api.php` | OK | Ingest `sensor`; dashboard `auth:sanctum` |
| Login throttle | `routes/api.php` login | FALTA | Sin rate limit |
| Sanctum expiration | `config/sanctum.php` | FALTA | `expiration => null` |
| AuthenticateSensor | middleware L25–27 | PARCIAL | Hash::check OK; escanea todos los sensores |
| APP_DEBUG defaults | `.env.example`, Compose | RIESGO (lab) | Debug true filtra mensajes |
| Reverb origins | `config/reverb.php` | PARCIAL | `allowed_origins => ['*']` |
| APP_KEY Compose | `compose.yaml` / `.env.docker.example` | RIESGO (lab) | Clave fija de laboratorio |
| Seed tokens/password | `ArgosSeeder.php`, `.env.example` | RIESGO (lab) | Credenciales predecibles |
| Telegram HTTPS | `SendAlertTelegramJob` | OK | `https://api.telegram.org` |
| Secret Telegram en docs | `deploy/env.md` | RIESGO→mitigado | Redactado; rotar token |
| Bandit CI | repo | FALTA | Solo corrida manual |
| XXE/XML nmap | `deepscan.py:93` | PARCIAL | B314 Medium |

---

## 7. Declaración de cierre

El equipo declara que los controles aquí registrados fueron investigados en el código de ArgosNetSec, con hallazgos alineados a ASVS/SSDF citados en la Clase 3, y que la evidencia fotográfica verificará validación, hashing, reporte Bandit y revisión de secretos. La investigación es coherente con el alcance de la Clase 1 y el stack de la Clase 2.

| Rol | Nombre | Firma / OK |
| --- | --- | --- |
| Líder técnico | Eliel Josue Tarazona Castro | |
| Responsable de seguridad | Juan Esteban Antolinez Suarez | |
| Documentador | Mayra Alejandra Rivera Castro | |
| Desarrollador(es) | Hadik Andres Chavez Villafañe | |

---

## 8. Mapa rápido OVA → este informe

| Paso OVA | Sección de este archivo |
| --- | --- |
| 00 Portada / 01 Repaso / 02–05 Teoría | §0 + §1 |
| 06 INVESTIGACIÓN 01 controles | §2 |
| 07 INVESTIGACIÓN 02 SAST/secretos | §3 |
| 08 INVESTIGACIÓN 03 conclusiones | §4 |
| 09 Evidencia fotos | §5 |
| 10 Descargar informe | Pegar en OVA → HTML, o entregar `Informe_Clase3_Sauron_ArgosNetSec.html` |
| — Anexo auditoría completa | §6 |

---

## 9. Referencias

- OVA: [CLASE 3.html](Clases/CLASE%203.html)
- Informes previos: [Informe-Clase1-Argos-NetSec.md](Informe-Clase1-Argos-NetSec.md) · [Informe-Clase2-Argos-NetSec.md](Informe-Clase2-Argos-NetSec.md)
- Plan: [Argos NetSec Plan de implementación](Argos%20NetSec%20Plan%20de%20implementaci%C3%B3n.md)
- OWASP ASVS 5.0 · NIST SP 800-218 (SSDF) · Bandit docs

---

*Informe listo para diligenciar el OVA · Argos NetSec · Clase 3 · auditoría de codificación segura.*
