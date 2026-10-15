# Argos NetSec

Sistema de seguridad en redes para lab / red doméstica en Linux (nativo, sin Docker).

Sensores Python → API Laravel → MariaDB / Reverb → dashboard React + alertas Telegram.

Plan de implementación: [docs/Argos NetSec Plan de implementación.md](docs/Argos%20NetSec%20Plan%20de%20implementaci%C3%B3n.md)

## Inicio rápido

```bash
make setup
# Editar api/.env y dashboard/.env — ver deploy/env.md
make migrate
make contracts
make dev   # ver comandos sugeridos
```

El dashboard exige login (`/login`, split-screen Untitled UI). Credenciales seed: `admin@argos.local` / `password`. Con `VITE_DEMO=true` el login demo no llama a la API.

## Estructura

| Carpeta | Rol |
| --- | --- |
| `contracts/` | JSON Schema + OpenAPI |
| `api/` | Laravel 13 |
| `dashboard/` | Vite + React |
| `scanner/` | Descubrimiento / escaneo |
| `ids/` | Suricata + lector |
| `deploy/` | systemd + env |
