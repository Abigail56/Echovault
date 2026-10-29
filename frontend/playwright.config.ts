/**
 * End-to-end browser tests: Playwright starts the REAL backend and frontend
 * against a separate database (name must end in "_e2e"), which is wiped and
 * re-migrated at the start of every run. Your development data is never touched.
 *
 *   npm run test:e2e            # run headless
 *   npm run test:e2e -- --ui    # interactive mode (great for debugging)
 */
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

const BACKEND_PORT = Number(process.env.E2E_BACKEND_PORT ?? 8011);
const FRONTEND_PORT = Number(process.env.E2E_FRONTEND_PORT ?? 3011);
const backendDir = path.resolve(__dirname, "../backend");

/** Minimal reader for backend/.env so local runs need no extra setup. */
function backendEnv(key: string): string | undefined {
  const file = path.join(backendDir, ".env");
  if (!existsSync(file)) return undefined;
  const line = readFileSync(file, "utf8")
    .split("\n")
    .find((l) => l.startsWith(`${key}=`));
  return line?.slice(key.length + 1).trim();
}

// Default: the test database URL with "_test" swapped for "_e2e".
const databaseUrl = process.env.E2E_DATABASE_URL ?? backendEnv("TEST_DATABASE_URL")?.replace(/_test$/, "_e2e");
if (!databaseUrl || !/\/[^/]*_e2e$/.test(databaseUrl)) {
  throw new Error("Set E2E_DATABASE_URL to a database whose name ends in _e2e (see README).");
}

const python = process.env.E2E_PYTHON ?? path.join(backendDir, ".venv/bin/python");

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1, // one backend + one database; also keeps memory use low
  retries: process.env.CI ? 1 : 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${FRONTEND_PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      // Reset the e2e database, then start the API.
      command: `${python} -m alembic downgrade base && ${python} -m alembic upgrade head && ${python} -m uvicorn app.main:app --host 127.0.0.1 --port ${BACKEND_PORT}`,
      cwd: backendDir,
      url: `http://127.0.0.1:${BACKEND_PORT}/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        DATABASE_URL: databaseUrl,
        ENVIRONMENT: "test",
        JWT_SECRET_KEY: process.env.JWT_SECRET_KEY ?? "e2e-only-secret-key-that-is-long-enough-123",
        RATE_LIMIT_ENABLED: "false",
        TRUST_PROXY_HEADERS: "true",
        FRONTEND_ORIGIN: `http://127.0.0.1:${FRONTEND_PORT}`,
        // The assistant is tested as "not configured". Email is off unless a
        // Mailpit inbox is provided (E2E_SMTP_HOST + MAILPIT_API), as in CI.
        AI_PROVIDER: "",
        SMTP_HOST: process.env.E2E_SMTP_HOST ?? "",
        SMTP_PORT: process.env.E2E_SMTP_PORT ?? "1025",
        SMTP_FROM: "noreply@echovault.test",
        SMTP_STARTTLS: "false",
        // Uploaded files go to a throwaway folder, never the dev storage folder.
        ATTACHMENTS_DIR: path.join(os.tmpdir(), "echovault-e2e-attachments"),
      },
    },
    {
      command: `npx next dev -p ${FRONTEND_PORT} -H 127.0.0.1`,
      url: `http://127.0.0.1:${FRONTEND_PORT}/login`,
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        BACKEND_URL: `http://127.0.0.1:${BACKEND_PORT}`,
        // Separate build folder so this never clashes with your own `npm run dev`.
        NEXT_DIST_DIR: ".next-e2e",
      },
    },
  ],
});
