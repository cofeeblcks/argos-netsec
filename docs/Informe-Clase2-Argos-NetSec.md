# Informe Clase 2 – Decisiones Técnicas

**Proyecto:** Argos NetSec  
**Herramienta:** ArgosNetSec  
**Equipo:** Sauron  
**Asignatura / OVA:** SecNet Academy · Clase 2 de 5  
**Fecha:** 27 de octubre de 2026

> **Cómo usar este documento.**  
> Cada sección corresponde a un formulario del OVA (`docs/Clases/CLASE 2.html`). Copia el texto a los campos del OVA y descarga el informe desde allí, o entrega la versión exportada: `docs/Informe_Clase2_Sauron_ArgosNetSec.html`.  
> Este informe **se anexa** al de la Clase 1; no lo reemplaza.

**Regla del docente:** cada decisión técnica debe justificarse con razones concretas. Las citas normativas siguen ancladas a ISO/IEC 27033, NIST SP 800-218 (SSDF) u OWASP ASVS 5.0.

---

## Portada · Contexto del equipo

| Campo | Valor |
| --- | --- |
| Nombre del equipo | Sauron |
| Nombre de la herramienta | ArgosNetSec |
| Alcance Clase 1 (resumen) | Sistema híbrido: inventario + escáner + IDS ligero (no IPS) en LAN propia; sensores → API → dashboard/Telegram |

### Integrantes

| # | Cédula | Nombre completo |
| --- | --- | --- |
| 1 | 1005239396 | Hadik Andres Chavez Villafañe |
| 2 | 1097183232 | Juan Esteban Antolinez Suarez |
| 3 | 1002362683 | Eliel Josue Tarazona Castro |
| 4 | 1096800029 | Mayra Alejandra Rivera Castro |

---

## 1. FORM · 01 · Lenguaje de programación (Paso 03)

| Campo OVA | Valor a pegar |
| --- | --- |
| Lenguaje principal | **Python** |
| Lenguaje secundario | PHP (Laravel API), TypeScript/JavaScript (dashboard React), Bash (ops/`Makefile`) |

### Justificación técnica (2–3 razones)

1. El equipo necesita prototipar sensores de descubrimiento y lectura de alertas IDS con librerías maduras de red (Scapy, wrappers de Nmap/arp-scan, parseo de `eve.json` de Suricata); Python es el lenguaje dominante en ese ecosistema.
2. El rendimiento de tiempo real a alta velocidad **no** lo asume Python: Suricata captura y detecta; los scripts Python solo normalizan y envían por HTTP. Eso alinea el lenguaje con el alcance de Clase 1 (IDS ligero + inventario, no IPS de wire-speed).
3. La API y el dashboard ya están definidos en el stack de casa (Laravel/PHP y React/TS). Usar Python solo en sensores evita reescribir captura en Go/Rust y mantiene el monorepo coherente con el plan de implementación.

**Norma de apoyo:** NIST SSDF **PW.4.1** (elegir y evaluar componentes/terceros en el contexto de uso esperado) · ISO/IEC **27033-1** (arquitectura con roles claros: observación de red vs. procesamiento).

### Librerías / herramientas clave

```text
Sensores (Python): Scapy, requests/httpx, Pydantic (modelos desde contracts/), Nmap, arp-scan
IDS: Suricata (eve.json) + lector Python
API: Laravel 13, PHP 8.3+, Sanctum, Reverb, MariaDB
Dashboard: Vite, React, TypeScript, Cytoscape
Ops: Bash / Makefile, systemd
```

### Riesgos o limitaciones identificadas

1. Python no es adecuado para análisis de tráfico a alto pps; si el lab crece, el cuello de botella sigue siendo Suricata/config, no reescribir el sensor en Rust a corto plazo.
2. Stack híbrido (Python + PHP + TypeScript) exige contratos compartidos (`contracts/`) para no divergir formatos de ingest; sin disciplina de schema, hay riesgo de acoplamiento frágil (ASVS **V2.2.1**).
3. Capacidades de captura (`cap_net_raw` / `cap_net_admin`) solo en procesos sensor; un error de despliegue que las otorgue a la API elevaría privilegios (SSDF **PW.1.1**, mínimo privilegio).

---

## 2. FORM · 02 · Agente de IA para el desarrollo (Paso 05)

| Campo OVA | Valor a pegar |
| --- | --- |
| ¿Usarán agente de IA? | **Sí, vamos a usar un agente** |
| Agente elegido | **Otro — Cursor** |
| ¿Requiere conexión a internet? | **Sí** |
| Modelo(s) | Modelos del agente Cursor (Composer / modelos del IDE) |

### Justificación de la decisión

1. El monorepo Argos ya se desarrolla en Cursor: el agente conoce la estructura `api/`, `dashboard/`, `docs/` y el plan de implementación sin cambiar de herramienta.
2. Permite asistencia multi-stack (Laravel, React/TS y Python) en el mismo flujo de trabajo del equipo, alineado a las tres capas del alcance Clase 1.
3. El equipo mantiene control humano: el agente sugiere; las decisiones de arquitectura, citas normativas y alcance legal (solo redes propias) las valida el líder técnico y el responsable de seguridad.
4. No se eligió Ollama en esta fase porque el hardware/VRAM del equipo no es el requisito prioritario frente a velocidad de implementación del MVP; la privacidad se mitiga no pegando secretos (`.env`, tokens) en el chat y manteniendo secretos fuera de git.

**Nota:** “Otro” en el select del OVA; en justificación escribir explícitamente **Cursor**.

---

## 3. FORM · 03 · Componentes de infraestructura (Paso 07)

Mínimo OVA: 4. Se registran **6** (recomendado), coherentes con el plan Argos.

| # | Componente | Función | Tecnología | Depende de |
| --- | --- | --- | --- | --- |
| 1 | Scanner | Descubrir hosts (CIDR local), deep scan periódico/bajo demanda, comparar línea base y enviar dispositivos/eventos | Python + Nmap / arp-scan | API (ingest) |
| 2 | IDS | Detectar tráfico/comportamiento sospechoso, normalizar alertas y enviarlas | Suricata + Python (lector `eve.json`) | API (ingest) |
| 3 | API | Único escritor en DB: validar ingest, auth (Sanctum + token sensor), persistir, broadcast y notificar | Laravel 13 / PHP 8.3+ · Reverb | MariaDB |
| 4 | MariaDB | Almacenar inventario, servicios, eventos y alertas (retención 30 días) | MariaDB | Ninguno |
| 5 | Dashboard | UI live/demo: Resumen, Mapa, Exposición, Actividad | Vite + React + TypeScript | API / Reverb |
| 6 | Telegram Bot | Notificar solo alertas `high`/`critical` con anti-ruido 15 min | Bot API vía Laravel Notification | API |

### Flujo principal de datos (pegar en el textarea)

```text
La LAN propia es observada por Scanner (descubrimiento/deep scan) e IDS (Suricata). Ambos sensores envían resultados por HTTP a /api/v1/ingest/* con token de sensor (no escriben en la base de datos). La API Laravel valida (Form Requests + contracts/), persiste en MariaDB, emite eventos por Reverb y, si la severidad es high/critical, notifica a Telegram. El dashboard consulta historial por REST (Sanctum) y recibe novedades por WebSocket (Echo/Reverb); en lab, API/Reverb/dashboard se enlazan a 127.0.0.1.
```

**Norma de apoyo:** ISO/IEC **27033-1** / **27033-2** (monitoreo en límites de confianza + registro de eventos) · ASVS **V2.2.1** (validación de ingest).

---

## 4. Coherencia con Clase 1 (Paso 08 · checklist)

| Pregunta | Respuesta del equipo |
| --- | --- |
| ¿El lenguaje soporta las librerías del alcance? | Sí: Python + Suricata/Nmap/Scapy cubren inventario e IDS; PHP/TS cubren API y UI. |
| ¿El agente es compatible con el stack? | Sí: Cursor asiste en Python, Laravel y React en el mismo monorepo. |
| ¿Los componentes cubren el alcance Clase 1? | Sí: descubrimiento, deep scan, IDS, API, dashboard y Telegram high/critical; sin IPS ni Docker. |
| Quiz OVA (referencia) | Opción coherente: lenguaje de red + agente controlado + DB + captura/analizador separados (no monolito sin almacenamiento). |

---

## 5. Evidencia y sustentación (Paso 09)

| Campo OVA | Valor a pegar / adjuntar |
| --- | --- |
| Archivos de evidencia | (1) Captura o mención de Cursor en el workspace `argos-netsec`. (2) Estructura del repo: `api/`, `dashboard/`, `docs/`. (3) Diagrama de flujo del plan de implementación (mermaid o export PNG). (4) Informe Clase 1 anexado. |
| Observaciones | Se adjunta/sustenta con el plan `docs/Argos NetSec Plan de implementación.md`, el informe Clase 1 (`Informe_Clase1_Sauron_ArgosNetSec.html`) y el monorepo existente. Lenguaje principal Python para sensores; API Laravel y dashboard React como lenguajes secundarios. Agente de desarrollo: Cursor (Otro). Componentes alineados al alcance: sin IPS, sin Docker, bind localhost en lab. |

---

## 6. Declaración de cierre

El equipo declara que las decisiones técnicas aquí registradas fueron discutidas y justificadas, y que son coherentes con el alcance definido en la Clase 1 (ArgosNetSec · equipo Sauron).

| Rol | Nombre | Firma / OK |
| --- | --- | --- |
| Líder técnico | Eliel Josue Tarazona Castro | |
| Responsable de seguridad | Juan Esteban Antolinez Suarez | |
| Documentador | Mayra Alejandra Rivera Castro | |
| Desarrollador(es) | Hadik Andres Chavez Villafañe | |

---

## 7. Mapa rápido OVA → este informe

| Paso OVA | Sección de este archivo |
| --- | --- |
| 00 Portada / 01 Repaso / 02 Lenguaje / 04 Agente IA / 06 Infra (teoría) | Lectura; no hay campos a llenar |
| 03 FORM Lenguaje | §1 |
| 05 FORM Agente | §2 |
| 07 FORM Componentes + flujo | §3 |
| 08 Coherencia | §4 |
| 09 Evidencia y descarga | §5 → pegar en OVA o entregar el `.html` |

---

## 8. Referencias

- Informe Clase 1: [Informe-Clase1-Argos-NetSec.md](Informe-Clase1-Argos-NetSec.md) · [Informe_Clase1_Sauron_ArgosNetSec.html](Informe_Clase1_Sauron_ArgosNetSec.html)
- Plan interno: [Argos NetSec Plan de implementación](Argos%20NetSec%20Plan%20de%20implementaci%C3%B3n.md)
- ISO/IEC 27033-1 / 27033-2 — Network security
- NIST SP 800-218 — SSDF v1.1
- OWASP ASVS 5.0

---

*Informe borrador listo para diligenciar el OVA · Argos NetSec · Clase 2.*
