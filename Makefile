.PHONY: setup contracts migrate dev scan ids test demo install-services help

ROOT := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

help:
	@echo "Argos NetSec targets:"
	@echo "  make setup             Install deps and copy .env.example files"
	@echo "  make contracts         Verify contracts and note codegen paths"
	@echo "  make migrate           Run Laravel migrations"
	@echo "  make dev               API + Reverb + queue + dashboard (manual panes)"
	@echo "  make scan              Deep scan (requires scanner)"
	@echo "  make ids               Start Suricata + IDS reader (requires ids)"
	@echo "  make test              Run api / scanner / ids / dashboard tests"
	@echo "  make demo              Export demo fixture + build dashboard demo"
	@echo "  make install-services  Install systemd units from deploy/"

setup:
	@test -f api/.env || cp api/.env.example api/.env
	@test -f dashboard/.env || (test -f dashboard/.env.example && cp dashboard/.env.example dashboard/.env || true)
	@test -f scanner/.env || cp scanner/.env.example scanner/.env
	@test -f ids/.env || cp ids/.env.example ids/.env
	cd api && composer install
	cd dashboard && pnpm install
	cd scanner && python3 -m venv .venv && .venv/bin/pip install -e ".[dev]"
	cd ids && python3 -m venv .venv && .venv/bin/pip install -e ".[dev]"
	@echo "Nota IDS: arp_spoof con scapy suele requerir: sudo .venv/bin/python -m argos_ids.main"
	@echo "Setup done. Fill env files — see deploy/env.md"

contracts:
	@test -f contracts/schemas/device.schema.json
	@test -f contracts/schemas/service.schema.json
	@test -f contracts/schemas/event.schema.json
	@test -f contracts/schemas/alert.schema.json
	@test -f contracts/openapi.yaml
	@test -f contracts/fixtures/data.json
	@echo "Contracts OK. Generate Pydantic/TS consumers when scanner/dashboard codegen is wired."

migrate:
	cd api && php artisan migrate

dev:
	@echo "Run in separate terminals (or use a process manager):"
	@echo "  cd api && php artisan serve --host=127.0.0.1 --port=8000"
	@echo "  cd api && php artisan reverb:start --host=127.0.0.1 --port=8080"
	@echo "  cd api && php artisan queue:work"
	@echo "  cd dashboard && pnpm dev --host 127.0.0.1"

scan:
	cd scanner && .venv/bin/python -m argos_scanner.main --deep

ids:
	@IFACE=$$(grep '^ARGOS_IFACE=' $(ROOT)ids/.env | cut -d= -f2); \
	echo "make ids solo imprime comandos. Arranca AMBOS procesos:"; \
	echo "1) Suricata:"; \
	echo "  sudo suricata -c $(ROOT)ids/suricata/suricata.yaml -i $$IFACE"; \
	echo "2) Lector (latido API cada 60s + alertas eve.json):"; \
	echo "  cd $(ROOT)ids && .venv/bin/python -m argos_ids.main"

test:
	cd api && php artisan test
	cd scanner && .venv/bin/pytest -q
	cd ids && .venv/bin/pytest -q


demo:
	cd api && php artisan argos:export-demo || echo "export command pending"
	cd dashboard && VITE_DEMO=true pnpm build

install-services:
	@echo "Copy deploy/*.service to systemd and enable (requires root for system units)."
	@ls deploy/*.service 2>/dev/null || echo "No unit files yet"
