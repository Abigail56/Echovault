#!/usr/bin/env bash
# Start EchoVault Nexus for local development: database, backend and frontend.
#
#   ./dev.sh                      # backend on 8010, frontend on 3001
#   BACKEND_PORT=8000 FRONTEND_PORT=3000 ./dev.sh
#
# Press Ctrl+C once to stop both servers. (The database keeps running;
# stop it with: cd backend && docker compose stop)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PORT="${BACKEND_PORT:-8010}"
FRONTEND_PORT="${FRONTEND_PORT:-3001}"
PYTHON="$ROOT/backend/.venv/bin/python"

fail() { echo "✗ $*" >&2; exit 1; }

[[ -x "$PYTHON" ]] || fail "backend/.venv is missing. Run: cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt"
[[ -f "$ROOT/backend/.env" ]] || fail "backend/.env is missing. Copy backend/.env.example to backend/.env and fill it in (see README)."
[[ -d "$ROOT/frontend/node_modules" ]] || fail "frontend dependencies are missing. Run: cd frontend && npm install"
for port in "$BACKEND_PORT" "$FRONTEND_PORT"; do
  if ss -ltn 2>/dev/null | grep -qE ":$port\b"; then
    fail "Port $port is already in use (an old server may still be running). Stop it, or choose another port, e.g. BACKEND_PORT=8020 ./dev.sh"
  fi
done

echo "→ Starting the database and the local email inbox (Docker)…"
(cd "$ROOT/backend" && docker compose up -d --wait >/dev/null) || fail "Could not start the database. Is Docker running?"

echo "→ Applying database migrations…"
(cd "$ROOT/backend" && "$PYTHON" -m alembic upgrade head >/dev/null)

pids=()
cleanup() {
  echo
  echo "→ Stopping servers…"
  kill "${pids[@]}" 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "→ Starting the backend on http://127.0.0.1:$BACKEND_PORT …"
# FRONTEND_ORIGIN makes links in emails (e.g. password reset) point at this frontend.
(cd "$ROOT/backend" && FRONTEND_ORIGIN="http://localhost:$FRONTEND_PORT" exec "$PYTHON" -m uvicorn app.main:app --reload --host 127.0.0.1 --port "$BACKEND_PORT") &
pids+=($!)

echo "→ Starting the frontend on http://localhost:$FRONTEND_PORT …"
(cd "$ROOT/frontend" && BACKEND_URL="http://127.0.0.1:$BACKEND_PORT" exec npx next dev -p "$FRONTEND_PORT") &
pids+=($!)

# Wait until the backend answers, then print one clear line.
for _ in $(seq 1 60); do
  if curl -sf "http://127.0.0.1:$BACKEND_PORT/health" >/dev/null; then break; fi
  sleep 1
done
echo
echo "✓ EchoVault Nexus is starting. Open http://localhost:$FRONTEND_PORT"
echo "  (the first page load takes a few seconds while it compiles)."
echo "  Emails the app sends (e.g. password resets) appear at http://localhost:8025"
echo "  Press Ctrl+C to stop."
echo
wait -n "${pids[@]}"
