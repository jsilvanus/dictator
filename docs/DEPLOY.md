# Dictator — Deployment Guide

## Requirements

- Docker Engine 24+ and Docker Compose v2
- An Anthropic API key
- A domain or IP reachable by your users

## First deployment

```bash
# 1. Clone the repository
git clone https://github.com/your-org/dictator.git
cd dictator

# 2. Copy the example env file and fill in your values
cp .env.example .env
# Edit .env — at minimum set DB_PASSWORD, NEXTAUTH_SECRET, NEXTAUTH_URL, ANTHROPIC_API_KEY

# 3. Start the stack
docker compose up -d --build

# 4. Seed the initial admin user (one-time; idempotent)
docker compose exec app npm run db:seed

# 5. Open the app
open http://localhost:3000   # or your NEXTAUTH_URL
```

Log in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` you set in `.env`.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | yes | JWT signing secret (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | yes | Public URL of the app (e.g. `https://dictator.example.com`) |
| `ANTHROPIC_API_KEY` | yes | Anthropic API key |
| `DB_PASSWORD` | yes (compose) | PostgreSQL password used in the compose stack |
| `ADMIN_EMAIL` | seed only | First admin user email |
| `ADMIN_PASSWORD` | seed only | First admin user password |
| `COMMAND_TRIGGER_DEFAULT` | no | Instance default command trigger (default: `Computer`) |
| `AI_TRIGGER_DEFAULT` | no | Instance default AI trigger (default: `Assistant`) |
| `SMTP_HOST` | no | SMTP server host for share invite emails |
| `SMTP_PORT` | no | SMTP port (default: `587`) |
| `SMTP_USER` | no | SMTP username |
| `SMTP_PASS` | no | SMTP password |

Sharing works without SMTP — invite emails are silently skipped when SMTP is not configured.

## Upgrade procedure

```bash
# Pull latest code
git pull

# Rebuild and restart (migrations run automatically on startup)
docker compose up -d --build

# Verify health
curl http://localhost:3000/api/health
```

Database migrations run automatically via `instrumentation.ts` before the server accepts traffic. No manual migration step is required.

## Local development

```bash
# docker-compose.override.yml is picked up automatically
docker compose up -d

# Or run Next.js dev server directly (requires a running Postgres)
npm install
cp .env.example .env.local   # fill in DATABASE_URL pointing to local Postgres
npm run dev
```

The override file exposes Postgres on `localhost:5432` and mounts source for hot reload.

## Health check

`GET /api/health` returns `{ status: "ok", db: "ok" }` when both the app and database are reachable. Returns `503` if the database is unavailable. Used by Docker health checks.
