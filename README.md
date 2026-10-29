# EchoVault Nexus

A personal knowledge and project-intelligence workspace. Capture notes, group them into projects, record decisions with their reasoning, search everything, and (optionally) ask an AI assistant questions that are answered **only from your own notes, with links to the sources**.

## Features

| Area | What works today |
|---|---|
| **Accounts** | Register (with Terms acceptance), sign in, sign out, sign out of all devices, profile editing, email change (password-confirmed), password change, JSON data export, re-acceptance of updated Terms, self-service account deletion (password + typed confirmation; deletes all data). Argon2 password hashing. HttpOnly cookie sessions with refresh-token rotation, server-side revocation and CSRF protection. Rate-limited auth endpoints. |
| **Password reset** | Full email flow (single-use, expiring, hashed tokens; no account enumeration). Needs SMTP settings; without them, the UI says it isn't configured. |
| **Knowledge Vault** | Create, read, update, delete, archive/restore. Markdown editor with preview (rendered safely, no raw HTML). Tags, project links, two-way related-note links, a connection map of each note's project, decisions and related notes, keyword search, tag/project filters, sorting, pagination, save status and unsaved-changes warning. |
| **Projects** | CRUD, statuses (active / on hold / completed / archived), linked knowledge and decisions, counts. Deleting a project keeps its notes and decisions. |
| **Decision Journal** | Context, problem statement, alternatives, selected option, reasoning, expected and actual outcome. Status (proposed / accepted / superseded / reviewed) and last-review date. Project links, search, status/project filters. |
| **Global search** | PostgreSQL full-text keyword search (prefix matching, stemming, ranking) across notes (including archived, labelled), tags, projects and decisions. Grouped by type with counts, type filters, pagination and highlighted excerpts. This is **keyword** search, not semantic search. |
| **AI assistant** | Retrieves your matching notes and decisions (archived notes excluded), sends them to a configured provider (Claude, or any OpenAI-compatible server such as a local Ollama), returns the answer plus the real source records. If nothing relevant is found, the provider is not called. If no provider is configured, the page says so (nothing is faked). |
| **Overview** | Real counts, a recent-activity feed across all record types, active projects, recent notes and decisions, quick actions, onboarding for empty accounts. |
| **Legal** | Terms and Conditions, Privacy Policy, Acceptable Use Policy, Cookie Policy and Contact pages, linked from the footer and the sign-up form. The accepted Terms version and time are stored per user. |
| **UI** | Dark-first design system (light and system themes available), brand mark and favicon, restrained motion (page transitions, cascading lists, hover lift, count-up stats, scroll reveals; all disabled when the OS asks for reduced motion), collapsible sidebar, mobile navigation, keyboard shortcut `/` for search, accessible dialogs, forms and focus states, reduced-motion support. Automated test checks 19 pages for horizontal overflow at 320, 375, 430, 768, 1024, 1280 and 1440px. |

## Tech stack

- **Frontend:** Next.js 16 (Pages Router), React 19, TypeScript (strict), Tailwind CSS 4, DaisyUI 5, Lucide icons, React Hook Form + Zod, react-markdown. Tests: Vitest + Testing Library.
- **Backend:** Python, FastAPI, SQLModel/SQLAlchemy 2, Pydantic 2, Alembic, PyJWT, pwdlib (Argon2), psycopg 3, Anthropic SDK. Tests: pytest.
- **Database:** PostgreSQL 17 (the `pgvector/pgvector` image, so vector search can be added later), run with Docker Compose.
- **CI:** GitHub Actions (`.github/workflows/ci.yml`).

## Repository structure

```
Echovault/
├── .github/workflows/ci.yml    # backend tests, frontend checks, end-to-end browser tests
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI app, middleware, error handlers, /health
│   │   ├── core/               # config, security (hashing/JWT), cookies, rate limiting
│   │   ├── db/session.py       # database engine + session dependency
│   │   ├── models/             # SQLModel tables
│   │   ├── schemas/            # request/response shapes
│   │   ├── services/           # business logic (auth, knowledge, projects, search, assistant…)
│   │   ├── ai/providers.py     # AI provider abstraction (Anthropic, OpenAI-compatible)
│   │   └── api/                # dependencies + /api/v1 routers (thin; call services)
│   ├── alembic/                # database migrations
│   ├── tests/                  # pytest suite (uses a separate *_test database)
│   ├── docker-compose.yml      # local PostgreSQL
│   ├── Dockerfile              # production API image
│   ├── requirements.txt / requirements-dev.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── pages/              # routes (Pages Router)
    │   ├── components/         # layout/, ui/, knowledge/, projects/, decisions/
    │   ├── hooks/              # auth, toasts, theme, data loading, URL filters…
    │   ├── lib/api/            # typed API client + endpoint functions
    │   ├── styles/globals.css  # Tailwind + DaisyUI themes (design tokens)
    │   └── test/               # test setup + page tests
    ├── e2e/                    # Playwright end-to-end browser tests
    ├── playwright.config.ts    # starts backend + frontend against the _e2e database
    ├── next.config.ts          # /api/v1 proxy to FastAPI, security headers
    └── .env.example
```

## Prerequisites

- Python 3.12+ (developed on 3.14)
- Node.js 22+
- Docker with Docker Compose

## Quick start (after setup)

Once setup below is done, start everything with one command from the project folder:

```bash
./dev.sh
```

It starts the database, applies migrations, runs the backend (port 8010) and frontend (port 3001) using the project's own Python environment, and prints the address to open: <http://localhost:3001>. Press **Ctrl+C** to stop. Use other ports with `BACKEND_PORT=8000 FRONTEND_PORT=3000 ./dev.sh`.

## Setup

### 1. Configure the backend

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
- Pick a database password and put it in **both** `POSTGRES_PASSWORD` and the two `*DATABASE_URL` lines.
- Generate a JWT secret: `python3 -c "import secrets; print(secrets.token_urlsafe(48))"`

**Which file is read by what?** Docker Compose reads `backend/.env` (only `POSTGRES_PASSWORD` and `POSTGRES_PORT`) when started from `backend/`. FastAPI reads `backend/.env` for everything else. Next.js reads `frontend/.env.local` (optional, see `frontend/.env.example`).

### 2. Start PostgreSQL

```bash
cd backend
docker compose up -d            # starts the database on 127.0.0.1:5433
docker compose ps               # STATUS should say "healthy"
```

Create the separate test database (one time):

```bash
docker exec echovault-nexus-db createdb -U echovault echovault_test
```

> Port **5433** is used because many machines already run a system PostgreSQL on 5432. Change `POSTGRES_PORT` and the URLs together if you need a different port.

### 3. Install the backend and run migrations

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
alembic upgrade head            # creates/updates the tables
```

### 4. Run the backend

```bash
cd backend && source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

- Health check: <http://127.0.0.1:8000/health> → `{"status":"ok","database":"ok"}`
- Interactive API docs: <http://127.0.0.1:8000/docs> (disabled when `ENVIRONMENT=production`)

### 5. Run the frontend

```bash
cd frontend
npm install
npm run dev                     # http://localhost:3000
```

The frontend forwards `/api/v1/*` to `BACKEND_URL` (default `http://127.0.0.1:8000`). If your backend runs elsewhere, create `frontend/.env.local` with `BACKEND_URL=...`.

## Tests and checks

```bash
# Backend (needs the database running; uses echovault_test, never your dev data)
cd backend && source .venv/bin/activate
pytest -q

# Frontend
cd frontend
npm run lint
npm run typecheck
npm test
npm run build
```

The backend test suite migrates the test database down to empty and back up to the latest version on every run, then empties all tables before each test. It refuses to run if the test database name doesn't end in `_test`.

### End-to-end browser tests (Playwright)

These drive a real Chromium browser through the real frontend and backend: registration, sign-in/out, session expiry, creating/editing/deleting notes, projects, decisions, search, cross-user privacy, the unconfigured assistant, and the phone layout.

One-time setup:

```bash
docker exec echovault-nexus-db createdb -U echovault echovault_e2e   # separate database
cd frontend && npx playwright install chromium                       # browser (~120 MB)
```

Run them (Playwright starts the backend on port 8011 and the frontend on 3011 by itself):

```bash
cd frontend
npm run test:e2e               # headless
npm run test:e2e -- --ui       # interactive: watch each step, great for debugging
```

The `echovault_e2e` database is **wiped and re-migrated at the start of every run**. Its URL is taken from `TEST_DATABASE_URL` with `_test` replaced by `_e2e`, or from `E2E_DATABASE_URL`. Playwright refuses to run unless the database name ends in `_e2e`. The e2e backend runs with `RATE_LIMIT_ENABLED=false` because the tests register many accounts. The backend refuses that setting when `ENVIRONMENT=production`.

## Database migrations

```bash
cd backend && source .venv/bin/activate
alembic current                                   # which migration the DB is at
alembic history                                   # list migrations
alembic revision --autogenerate -m "add X"        # after changing models; REVIEW the generated file
alembic upgrade head                              # apply
alembic downgrade -1                              # roll back one step (dev only; may drop data)
alembic check                                     # fails if models and migrations differ
```

The full-text search indexes (`*_fts`) are written by hand in migrations, because autogenerate can't detect expression indexes. `alembic/env.py` tells autogenerate to leave them alone. If you change which columns are searched, update `app/services/search_vectors.py` **and** add a migration that recreates the matching index.

Never use `SQLModel.metadata.create_all()` on a real database. Always use migrations.

## How authentication works

1. On login or registration the backend creates a **session** row and sets three cookies:
   - `ev_access`: a 15-minute JWT (HttpOnly; JavaScript can't read it). It carries the session id.
   - `ev_refresh`: a random 14-day token (HttpOnly, sent only to `/api/v1/auth`). Only its SHA-256 hash is stored.
   - `ev_csrf`: a random value that JavaScript *can* read.
2. Every request checks the JWT **and** that its session hasn't been revoked, so logout takes effect immediately.
3. When the access token expires, the frontend calls `/auth/refresh` once. The refresh token is **rotated** (the old one stops working). Re-use of an old token after a 30-second grace period is treated as theft, and the session is revoked.
4. **CSRF protection:** for every POST/PATCH/DELETE, the frontend copies `ev_csrf` into an `X-CSRF-Token` header. Another website can make your browser send cookies but can't read them, so it can't forge the header. Cookies also use `SameSite=Lax`.
5. The browser only ever talks to the Next.js origin. Next.js proxies `/api/v1` to FastAPI, so the cookies are first-party, with no cross-site cookie or CORS problems.

Why not tokens in `localStorage`? Any script injected into the page could read them. HttpOnly cookies can't be read by scripts.

## Security notes

- Passwords: Argon2 (pwdlib), 10–128 characters, never logged or returned.
- Login errors are generic ("Invalid email or password"), and timing is equalised for unknown emails.
- Ownership is enforced in **every** query. Other users' records return **404**, so IDs can't be probed. UUID primary keys.
- Rate limits: login (8 per email / 30 per IP per 15 min), registration, refresh, password reset, assistant (20 per user per 5 min). The limiter is in-memory, so it's per process (see Limitations).
- Request bodies over 1 MB are rejected. Security headers are set by both FastAPI and Next.js.
- Markdown is rendered without raw HTML; search highlighting never injects HTML.
- Internal errors return a generic message; details go only to the server log.
- `backend/.env` and `frontend/.env*` are git-ignored; only `.env.example` files with placeholders are committed.

## AI assistant configuration

Set in `backend/.env` and restart the backend:

```bash
# Claude via the Anthropic API (paid). AI_MODEL defaults to claude-opus-5-5.
AI_PROVIDER=anthropic
AI_API_KEY=sk-ant-...

# OR a free local model with Ollama (https://ollama.com), no account or payment needed
AI_PROVIDER=openai_compatible
AI_BASE_URL=http://127.0.0.1:11434/v1
AI_MODEL=qwen2.5:1.5b        # `ollama pull qwen2.5:1.5b`; use a bigger model (e.g. llama3.1) if you have the RAM
AI_TIMEOUT_SECONDS=180
```

**What to expect (verified):** with Claude, answers take a few seconds and cite sources as `[1]`, `[2]`. With `qwen2.5:1.5b` on a CPU-only laptop (Intel i5, ~1.2 GB RAM for the model), answers took 13–38 seconds and were grounded in the user's notes and decisions, but the model did not write citation markers (sources are then listed as "retrieved but not cited") and occasionally added a detail not in the notes. Isolation was verified with the real model: another user's note and an archived note were never sent, and an unanswerable question returned the "nothing found" message without calling the model at all. If the Anthropic account has no credit, users now see a clear "out of credit" message.

Only one provider is active at a time. When switching, update `AI_PROVIDER`, `AI_API_KEY`, `AI_BASE_URL` and `AI_MODEL` together. In particular, `AI_BASE_URL` must be empty for Anthropic, and restart the backend.

**Privacy implications:** when a user asks a question, up to `AI_MAX_SOURCES` (default 6) of *that user's* most relevant notes, plus the question, are sent to the configured provider. With `anthropic`, that data leaves your server and is handled under Anthropic's data policies. With a local Ollama, it stays on your machine. The assistant page tells users which provider receives their notes. Nothing is sent when no notes match.

**Prompt-injection defence:** notes are wrapped as escaped `<source>` data, the system prompt tells the model never to follow instructions inside sources, and only records the backend retrieved for that user can appear as sources. Citation numbers that don't match a retrieved source are ignored. This reduces risk but can't make a language model fully immune, so treat answers as suggestions and check the linked sources.

## Legal documents and Terms versions

The legal pages live in `frontend/src/pages/{terms,privacy,acceptable-use,cookies,contact}.tsx`. Business details (operator name, address, contact and privacy emails, governing law) are set with `NEXT_PUBLIC_*` variables in `frontend/.env.local` (see `frontend/.env.example`); unset values appear as visible `[placeholders]`, and configured email addresses become clickable `mailto:` links. Restart `npm run dev` (or rebuild) after changing them.

Sign-up requires ticking an unticked-by-default Terms checkbox. The frontend sends the Terms version it displayed, and the backend stores it with the acceptance time (`users.terms_version`, `users.terms_accepted_at`). When you change the Terms materially:

1. Update `CURRENT_TERMS_VERSION` in `backend/app/core/legal.py`.
2. Update `TERMS_VERSION` and `LEGAL_LAST_UPDATED` in `frontend/src/lib/legal.ts` to match.

The backend rejects sign-ups that accepted an older version, asking the user to reload. Signed-in users whose accepted version is older see a prompt to review and accept the new Terms (with an unticked box); Settings stays reachable so they can download their data or delete their account instead.

## Troubleshooting

| Problem | Fix |
|---|---|
| `password authentication failed for user "echovault"` | The password in `DATABASE_URL` doesn't match the one **inside** the database volume. `POSTGRES_PASSWORD` only applies when the volume is first created. To change it without losing data: `docker exec echovault-nexus-db psql -U echovault -d echovault -c "ALTER ROLE echovault WITH PASSWORD 'new-password'"`, then update `.env`. |
| Backend connects to the wrong database / port 5432 busy | Another PostgreSQL is on 5432. This project uses 5433; check `docker compose ps` shows `127.0.0.1:5433->5432`. |
| `Address already in use` on 8000 or 3000 | Run on other ports: `uvicorn app.main:app --port 8010` and `BACKEND_URL=http://127.0.0.1:8010 npm run dev -- -p 3001`. |
| Frontend API calls hit the wrong server after `next build` | `BACKEND_URL` is baked in **at build time**. Rebuild with the right value: `BACKEND_URL=... npm run build`. |
| Every API call returns 403 "CSRF check failed" | The `ev_csrf` cookie is missing. Sign out and back in. When calling the API by hand, send the cookie value in `X-CSRF-Token`. |
| Build fails with `Duplicate identifier 'PagesPageConfig'` | Leftover type files from `next dev` clash with the production build's. Stop the dev server, delete `frontend/.next`, and build again. |
| Tests fail with "Refusing to run" | Set `TEST_DATABASE_URL` to a database whose name ends in `_test`. |

## Current limitations

- Search is keyword-based (PostgreSQL full-text). Semantic/vector search is not implemented yet. The database image supports pgvector for when it is.
- Assistant conversations aren't saved, and each question is answered independently.
- Rate limiting is per process (in memory). Use a shared store if you run several API instances.
- Email changes take effect immediately after re-entering the password (the old address is notified when SMTP is configured); the new address is not verified by a confirmation link.
- The updated-Terms prompt is enforced in the web app; the API itself does not block requests from users who haven't re-accepted.
- **Legal pages are drafts.** They describe how the software actually works, but every `[bracketed]` item (operator name, address, contact emails, AI/email/hosting providers, retention periods, jurisdiction, minimum age, liability cap) must be filled in, and the text reviewed by a lawyer, before a public launch.
- No file uploads, imports/exports, knowledge graph, or team collaboration.
- End-to-end tests cover the main journeys in Chromium only (not Firefox/Safari), and don't exercise the AI assistant with a real provider or password-reset emails.

## Deployment guide (not yet deployed)

The app has **not** been deployed anywhere. A suitable setup:

1. **Database:** managed PostgreSQL 15+ (pgvector-capable if you'll add vector search). Not publicly reachable; only the API can connect. Use a dedicated least-privilege role for the app and enable automated backups.
2. **Backend:** build `backend/Dockerfile` and run it on any container host. Set environment variables (never bake them into the image): `ENVIRONMENT=production`, `DATABASE_URL`, `JWT_SECRET_KEY` (new random value), `FRONTEND_ORIGIN=https://your-domain`, `COOKIE_SECURE=true`, `TRUST_PROXY_HEADERS=true` (only behind your own proxy), plus optional AI/SMTP settings. Run migrations as a release step **before** starting the new version: `alembic upgrade head`. Health check: `GET /health`.
3. **Frontend:** deploy the Next.js app (Vercel, a Node host or a container) with `BACKEND_URL=https://internal-api-url` set **at build time**. Serve it over HTTPS. Users only ever hit the frontend domain, which proxies `/api/v1`.
4. **Backups:** take regular automated snapshots. For a manual backup: `pg_dump -Fc "$DATABASE_URL" > echovault.dump`. Restore into an empty database: `pg_restore -d "$TARGET_URL" --no-owner echovault.dump`. Test restores periodically.
5. **Operations:** collect API logs (they exclude passwords, tokens and note contents), add error monitoring (e.g. Sentry), keep dependencies updated (`pip list --outdated`, `npm outdated`), and rotate `JWT_SECRET_KEY` if it may have leaked (this signs everyone out).
6. **CI/CD:** the included workflow only runs checks. Add deployment steps only once hosting is chosen.
