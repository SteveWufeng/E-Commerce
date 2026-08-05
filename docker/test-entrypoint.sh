#!/bin/sh
# Test entrypoint — codebase is bind-mounted, so this runs against the live
# source. Re-syncs deps only when the lockfile changed, then runs the suite.

set -e

echo "[tests] node: $(node --version)  npm: $(npm --version)"

# Sync node_modules with the mounted package.json/package-lock.json.
# The named volume persists deps between runs; only reinstall when the
# lockfile changed or node_modules is missing.
NEEDS_INSTALL=0
if [ ! -d /app/node_modules ] || [ ! -f /app/node_modules/.package-lock.json ]; then
  NEEDS_INSTALL=1
elif [ /app/package-lock.json -nt /app/node_modules/.package-lock.json ]; then
  NEEDS_INSTALL=1
fi

if [ "$NEEDS_INSTALL" = "1" ]; then
  echo "[tests] node_modules out of date — running npm ci..."
  npm ci
else
  echo "[tests] node_modules up to date"
fi

echo "[tests] generating prisma client..."
npx prisma generate

echo "[tests] waiting for database..."
node -e '
  const net = require("net");
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
  const m = url.match(/@([^:/]+):(\d+)/);
  if (!m) { console.error("cannot parse host:port from DATABASE_URL"); process.exit(1); }
  const host = m[1];
  const port = Number(m[2]);
  let tries = 0;
  function attempt() {
    const sock = net.connect({ host, port });
    sock.once("connect", () => { console.log("[tests] database ready"); sock.destroy(); process.exit(0); });
    sock.once("error", () => {
      tries += 1;
      if (tries > 30) { console.error("[tests] database never became ready"); process.exit(1); }
      console.log(`[tests] waiting for db (${tries}/30)...`);
      setTimeout(attempt, 2000);
    });
  }
  attempt();
'

echo "[tests] running migrations..."
npx prisma migrate deploy

echo "[tests] running unit + integration tests (jest)..."
npm test

echo "[tests] building production bundle for E2E (deterministic, no lazy dev-compile)..."
npm run build

echo "[tests] running end-to-end tests (playwright, production build)..."
E2E_PROD=true npm run test:e2e
