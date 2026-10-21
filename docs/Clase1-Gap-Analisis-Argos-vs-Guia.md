# Clase 1 · Gap analysis: Argos NetSec vs guía del docente

Documento de trabajo del equipo. La guía (`GuiaEducativa.html`) es material del docente (ejemplos y lineamientos). **Argos NetSec** es el proyecto que el equipo desarrolla e investiga.

Fuentes:

- [Guía educativa OVA · Clase 01](GuiaEducativa.html)
- [Argos NetSec · Plan de implementación](Argos%20NetSec%20Plan%20de%20implementaci%C3%B3n.md)

---

## Contexto

Para la Clase 1 el docente **no pide código**: pide un **informe con 5 entregables**, y que cada decisión cite al menos una cláusula o control de:

- ISO/IEC 27033 (seguridad de red)
- NIST SP 800-218 — SSDF (desarrollo seguro)
- OWASP ASVS (verificación de seguridad de aplicaciones), Nivel 1 mínimo

**Regla de oro (guía):** ninguna decisión de diseño vale si no está respaldada por una cita normativa. Si no se puede citar la norma, la decisión no cuenta.

Argos ya tiene mucho diseño técnico en el plan de implementación. Lo que falta es casi todo el **empaquetado académico** que pide la guía.

---

## Checklist del docente vs Argos

| Entregable (guía) | Qué pide el docente | Estado en Argos hoy |
| --- | --- | --- |
| **1 · Ficha de Idea y Alcance** | Problema, tipo, 3–4 SÍ, 2–3 NO, equipo | **Base lista** en el plan; falta redactarla en formato de informe + datos del equipo |
| **2 · 5 requisitos normativos** | Cláusula + requisito + justificación aplicada a Argos | **Falta por completo** (el plan no cita normas) |
| **3 · Requisitos de seguridad** | Funcionales + 6 no funcionales con norma | Funcionales **derivables**; no funcionales **parciales** y **sin citas** |
| **4a · Roles** | Líder, seguridad, documentador, desarrollador(es) | **Falta** (solo aparece autoría técnica en el plan) |
| **4b · STRIDE (≥4)** | Amenaza específica + activo + control + norma | Hay **riesgos técnicos**; no hay **modelo STRIDE** formal |
| **5 · Conclusiones** | Aprendizaje + pasos Clase 2 + dudas | **Falta** |
| **Regla de oro** | Toda decisión de diseño con cita normativa | **Incumplida** en la documentación actual |

Además hacen falta: integrantes (cédula/nombre), nombre de equipo/herramienta, y el informe exportable desde el OVA o un documento equivalente.

---

## Entregable 1 · Ficha de Idea y Alcance

Casi listo: solo redactar y acotar con el contenido del plan.

### Problema (propuesta alineada al plan)

Un administrador de lab / red doméstica no tiene, en un solo lugar, inventario vivo de dispositivos, detección de cambios (MAC nueva, puerto nuevo, host que desaparece) y alertas accionables sin depender de un SOC comercial.

### Tipo

Híbrido: **monitor de inventario + escáner de descubrimiento/servicios + IDS ligero**.

No basta con “hacer un IDS”. Hay que ser concretos: LAN propia, Linux nativo (Arch / Omarchy), sin Docker.

### Alcance — qué SÍ hará (del plan)

1. Descubrir hosts en CIDR propio (arp-scan / Nmap `-sn`) cada ~5 minutos.
2. Deep scan semanal (servicios, versiones, CVE vía Nmap).
3. IDS (Suricata + ARP spoof) → alertas normalizadas.
4. Dashboard (resumen, mapa, exposición, actividad) + Telegram solo severidades `high` / `critical`.

### Exclusiones — qué NO hará (del plan)

1. No bloquea IPs / no es IPS de prevención.
2. No multi-host, agentes remotos ni Docker.
3. No Discord/correo; no escaneo fuera de redes propias o con autorización escrita.

### Pendiente en el informe

- Nombre del equipo e integrantes.
- Una frase de *por qué construirla desde cero* (p. ej. control total del pipeline sensores → API → UI en lab Linux).

---

## Entregable 3 · Requisitos de seguridad

### Funcionales (derivables del plan)

Se pueden listar así:

- Inventariar dispositivos (MAC, IP, hostname, vendor, autorización).
- Comparar línea base y generar eventos de cambio.
- Ingesta autenticada desde sensores (`/api/v1/ingest/...`).
- Consultas REST + actualizaciones en vivo por WebSocket (Reverb).
- Acciones de operador: acusar recibo (`acked`) y marcar falso positivo.
- Latido / estado de sensores.
- Export demo anonimizado.

### No funcionales — mapeo honesto

| Categoría (guía) | Qué dice Argos hoy | Qué falta para el docente |
| --- | --- | --- |
| **Cifrado en tránsito** | Lab en `http` / `127.0.0.1`; nota TLS solo “si algún día hay proxy” | Decidir y **justificar** (p. ej. TLS 1.3 en producción / lab solo localhost) **con cita ASVS V9** (o equivalente). Hoy no está cerrado como requisito académico. |
| **Cifrado en reposo** | Tokens con hash; secretos en `.env`; no payload de paquetes | Definir qué hay en MariaDB (¿solo metadatos?), cómo se protegen credenciales / token Telegram, y citar norma. |
| **Autenticación y sesiones** | Sanctum + token de sensor; login demo | Timeouts, rotación/revocación de tokens, política de sesión — **documentar + citar ASVS V2**. |
| **Logging de auditoría** | Alertas/eventos en DB; “no loguear bot token” | Quién hizo qué (login, acked, authorize device) — el plan no define auditoría de acciones de operador. |
| **Manejo de errores** | Envelope JSON API; errores genéricos implícitos | Política explícita: usuario ve mensaje genérico; stack solo en log interno + cita ASVS V7. |
| **Validación de entradas** | Form Requests / schemas en `contracts/` | Redactar como requisito verificable (CIDR vs interfaces, shape de ingest) + **ASVS V5**. |

Las buenas prácticas de la guía (mínimo privilegio, no reinventar criptografía, documentar límites) **sí** están en el espíritu del plan; faltan **emparejadas a identificadores de norma**.

---

## Lo que falta de verdad (prioridad)

### 1. Investigación normativa — Entregable 2 (crítico)

Necesitan **5 filas** del estilo:

`Norma / cláusula` → `Requisito extraído` → `Por qué aplica a Argos`

Sugerencia de distribución (a investigar y citar con el ID real de la norma):

| # | Norma orientativa | Enfoque Argos |
| --- | --- | --- |
| 1 | ISO/IEC 27033 | Monitoreo / límites de confianza / segmentación del punto de observación en LAN |
| 2 | ISO/IEC 27033 | Logging de eventos de red / correlación con inventario |
| 3 | NIST SSDF (p. ej. preparación / terceros) | Dependencias Nmap, Suricata, Scapy — revisar antes de integrar |
| 4 | OWASP ASVS V2 | Auth dashboard (Sanctum) y tokens de sensor |
| 5 | OWASP ASVS V5 | Validación de ingest y CIDR |

Sin esto, el informe no pasa la regla de oro aunque el código exista.

### 2. STRIDE formal — ≥4 amenazas específicas (crítico)

El plan tiene riesgos operativos; hay que **traducirlos** al formato del docente (amenaza específica + activo + control + norma).

Borradores anclables a Argos (aún necesitan control propuesto + cita normativa):

| STRIDE | Activo | Amenaza específica (borrador) |
| --- | --- | --- |
| **S** Spoofing | Endpoint ingest | Otro proceso en el host usa un token de sensor robado/filtrado e injecta alertas falsas |
| **T** Tampering | Baseline / DB | Manipular `devices` / `alerts` o fixtures demo para ocultar un host no autorizado |
| **I** Info disclosure | API / errores / export | Filtrar stacks, tokens Telegram o datos reales en `export/demo` |
| **D** DoS | Scanner / IDS / ingest | Deep scan agresivo o flood de eventos satura API, cola o Telegram |
| **R** Repudiation | Acciones dashboard | Operador niega haber marcado `false_positive` sin traza de auditoría |
| **E** Elevation | Privilegios sensores | Proceso Python/Suricata con `cap_net_*` comprometido escala a más de lo necesario |

Requisito mínimo de la guía: **al menos 4** filas completas (no genéricas).

### 3. Roles del equipo académico (pendiente)

Asignar personas reales a:

- Líder técnico
- Responsable de seguridad
- Documentador
- Desarrollador(es)

Cada uno con una frase de responsabilidad principal.

### 4. Cierre académico (pendiente)

- Conclusiones de la sesión (qué aprendió el equipo).
- Próximos pasos para la Clase 2 (la guía apunta a: arquitectura con límites de confianza, STRIDE más completo, justificar TLS).
- En Argos eso puede ser: diagrama de trust boundaries (scanner / ids vs API vs dashboard) y política TLS lab vs producción.
- Dudas opcionales para el docente.

### 5. Artefacto entregable (pendiente)

No hay en el repo un informe Clase 1 (solo el plan técnico + el OVA). Hay que **llenarlo en el OVA** o redactar el HTML/PDF equivalente con las secciones del template de exportación:

1. Integrantes  
2. Ficha de Idea y Alcance  
3. 5 requisitos normativos  
4. Requisitos de seguridad (funcionales + no funcionales)  
5. Roles del equipo  
6. Modelo STRIDE  
7. Conclusiones y próximos pasos  
8. Declaración de cierre  

---

## Qué no pide esta clase (aunque Argos ya lo tenga)

No bloquean la entrega de Clase 1:

- Makefile, `.mise.toml`, systemd
- Checklist Reverb / WebSocket
- Fases 0–5 de implementación
- Paleta de marca / Cytoscape / vistas del dashboard

Eso es avance de producto. El docente valida **alcance + normas + STRIDE** para permitir el avance a la Clase 2.

---

## Orden práctico sugerido

1. Redactar Entregable 1 con el texto del plan (problema / tipo / alcance / exclusiones) + integrantes.
2. Investigar y armar las **5 citas normativas** ligadas a Argos.
3. Completar la tabla de **6 no funcionales** con decisión explícita (sobre todo tránsito, reposo y auditoría) + norma.
4. Escribir **≥4 amenazas STRIDE** con control y cita.
5. Roles + conclusiones / próximos pasos → exportar informe.

---

## Resumen

| Pregunta | Respuesta |
| --- | --- |
| ¿Argos ya define *qué* construir? | Sí (plan de implementación). |
| ¿Qué falta frente a la guía? | Fundamentación normativa, STRIDE formal, roles del equipo e informe de cierre. |
| ¿Cuál es el hueco principal? | No es de arquitectura: es de **investigación y documentación académica con citas**. |

---

*Documento generado a partir del gap analysis Clase 1 · Argos NetSec vs OVA del docente.*
