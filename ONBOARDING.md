# Project Onboarding

Welcome — this document is intended to help a new team member ramp up quickly on the E-Commerce MVP repository.

---

## Quick Summary

- Repo name: `E-Commerce MVP` (folder: `ecommerce-mvp`)
- Purpose: Small, pickup-focused e-commerce storefront + admin panel
- Core tech: Next.js 14 (App Router), TypeScript, Prisma, PostgreSQL, Tailwind CSS
- Containerized with Docker + docker-compose for local development

---

## First 10 minutes (Fast path)

1. Clone the repo and open in your editor.
2. Start the app with Docker (no host installs required):

```bash
docker compose up -d
docker compose logs -f app
```

3. Seed the database (run from host or inside the app image):

```bash
# If you have node and prisma locally
npm run db:generate
npm run db:migrate
npm run db:seed

# Or using the running compose network (image must be built)
docker compose run --rm app npm run db:seed
```

4. Open http://localhost:3000

Default admin credentials (from `prisma/seed.ts`):

- Email: `admin@store.com`
- Password: `admin123`

---

## Local development (detailed)

Prerequisites:
- Docker & Docker Compose (recommended)
- Node 20+ (optional if you prefer running outside Docker)

Environment variables:
- Copy `.env.example` or inspect `.env` and set production secrets. Important variables:
  - `DATABASE_URL` — Postgres URL when running locally (compose uses service name `postgres`)
  - `NEXTAUTH_URL` — e.g. `http://localhost:3000`
  - `NEXTAUTH_SECRET` — random 32+ char string

Run dev with Docker (recommended):

```bash
# Build & start services
docker compose up -d --build

# Follow app logs
docker compose logs -f app
```

Alternatively, to run without Docker:

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run db:seed
npm run dev
```

Notes:
- The compose file maps Postgres to host port `5433` to avoid conflicts (`5433:5432`). Inside the compose network use `postgres:5432`.
- We generate the Prisma client at build time (`npm run db:generate`) to ensure server builds succeed.

---

## Architecture overview

- Next.js (App Router) for server and client components. The `app/` directory contains pages and API routes.
- API route handlers are in `app/api/*` (e.g. `app/api/products/route.ts`, `app/api/orders/route.ts`).
- Business logic and helpers live in `lib/` (auth, payments, email, db helpers).
- Prisma handles DB access (`prisma/schema.prisma`, `prisma/migrations/`).
- Zustand used for cart client state; guest carts persisted in `localStorage` and can be merged into server-side cart on login.

Key files to look at first:
- `app/(customer)/page.tsx` — storefront data fetching and initial UI.
- `app/api/products/route.ts` — products listing/search.
- `app/api/orders/route.ts` — order creation + admin listing.
- `lib/auth/index.ts` & `app/api/auth/[...nextauth]/route.ts` — NextAuth configuration.
- `prisma/seed.ts` — seed data (admin credentials, products, pickup slots).

---

## Database & Prisma

- Schema: `prisma/schema.prisma`.
- Run migrations locally:

```bash
npx prisma migrate dev --name init
npx prisma generate
npm run db:seed
```

- If you see Prisma errors such as `P2021` (table not found), run migrations and seed again against the running Postgres container before re-starting the app.

---

## Authentication

- NextAuth v5 is used for credential-based login.
- Key config: `lib/auth/index.ts` (we set `trustHost: true` in containerized dev to avoid UntrustedHost warnings).
- Session helpers: `lib/auth/session.ts`.

If you need to change auth settings, update `lib/auth/index.ts` and re-build.

---

## Cart persistence & merge behavior

- Client cart uses Zustand with `persist` to store items in `localStorage` under key `ecommerce-cart`.
- On sign-in, the client posts the local cart to `POST /api/cart` to merge items into the server-side cart associated with the user. The server returns an enriched cart which the client rehydrates into the local store.

If carts are not persisting:
- Check `Set-Cookie` for `cart_session` on guest cart requests.
- Use `docker compose logs app` to inspect server-side errors.

---

## Running tests

- Unit: `npm test`
- Integration: `npm run test:integration`
- E2E: `npm run test:e2e` (Playwright)

Note: CI and tests may require DB & env variables; use Docker compose or check CI config for test DB setup.

---

## Common troubleshooting

- `UntrustedHost` (Auth.js): ensure `NEXTAUTH_URL` is set appropriately; we added `trustHost: true` to reduce friction in dev.
- `Prisma P2021`: run migrations/seed against the DB used by the running app.
- Missing `manifest.json` or `favicon.ico`: these live in `public/` — we added minimal placeholders.
- Edge-runtime warnings for some packages (bcryptjs, jose): these are runtime compile warnings; track usage in server components.

---

## How to contribute (short)

1. Fork + branch naming: `feature/<short-desc>` or `fix/<short-desc>`.
2. Run tests and linters locally.
3. Open a PR with a concise description and add reviewer(s).
4. Add unit tests for new backend logic where applicable and update docs.

See `CONTRIBUTING.md` for more details.

---

## Contacts & Next steps

- Add project leads and on-call contacts here.
- Suggested onboarding tasks for a new dev:
  - Walk through `app/api/products/route.ts` and `prisma/seed.ts`.
  - Run the app with Docker and exercise add-to-cart → sign-in → cart merge.
  - Create a small PR fixing a UI bug or adding a unit test.

---

File references:
- Onboarding doc: `ONBOARDING.md`
- Main server: `app/`
- Auth: `lib/auth/index.ts` and `app/api/auth/[...nextauth]/route.ts`
- Prisma schema: `prisma/schema.prisma`
