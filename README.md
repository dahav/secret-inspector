# Secret Inspector

Web-Applikation zur Erkennung, Bewertung und Nachverfolgung von exponierten Secrets in Git-Repositories. Scannt Source-Repos mit [gitleaks](https://github.com/gitleaks/gitleaks), reichert Findings mit Dist-Repo-Informationen an und bietet eine vollständige Audit-Oberfläche inkl. Risikobewertung und Reporting.

## Features

- **Secret-Erkennung** — Automatisierte Scans der Git-Historie mit gitleaks
- **Multi-Repo-Support** — Source-Repos (Scan) und Dist-Repos (Enrichment) pro Projekt
- **Enrichment** — Fundorte in Dist-Repos, Umgebungsvariablen, Codebase-Suche
- **Risikobewertung** — Automatische W/S-Scores mit manueller Korrektur, Risiko = W x S
- **Audit-Tabelle** — Inline-Bearbeitung von Status, Scores, Tickets und Nachweisen
- **Rotation Report** — Gefilterte Ansicht: nur Secrets die in Dist-Repos deployed sind
- **Excel-Export** — Kunden-Report und Rotation-Report als .xlsx
- **Stabile IDs** — Findings behalten ihre IDs über Scans hinweg (IdMapping)
- **SSH-Key-Verwaltung** — Zentrale Verwaltung von SSH-Keys für Repository-Zugriff
- **Dark Mode** — Umschaltbar per Toggle in der Sidebar
- **Live Scan-Fortschritt** — SSE-basierte Fortschrittsanzeige auf allen Projekt-Unterseiten, mit Abbruch-Möglichkeit

## Tech-Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4, shadcn/ui, SWR, Recharts
- **Backend:** Next.js API Routes, Prisma (SQLite), ExcelJS
- **Tools:** gitleaks, Git, OpenSSH
- **Container:** Docker (alle Abhängigkeiten enthalten)

## Voraussetzungen

- Docker und Docker Compose

Keine weiteren Abhängigkeiten nötig — Node.js, gitleaks, Git und OpenSSH sind im Container enthalten.

## Verwendung

```bash
make              # Alle verfügbaren Befehle anzeigen
make start        # Dev-Server starten (Hot Reload)
make build        # Production-Image bauen
make up           # Production-Container starten
make down         # Container stoppen
make logs         # Logs anzeigen
make shell        # Shell im Container öffnen
```

### Datenbank

```bash
make export-database                      # Backup nach ./backups/
make import-database FILE=backups/xxx.db  # Backup importieren
```

Die Datenbank-Migration wird automatisch beim Start ausgeführt.

## Umgebungsvariablen

| Variable | Beschreibung | Default |
|----------|-------------|---------|
| `DATABASE_URL` | SQLite-Datenbankpfad | `file:/data/secret-inspector.db` |

## Workflow

1. **Projekt anlegen** — Name und ID-Prefix vergeben
2. **Repositories konfigurieren** — Source-Repos (werden gescannt) und Dist-Repos (für Enrichment) hinzufügen
3. **SSH-Key hinterlegen** — Private Key für SSH-Repos hinterlegen (unter Einstellungen oder pro Projekt). Alternativ wird `~/.ssh/id_rsa` vom Host gemountet.
4. **Scan starten** — Klont Repos, scannt mit gitleaks, reichert Findings an. Laufende Scans können jederzeit abgebrochen werden.
5. **Audit** — Findings bewerten: Status setzen, Risiko anpassen, Tickets verknüpfen
6. **Reports** — Rotation Report (Secrets in Dist-Repos) oder Kunden-Report exportieren
