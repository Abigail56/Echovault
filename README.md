# EchoVault Nexus

A personal knowledge and project-intelligence workspace. Capture notes, group them into projects, record decisions with their reasoning, search everything, and (optionally) ask an AI assistant questions that are answered **only from your own notes, with links to the sources**.

## Features

| Area | What works today |
|---|---|
| **Accounts** | Register, sign in, sign out, sign out of all devices, profile editing, password change. Argon2 password hashing. HttpOnly cookie sessions with refresh-token rotation, server-side revocation and CSRF protection. Rate-limited auth endpoints. |
| **Password reset** | Full email flow (single-use, expiring, hashed tokens; no account enumeration). Needs SMTP settings; without them, the UI says it isn't configured. |
| **Knowledge Vault** | Create, read, update, delete. Markdown editor with preview (rendered safely, no raw HTML). Tags, project links, keyword search, tag/project filters, sorting, pagination, unsaved-changes warning. |
| **Projects** | CRUD, statuses (active / on hold / completed / archived), linked knowledge and decisions, counts. Deleting a project keeps its notes and decisions. |
| **Decision Journal** | Context, decision, reasoning, alternatives, expected and actual outcome. Project links, search, filters. |
| **Global search** | PostgreSQL full-text keyword search (prefix matching, stemming, ranking) across knowledge, tags, projects and decisions, grouped by type with highlighted excerpts. This is **keyword** search, not semantic search. |
| **AI assistant** | Retrieves your matching notes, sends them to a configured provider (Claude, or any OpenAI-compatible server such as a local Ollama), returns the answer plus the real source records. If nothing relevant is found, the provider is not called. If no provider is configured, the page says so (nothing is faked). |
| **Dashboard** | Real counts, recent knowledge/projects/decisions, quick actions, onboarding for empty accounts. |
| **UI** | Light/dark/system theme, collapsible sidebar, mobile navigation, keyboard shortcut `/` for search, accessible dialogs, forms and focus states, reduced-motion support. Checked at 360–1440px widths. |

## Tech stack

- **Frontend:** Next.js 16 (Pages Router), React 19, TypeScript (strict), Tailwind CSS 4, DaisyUI 5, Lucide icons, React Hook Form + Zod, react-markdown. Tests: Vitest + Testing Library.
- **Backend:** Python, FastAPI, SQLModel/SQLAlchemy 2, Pydantic 2, Alembic, PyJWT, pwdlib (Argon2), psycopg 3, Anthropic SDK. Tests: pytest.
- **Database:** PostgreSQL 17 (the `pgvector/pgvector` image, so vector search can be added later), run with Docker Compose.
- **CI:** GitHub Actions (`.github/workflows/ci.yml`).

## Repository structure

```
Echovault/
├── .github/workflows/ci.yml    # backend tests + frontend lint/typecheck/test/build
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
    ├── next.config.ts          # /api/v1 proxy to FastAPI, security headers
    └── .env.example
```

## Prerequisites

- Python 3.12+ (developed on 3.14)
- Node.js 22+
- Docker with Docker Compose

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

# OR a free local model with Ollama (https://ollama.com): `ollama pull llama3.1`
AI_PROVIDER=openai_compatible
AI_BASE_URL=http://127.0.0.1:11434/v1
AI_MODEL=llama3.1
```

**Privacy implications:** when a user asks a question, up to `AI_MAX_SOURCES` (default 6) of *that user's* most relevant notes, plus the question, are sent to the configured provider. With `anthropic`, that data leaves your server and is handled under Anthropic's data policies. With a local Ollama, it stays on your machine. The assistant page tells users which provider receives their notes. Nothing is sent when no notes match.

**Prompt-injection defence:** notes are wrapped as escaped `<source>` data, the system prompt tells the model never to follow instructions inside sources, and only records the backend retrieved for that user can appear as sources. Citation numbers that don't match a retrieved source are ignored. This reduces risk but can't make a language model fully immune, so treat answers as suggestions and check the linked sources.

## Troubleshooting

| Problem | Fix |
|---|---|
| `password authentication failed for user "echovault"` | The password in `DATABASE_URL` doesn't match the one **inside** the database volume. `POSTGRES_PASSWORD` only applies when the volume is first created. To change it without losing data: `docker exec echovault-nexus-db psql -U echovault -d echovault -c "ALTER ROLE echovault WITH PASSWORD 'new-password'"`, then update `.env`. |
| Backend connects to the wrong database / port 5432 busy | Another PostgreSQL is on 5432. This project uses 5433; check `docker compose ps` shows `127.0.0.1:5433->5432`. |
| `Address already in use` on 8000 or 3000 | Run on other ports: `uvicorn app.main:app --port 8010` and `BACKEND_URL=http://127.0.0.1:8010 npm run dev -- -p 3001`. |
| Frontend API calls hit the wrong server after `next build` | `BACKEND_URL` is baked in **at build time**. Rebuild with the right value: `BACKEND_URL=... npm run build`. |
| Every API call returns 403 "CSRF check failed" | The `ev_csrf` cookie is missing. Sign out and back in. When calling the API by hand, send the cookie value in `X-CSRF-Token`. |
| Tests fail with "Refusing to run" | Set `TEST_DATABASE_URL` to a database whose name ends in `_test`. |

## Current limitations

- Search is keyword-based (PostgreSQL full-text). Semantic/vector search is not implemented yet. The database image supports pgvector for when it is.
- Assistant conversations aren't saved, and each question is answered independently.
- Rate limiting is per process (in memory). Use a shared store if you run several API instances.
- Email address changes and account deletion aren't implemented.
- No file uploads, imports/exports, knowledge graph, or team collaboration.
- Frontend tests cover the API client, form utilities and the login page. Other pages were verified by end-to-end smoke tests and screenshots, not automated browser tests.

## Deployment guide (not yet deployed)

The app has **not** been deployed anywhere. A suitable setup:

1. **Database:** managed PostgreSQL 15+ (pgvector-capable if you'll add vector search). Not publicly reachable; only the API can connect. Use a dedicated least-privilege role for the app and enable automated backups.
2. **Backend:** build `backend/Dockerfile` and run it on any container host. Set environment variables (never bake them into the image): `ENVIRONMENT=production`, `DATABASE_URL`, `JWT_SECRET_KEY` (new random value), `FRONTEND_ORIGIN=https://your-domain`, `COOKIE_SECURE=true`, `TRUST_PROXY_HEADERS=true` (only behind your own proxy), plus optional AI/SMTP settings. Run migrations as a release step **before** starting the new version: `alembic upgrade head`. Health check: `GET /health`.
3. **Frontend:** deploy the Next.js app (Vercel, a Node host or a container) with `BACKEND_URL=https://internal-api-url` set **at build time**. Serve it over HTTPS. Users only ever hit the frontend domain, which proxies `/api/v1`.
4. **Backups:** take regular automated snapshots. For a manual backup: `pg_dump -Fc "$DATABASE_URL" > echovault.dump`. Restore into an empty database: `pg_restore -d "$TARGET_URL" --no-owner echovault.dump`. Test restores periodically.
5. **Operations:** collect API logs (they exclude passwords, tokens and note contents), add error monitoring (e.g. Sentry), keep dependencies updated (`pip list --outdated`, `npm outdated`), and rotate `JWT_SECRET_KEY` if it may have leaked (this signs everyone out).
6. **CI/CD:** the included workflow only runs checks. Add deployment steps only once hosting is chosen.
