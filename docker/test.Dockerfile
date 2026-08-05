# E-Commerce MVP — Test environment image
# This image ONLY provides the toolchain: Node, OS deps, and Playwright
# browsers. The codebase and node_modules are mounted at runtime via
# docker-compose.test.yml, so code changes never require an image rebuild.
# Local host dependencies are never touched.

FROM node:20-bullseye-slim

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Seed project deps (also provides @playwright/test for the install step below).
COPY package.json package-lock.json* ./
RUN npm ci

# Install OS deps + Playwright browsers into the image (environment only).
RUN npx playwright install --with-deps chromium

COPY docker/test-entrypoint.sh /usr/local/bin/test-entrypoint.sh
RUN chmod +x /usr/local/bin/test-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/test-entrypoint.sh"]
