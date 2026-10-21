# Informe Clase 1 – Ficha de Idea y Alcance

**Proyecto:** Argos NetSec  
**Herramienta:** ArgosNetSec  
**Equipo:** Sauron  
**Asignatura / OVA:** SecNet Academy · Clase 1 de 5  
**Fecha:** 20 de octubre de 2026

> **Cómo usar este documento.**  
> Cada sección corresponde a un módulo del OVA (`docs/GuiaEducativa.html`). Copia el texto a los formularios del OVA. Versión exportada: `docs/Informe_Clase1_Sauron_ArgosNetSec.html`.

**Regla del docente:** todo entregable cita al menos una cláusula o control de ISO/IEC 27033, NIST SP 800-218 (SSDF) u OWASP ASVS 5.0.

---

## Portada · Datos del equipo (Módulo 05 · FORM 01)

| Campo OVA | Valor a pegar |
| --- | --- |
| Nombre del equipo | Sauron |
| Nombre de la herramienta | ArgosNetSec |

### Integrantes

| # | Cédula | Nombre completo |
| --- | --- | --- |
| 1 | 1005239396 | Hadik Andres Chavez Villafañe |
| 2 | 1097183232 | Juan Esteban Antolinez Suarez |
| 3 | 1002362683 | Eliel Josue Tarazona Castro |
| 4 | 1096800029 | Mayra Alejandra Rivera Castro |

---

## 1. Entregable 1 · Ficha de Idea y Alcance (Módulo 05 · FORM 02)

### Problema de red que resuelve

Un administrador de lab o red doméstica propia no dispone, en un solo sistema local, de inventario vivo de dispositivos, detección de cambios (MAC nueva, puerto nuevo, host que desaparece) y alertas accionables, sin depender de un SOC comercial ni escanear redes ajenas.

### Tipo de herramienta

**Otra — sistema híbrido de monitoreo de inventario + escáner de descubrimiento/servicios + IDS ligero** (no IPS).

Entorno: LAN propia o autorizada por escrito, ejecución nativa en Linux (Arch / Omarchy), sin Docker. Sensores Python + Suricata → API Laravel → dashboard React + Telegram.

### Alcance: ¿qué SÍ hará?

1. Descubrir hosts en un CIDR perteneciente a una interfaz local (arp-scan / Nmap `-sn`) de forma periódica (~cada 5 minutos) y mantener inventario (MAC, IP, hostname, vendor, autorización).
2. Ejecutar escaneo profundo semanal (o bajo demanda) con Nmap (`-sV -O`, ritmo `-T2`/`-T3`) para servicios, versiones y CVEs, y generar eventos ante cambios respecto a la línea base.
3. Detectar tráfico/comportamiento sospechoso vía Suricata (p. ej. escaneos, fuerza bruta) y detector ARP spoof, normalizar alertas e ingerirlas en la API.
4. Exponer dashboard (Resumen, Mapa de red, Exposición, Actividad) en vivo y enviar a Telegram solo alertas de severidad `high` y `critical`, con anti-ruido de 15 minutos.

### Exclusiones explícitas: ¿qué NO hará?

1. No bloqueará IPs ni actuará como IPS/firewall de prevención automática.
2. No cubrirá multi-host, agentes remotos, orquestación con Docker ni canales Discord/correo.
3. No escaneará ni monitoreará redes que no sean propias o no tengan autorización escrita; no almacenará payload completo de paquetes (solo metadatos de alertas/eventos).

### Justificación de construirla desde cero *(para conclusiones / exposición)*

Se construye desde cero para controlar el pipeline completo sensores → contratos → API → UI en lab Linux, aplicar mínimo privilegio por componente y documentar límites explícitos (ISO/IEC 27033 + SSDF), en lugar de adaptar una caja negra comercial sin trazabilidad académica.

---

## 2. Entregable 2 · 5 Requisitos Normativos (Módulo 06 · FORM 03)

| # | Norma / Cláusula | Requisito extraído | Justificación aplicada a Argos |
| --- | --- | --- | --- |
| 1 | **ISO/IEC 27033-1** — conceptos de seguridad de red (arquitectura, monitoreo y límites de confianza) | La organización debe diseñar la seguridad de red considerando arquitectura, segmentación lógica y monitoreo del tráfico relevante en los límites de confianza. | Argos define un único punto de observación en LAN propia: sensores solo ven el CIDR de interfaces locales; API/dashboard se enlazan a `127.0.0.1` en lab. El límite de confianza sensor↔API↔operador queda documentado y acotado. |
| 2 | **ISO/IEC 27033-2** — lineamientos de diseño e implementación (monitoreo y registro de eventos de red) | Deben establecerse capacidades de monitoreo y registro de eventos de seguridad de red que permitan detectar anomalías y apoyar la respuesta. | El scanner genera eventos de cambio de inventario; el IDS genera alertas normalizadas; la API persiste `events`/`alerts` (retención 30 días) y fan-out a dashboard/Telegram según severidad. |
| 3 | **NIST SP 800-218 (SSDF) PW.4.1** | Adquirir y mantener componentes de software de terceros bien asegurados (librerías, módulos, frameworks), evaluándolos en el contexto de su uso esperado. | Argos depende de Nmap, Suricata, Scapy, Laravel, Sanctum y Reverb. Antes de integrarlos se revisa el uso esperado (captura/escaneo vs solo lectura de `eve.json`), versiones y configuración segura; no se reinventan primitivas criptográficas. |
| 4 | **OWASP ASVS 5.0 · V6.3.1** (Authentication) | Verificar que existan controles contra ataques de relleno de credenciales / fuerza bruta según la documentación de seguridad de la aplicación. | El dashboard usa autenticación Sanctum (email/password); los sensores usan token propio (hash en tabla `sensors`), distinto del usuario del dashboard. Se documenta rate limiting / mensajes uniformes de fallo de login en el diseño. |
| 5 | **OWASP ASVS 5.0 · V2.2.1** (Input Validation) | Verificar que la entrada se valide para imponer expectativas de negocio/funcionales (lista blanca, rangos o estructura esperada). | Toda ingesta pasa por Form Requests + JSON Schema (`contracts/`); el CIDR objetivo se valida contra interfaces locales; payloads de alerta/scan fuera de esquema se rechazan. |

> Nota: la guía menciona a veces numeración ASVS antigua (V2 auth, V5 validación, V9 TLS). En **ASVS 5.0** eso corresponde a **V6** (auth), **V2** (validación) y **V12** (comunicación segura). Aquí se citan IDs de ASVS 5.0, coherente con las referencias del OVA.

---

## 3. Entregable 3 · Requisitos de Seguridad (Módulo 06 · FORM 04)

### 3.1 Requisitos funcionales

Pegar en el textarea del OVA (uno por línea):

```text
1. Descubrir e inventariar dispositivos de la LAN objetivo (MAC, IP, hostname, vendor, authorized, first_seen, last_seen, risk).
2. Comparar cada descubrimiento/deep scan con la línea base y generar eventos (MAC no autorizada, IP duplicada, puerto nuevo, host ausente).
3. Ejecutar deep scan periódico/bajo demanda y registrar servicios (puerto, protocolo, nombre, versión, cve_ids, severity).
4. Ingerir alertas del IDS normalizadas (rule, severity, src_ip, dst_ip, raw) asociando device_id cuando la IP sea conocida.
5. Exponer API REST autenticada para devices, services, events, alerts y summary; broadcast en vivo vía Reverb.
6. Permitir al operador marcar dispositivos como autorizados y alertas como acked o false_positive.
7. Notificar por Telegram solo alertas high/critical, con deduplicación (rule, src_ip, dst_ip) en ventana de 15 minutos.
8. Conservar alertas/eventos 30 días y exportar fixture demo anonimizado para modo demo del dashboard.
```

### 3.2 Requisitos no funcionales de seguridad

| Categoría | Requisito definido (pegar en el OVA) | Norma de referencia |
| --- | --- | --- |
| **Cifrado en tránsito** | En lab MVP, API, Reverb y dashboard se enlazan solo a `127.0.0.1` (sin exposición LAN/WAN), de modo que el tráfico no sale del host. Si en el futuro se publica detrás de proxy, se exige **TLS 1.2+ con preferencia TLS 1.3**, sin fallback a HTTP claro hacia servicios externos. | OWASP ASVS 5.0 **V12.1.1** / **V12.2.1** |
| **Cifrado en reposo** | Contraseñas de operadores: hash con KDF aprobado (bcrypt/Argon2 vía Laravel). Tokens de sensor: solo `token_hash` en DB. Secretos Telegram y Reverb solo en `.env` (no en git ni fixtures). DB almacena metadatos de alertas/eventos, no payload de paquetes. Retención 30 días. | OWASP ASVS 5.0 **V11.4.2** · **V14.2.7** |
| **Autenticación y sesiones** | Dashboard: Sanctum Bearer; tokens de sesión generados en backend, no secretos estáticos. Sensores: token por sensor, revocable, distinto del usuario UI. Documentar timeout de inactividad (propuesta: 30–60 min) y logout que invalide la sesión. | OWASP ASVS 5.0 **V7.2.1–V7.2.2** · **V7.3.1** · **V6.3.1** |
| **Logging de auditoría** | Registrar (quién / qué / cuándo): login OK/fallido, authorize device, cambio de status de alerta, ingest rechazado por auth/validación. No registrar bot token ni contraseñas. Logs de app separados de alertas de red. | OWASP ASVS 5.0 **V16.2.1** · **V16.3.1** · **V16.2.5** |
| **Manejo de errores** | Al cliente: mensaje genérico + código (`status: error`); stack traces y detalles internos solo en log del servidor. Fallo de Telegram no bloquea ingest ni broadcast. | OWASP ASVS 5.0 **V16.5.1** · **V16.5.2** |
| **Validación de entradas** | Validar shape de ingest con schemas/Form Requests; CIDR solo si pertenece a interfaz local; límites de tamaño/campos en JSON; plantilla Nmap `-T2`/`-T3` para no saturar equipos. | OWASP ASVS 5.0 **V2.2.1** · NIST SSDF **PW.1.2** |

---

## 4. Entregable 4 · Roles del equipo (Módulo 07 · FORM 05)

| Rol | Integrante | Responsabilidad principal |
| --- | --- | --- |
| Líder técnico | Eliel Josue Tarazona Castro — C.C. 1002362683 | Coordina arquitectura monorepo, prioridades por fase (ops → contracts → api → scanner → dashboard → ids) y decisiones técnicas. |
| Responsable de seguridad | Juan Esteban Antolinez Suarez — C.C. 1097183232 | Vela por citas normativas, controles ASVS/SSDF/27033, alcance legal (solo redes propias) y revisión STRIDE. |
| Documentador | Mayra Alejandra Rivera Castro — C.C. 1096800029 | Mantiene informe Clase 1, plan de implementación, `deploy/env.md` y evidencias de diseño. |
| Desarrollador(es) | Hadik Andres Chavez Villafañe — C.C. 1005239396 | Implementan API, sensores, IDS y dashboard con validación, auth y mínimo privilegio. |

---

## 5. Entregable 4 · Modelo STRIDE (Módulo 07 · FORM 06)

Mínimo exigido: 4. Se proponen **6** (recomendado). Todas son específicas de Argos.

| Tipo STRIDE | Activo afectado | Amenaza específica | Control propuesto | Norma ref. |
| --- | --- | --- | --- | --- |
| **S** Spoofing | Endpoint `/api/v1/ingest/*` | Un proceso local o actor con token de sensor filtrado se hace pasar por el scanner/IDS e injecta dispositivos o alertas falsas. | Token por sensor con hash en DB, revocable; middleware distinto de Sanctum; no reutilizar tokens en fixtures públicos; rotar si hay sospecha. | ASVS 5.0 **V6.3.1** · **V7.2.2** |
| **T** Tampering | Tablas `devices` / `alerts` / baseline | Manipular el inventario o marcar alertas reales como `false_positive` para ocultar un host no autorizado. | Solo operadores autenticados con Sanctum pueden PATCH; registrar acción de auditoría; export demo anonimizado (sin datos reales de producción en git). | ASVS 5.0 **V16.3.2** · SSDF **PS.1.1** |
| **R** Repudiation | Acciones del dashboard | Un operador niega haber autorizado un dispositivo o haber cerrado una alerta. | Log de auditoría con usuario, acción, timestamp (UTC) e id del recurso; retención alineada a 30 días de eventos. | ASVS 5.0 **V16.2.1** · **V16.3.1** |
| **I** Information disclosure | API errores / `.env` / export demo | Respuestas de error o export filtran stack traces, `TELEGRAM_BOT_TOKEN` o datos reales de la red del lab. | Errores genéricos al cliente; secretos solo en `.env`; `argos:export-demo` anonimiza; no loguear tokens. | ASVS 5.0 **V16.5.1** · **V14.2.5** / **V16.2.5** |
| **D** Denial of service | Scanner, cola API, Telegram | Deep scan agresivo o flood de eventos/alertas satura el host, la cola o genera spam Telegram. | Nmap `-T2`/`-T3`; deep scan semanal; anti-ruido Telegram 15 min; validación de tamaño/schema en ingest; CIDR acotado. | ASVS 5.0 **V2.2.1** · ISO/IEC **27033-2** (monitoreo sin degradar el servicio observado) |
| **E** Elevation of privilege | Procesos Suricata / scanner | Compromiso del binario o script con `cap_net_raw`/`cap_net_admin` permite abusar privilegios de red más allá del rol del sensor. | Usuario dedicado + `setcap` mínimo; API/MariaDB/dashboard sin caps; sensores no escriben DB directamente (solo HTTP ingest). | SSDF **PW.1.1** · ISO/IEC **27033-1** (mínimo privilegio en arquitectura de red) |

---

## 6. Conclusiones y próximos pasos (Módulo 08 · FORM 07)

### ¿Qué aprendió el equipo en esta sesión?

Que una herramienta de seguridad de redes no se define solo por “hacer un IDS”: hay que acotar problema, entorno (LAN propia), exclusiones y superficie de ataque propia. El plan técnico de Argos ya resolvía arquitectura; la Clase 1 obliga a **anclar cada decisión a ISO/IEC 27033, NIST SSDF u OWASP ASVS**, y a mirar Argos como sistema atacable (tokens de sensor, ingest, privilegios de captura), no solo como detector de amenazas ajenas.

### Próximos pasos para la Clase 2 (diseño seguro)

1. Dibujar diagrama de arquitectura con **límites de confianza**: red LAN → scanner/ids → API (`127.0.0.1`) → MariaDB / Reverb → dashboard / Telegram.
2. Completar STRIDE con flujos de datos por frontera (al menos las 6 amenazas de este informe, refinadas).
3. Justificar política de tránsito: lab localhost vs **TLS 1.3** si se publica (ASVS V12).
4. Definir inventario de logs de auditoría de operador y formato de retención.
5. Preparar criterios de aceptación verificables por requisito ASVS/SSDF citado.

### Dudas o preguntas para el docente

- ¿Para lab 100 % localhost, basta documentar “sin TLS por no haber exposición de red” citando el alcance, o exigen TLS aunque sea loopback?
- ¿ASVS 5.0 (V6/V2/V12) es aceptable frente a la numeración antigua que aparece en ejemplos del OVA?

---

## 7. Declaración de cierre

El equipo declara que el alcance aquí definido fue discutido y validado para Argos NetSec, y que los entregables citan al menos una cláusula o control de ISO/IEC 27033, NIST SP 800-218 (SSDF) u OWASP ASVS 5.0.

| Rol | Nombre | Firma / OK |
| --- | --- | --- |
| Líder técnico | Eliel Josue Tarazona Castro | |
| Responsable de seguridad | Juan Esteban Antolinez Suarez | |
| Documentador | Mayra Alejandra Rivera Castro | |
| Desarrollador(es) | Hadik Andres Chavez Villafañe | |

---

## 8. Mapa rápido OVA → este informe

| Módulo OVA | Sección de este archivo |
| --- | --- |
| 00 Portada / 01 Bienvenida / 02 Cronograma / 03 Marco / 04 Buenas prácticas | Lectura; no hay campos a llenar (contexto) |
| 05 Idea y Alcance · FORM 01–02 | Portada + §1 |
| 06 Requisitos · FORM 03–04 | §2 + §3 |
| 07 STRIDE y Roles · FORM 05–06 | §4 + §5 |
| 08 Conclusiones · FORM 07 | §6 |
| 09 Descargar informe | Pegar todo en el OVA → exportar HTML; o entregar este `.md` si el docente lo acepta |

---

## 9. Referencias

- ISO/IEC 27033-1 / 27033-2 — Network security (conceptos y lineamientos de diseño).
- NIST SP 800-218 — Secure Software Development Framework (SSDF) v1.1 · [PDF](https://nvlpubs.nist.gov/nistpubs/specialpublications/nist.sp.800-218.pdf).
- OWASP ASVS 5.0 — Application Security Verification Standard · [repositorio](https://github.com/OWASP/ASVS).
- Plan interno: [Argos NetSec Plan de implementación](Argos%20NetSec%20Plan%20de%20implementaci%C3%B3n.md).
- Gap analysis: [Clase1-Gap-Analisis-Argos-vs-Guia.md](Clase1-Gap-Analisis-Argos-vs-Guia.md).

---

*Informe borrador listo para diligenciar el OVA · Argos NetSec · Clase 1.*
