COMPOSE = docker compose
COMPOSE_ALL = $(COMPOSE) --profile dev
DB_PATH = /data/secret-inspector.db
BACKUP_DIR = ./backups
TIMESTAMP = $(shell date +%Y%m%d_%H%M%S)

# Erster laufender Container (dev oder production)
RUNNING_ID = $(shell $(COMPOSE_ALL) ps -q | head -1)

.PHONY: help start stop build up down restart logs shell \
        export-database import-database

.DEFAULT_GOAL := help

help: ## Verfügbare Befehle anzeigen
	@echo "SecretInspector – Make-Befehle"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) | \
		awk -F ':.*## ' '{printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""

# ── Development ─────────────────────────────────────────

start: ## Dev-Server starten (im Container, Hot Reload)
	$(COMPOSE) --profile dev up dev

stop: ## Alle Container stoppen
	$(COMPOSE_ALL) down

# ── Docker ──────────────────────────────────────────────

build: ## Images bauen (dev und production)
	$(COMPOSE_ALL) build

up: ## Production-Container starten
	$(COMPOSE) up -d secret-inspector

down: ## Alle Container stoppen
	$(COMPOSE_ALL) down

restart: ## Container neu starten
	$(COMPOSE_ALL) restart

logs: ## Container-Logs anzeigen
	$(COMPOSE_ALL) logs -f

shell: ## Shell im laufenden Container öffnen
	@if [ -z "$(RUNNING_ID)" ]; then \
		echo "Error: Kein Container läuft."; \
		exit 1; \
	fi
	docker exec -it $(RUNNING_ID) sh

# ── Database ────────────────────────────────────────────

export-database: ## Datenbank exportieren nach ./backups/
	@mkdir -p $(BACKUP_DIR)
	@if [ -z "$(RUNNING_ID)" ]; then \
		echo "Error: Kein Container läuft. Starte mit 'make start' oder 'make up'."; \
		exit 1; \
	fi
	docker exec $(RUNNING_ID) cp $(DB_PATH) /tmp/export.db
	docker cp $(RUNNING_ID):/tmp/export.db $(BACKUP_DIR)/secret-inspector_$(TIMESTAMP).db
	@echo "Database exported to $(BACKUP_DIR)/secret-inspector_$(TIMESTAMP).db"

import-database: ## Datenbank importieren (FILE=path/to/backup.db)
	@if [ -z "$(FILE)" ]; then \
		echo "Usage: make import-database FILE=path/to/backup.db"; \
		exit 1; \
	fi
	@if [ ! -f "$(FILE)" ]; then \
		echo "Error: Datei '$(FILE)' nicht gefunden."; \
		exit 1; \
	fi
	@if [ -z "$(RUNNING_ID)" ]; then \
		echo "Error: Kein Container läuft. Starte mit 'make start' oder 'make up'."; \
		exit 1; \
	fi
	docker cp $(FILE) $(RUNNING_ID):/tmp/import.db
	docker exec $(RUNNING_ID) cp /tmp/import.db $(DB_PATH)
	@echo "Database imported from $(FILE). Restart mit 'make restart' empfohlen."
