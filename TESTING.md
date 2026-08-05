# Testing

This project has three layers of automated tests. The recommended way to run
them is inside a **Docker container** so the environment is consistent and your
host's dependencies are never touched. Local (host) runs are also supported.

- [Test layers](#test-layers)
- [Docker-based testing (recommended)](#docker-based-testing-recommended)
  - [How it works](#how-it-works)
  - [Commands](#commands)
  - [First run vs. subsequent runs](#first-run-vs-subsequent-runs)
- [Local testing](#local-testing)
- [Writing tests](#writing-tests)
  - [Unit / integration (Jest)](#unit--integration-jest)
  - [E2E (Playwright)](#e2e-playwright)
- [Continuous integration](#continuous-integration)
- [Troubleshooting](#troubleshooting)

---

## Test layers

| Layer | Tool | Location | What it covers |
|-------|------|----------|----------------|
| Unit | Jest + Testing Library | `__tests__/unit/**` | Individual API routes and logic in isolation (deps mocked) |
| Integration | Jest | `__tests__/integration/**` | Multi-step flows (e.g. signup → login → profile → logout) |
| E2E | Playwright | `__tests__/e2e/**` | Real browser interactions against a running app |

Test infrastructure lives in:

- `jest.config.js` — Jest config (via `next/jest`)
- `jest.environment.js` — custom Jest environment (jsdom + Node web globals)
- `__tests__/setup.ts` — Jest setup (Testing Library matchers)
- `__tests__/mocks/next-auth.ts` — mock for `next-auth` (ESM-only in v5 beta)
- `playwright.config.ts` — Playwright config
- `docker-compose.test.yml` — Docker test environment (Postgres + runner)
- `docker/test.Dockerfile` — test image (toolchain only)
- `docker/test-entrypoint.sh` — steps run inside the test container

---

## Docker-based testing (recommended)

### How it works

The test image is an **environment only** — Node 20, the project's npm
dependencies, and Playwright browsers. It contains **no project code**.

When you run the suite, Docker mounts your **live codebase** into the container
as a bind mount, so any edit you make is picked up on the next run **without
rebuilding the image**:

```
your source code  ──bind-mount──▶  /app   (inside container)
node_modules      ──volume──────▶  /app/node_modules
```

- `node_modules` lives in a persistent named volume. It is **never** read from
  or written to your host — your local dependencies stay untouched.
- Build/test artifacts (`.next`, `test-results`, `playwright-report`) are
  written to their own volumes, not your working directory.
- The container runs: Prisma generate → wait for Postgres → run migrations →
  Jest (unit + integration) → `next build` → Playwright E2E (against the
  production build).

The E2E suite runs against a **production build** (`next start`) rather than the
dev server. This makes tests deterministic — no lazy dev-server compilation
flakiness — and matches what ships to production.

### Commands

```bash
# Run the full suite (builds the image on first run)
npm run test:docker

# Force a rebuild of the test environment image
# (only needed after changing package.json deps or the Dockerfile)
npm run test:docker:build

# Run just one layer inside Docker (drop into the container first)
docker compose -f docker-compose.test.yml run --rm tests bash
npm test            # Jest only
npm run test:e2e    # Playwright only
```

### First run vs. subsequent runs

- **First run:** builds the image (a few minutes), installs deps into the
  volume, downloads Playwright browsers into the image, runs the suite.
- **Subsequent runs:** reuse the image, skip `npm ci` when the lockfile hasn't
  changed, reuse the Postgres data and `node_modules` volumes. Much faster.

Dependencies are re-synced automatically **only when `package-lock.json`
changes**. To force a clean dependency reset: `docker compose
-f docker-compose.test.yml down -v` (deletes the volumes).

---

## Local testing

For running tests directly on the host (requires local `npm install` and, for
E2E, Playwright browsers):

```bash
npm test            # Jest unit + integration
npm run test:watch  # Jest watch mode
npm run test:e2e    # Playwright E2E (starts its own dev server)

# E2E against a production build (matches the Docker setup)
npm run build && E2E_PROD=true npm run test:e2e
```

> Note: E2E tests need a database (`DATABASE_URL`) and a running app. The
> Docker workflow wires all of this up for you; for local E2E you must provide
> these yourself (e.g. `docker compose up postgres`).

---

## Writing tests

### Unit / integration (Jest)

- API routes are tested by importing the route handler and calling it with a
  `Request`, then asserting on the returned `Response`.
- External dependencies (database, bcrypt, email, next-auth) are **mocked** —
  see `jest.mock` calls at the top of each test file.
- `next-auth` v5 is ESM-only and can't be transpiled by Jest, so it's replaced
  by `__tests__/mocks/next-auth.ts` via `moduleNameMapper` in `jest.config.js`.
- The custom `jest.environment.js` restores Node's native `Request`/`Response`/
  `Headers`/`fetch` globals, which jsdom drops but Next.js server code needs.

Example:

```ts
import { POST } from "@/app/api/auth/signup/route";

jest.mock("@/lib/db", () => ({
  db: { user: { findUnique: jest.fn(), create: jest.fn() } },
}));

it("creates a user", async () => {
  const res = await POST(new Request("http://localhost/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ firstName: "John", /* ... */ }),
  }));
  expect(res.status).toBe(201);
});
```

### E2E (Playwright)

- Locate elements by role/label/text, **scoped to `main` or `header`** to avoid
  matching repeated links (e.g. a "Sign in" link exists in both the header and
  the form/footer).
- Use `exact: true` where labels overlap (e.g. `getByLabel("Password",
  { exact: true })` so it doesn't match "Confirm Password").
- The app defaults to Spanish. Tests force English via a `beforeEach` that sets
  the locale in `localStorage` so assertions are deterministic.
- Tests run against the **production build** (`E2E_PROD=true`). Config knobs are
  in `playwright.config.ts`.

---

## Continuous integration

The GitHub Actions workflow (`.github/workflows/deploy.yml`) runs `npm run lint`
and `npm test` on every push to `main`, **before** deploying to Railway. If lint
or the Jest suite fails, the deploy is blocked.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `browserType.launch: Executable doesn't exist` | Rebuild the image: `npm run test:docker:build` (browsers live in the image) |
| E2E failures only locally, not in Docker | Run via Docker — local E2E needs a DB + app server |
| Deps not updating after `package.json` change | `docker compose -f docker-compose.test.yml down -v` to reset volumes |
| Jest `Request is not defined` | Make sure `jest.environment.js` is the active `testEnvironment` |
| `next-auth` import errors in Jest | Ensure `__tests__/mocks/next-auth.ts` exists (mapped in `jest.config.js`) |
