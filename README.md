# Secret Inspector

Web application for detecting, assessing, and tracking exposed secrets in Git repositories. Scans source repos using [gitleaks](https://github.com/gitleaks/gitleaks), enriches findings with dist repo information, and provides a full audit interface including risk assessment and reporting.

## Features

- **Secret Detection** — Automated scans of Git history using gitleaks
- **Multi-Repo Support** — Source repos (scan) and dist repos (enrichment) per project
- **Enrichment** — Finding locations in dist repos, environment variables, codebase search
- **Risk Assessment** — Automatic likelihood/severity scores with manual override, Risk = L x S
- **Audit Table** — Inline editing of status, scores, tickets, and evidence
- **Rotation Report** — Filtered view: only secrets deployed in dist repos
- **Excel Export** — Customer report and rotation report as .xlsx
- **Stable IDs** — Findings retain their IDs across scans (IdMapping)
- **SSH Key Management** — Centralized management of SSH keys for repository access
- **Dark Mode** — Toggleable via sidebar switch
- **Live Scan Progress** — SSE-based progress display on all project subpages, with cancel support

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4, shadcn/ui, SWR, Recharts
- **Backend:** Next.js API Routes, Prisma (SQLite), ExcelJS
- **Tools:** gitleaks, Git, OpenSSH
- **Container:** Docker (all dependencies included)

## Prerequisites

- Docker and Docker Compose

No other dependencies required — Node.js, gitleaks, Git, and OpenSSH are included in the container.

## Usage

```bash
make              # Show all available commands
make start        # Start dev server (hot reload)
make build        # Build production image
make up           # Start production container
make down         # Stop container
make logs         # Show logs
make shell        # Open shell in container
```

### Database

```bash
make export-database                      # Backup to ./backups/
make import-database FILE=backups/xxx.db  # Import backup
```

Database migration runs automatically on startup.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | SQLite database path | `file:/data/secret-inspector.db` |

## Workflow

1. **Create Project** — Assign name and ID prefix
2. **Configure Repositories** — Add source repos (to be scanned) and dist repos (for enrichment)
3. **Add SSH Key** — Provide private key for SSH repos (under Settings or per project). Alternatively, `~/.ssh/id_rsa` is mounted from the host.
4. **Start Scan** — Clones repos, scans with gitleaks, enriches findings. Running scans can be cancelled at any time.
5. **Audit** — Assess findings: set status, adjust risk, link tickets
6. **Reports** — Export rotation report (secrets in dist repos) or customer report
