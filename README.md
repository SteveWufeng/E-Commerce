# Buhoya — E-Commerce

A mobile-friendly, **pickup-only** e-commerce store built with Next.js 14
(App Router) and PostgreSQL. Customers browse products, check out as a guest or
signed-in user, pay via **Mercantil card** or configurable **custom payment
methods** (bank transfer, Pago Móvil, etc.), and pick up in store. Admins manage
products, orders, payments, users, and chat with customers; the bot sends
Telegram notifications.

---

## Quick Start

```bash
git clone <repo-url> && cd E-Commerse
npm install
cp .env.example .env.local      # then fill in DATABASE_URL + NEXTAUTH_SECRET
```

**Option A — Docker (Postgres + app):**

```bash
docker compose up -d --build    # open http://localhost:3000
docker compose down
```

**Option B — Docker Postgres + local Node:**

```bash
docker compose up -d postgres
npx prisma generate && npx prisma migrate dev && npm run db:seed
npm run dev                     # open http://localhost:3000
```

Host DB URL: `postgresql://ecommerce:secret@localhost:5433/ecommerce_mvp?schema=public`

Seeded admin: `admin@store.com` / `admin123` (change in production).

---

## Common Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm test` | Jest unit + integration tests |
| `npm run test:docker` | Full suite in Docker (Jest + build + Playwright) |
| `npm run db:migrate` | Create/apply a migration (dev) |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:seed` | Seed admin, categories, products |
| `npm run db:studio` | Open Prisma Studio |

---

## Tech Stack

- **Framework:** Next.js 14 (App Router), TypeScript (strict), React 18
- **Data:** PostgreSQL 16 + Prisma 5
- **Auth:** NextAuth v5 (Credentials + optional Google OAuth, JWT sessions)
- **UI:** Tailwind CSS, Zustand (cart/settings), React Hook Form + Zod
- **Storage:** Cloudflare R2 (S3-compatible) · **Email:** Resend · **SMS:** Twilio
- **Notifications:** Telegram bot (per-order updates + customer chat)
- **Payments:** Mercantil card API + configurable payment-method definitions
- **Deploy:** Docker → Railway, GitHub Actions CI/CD

---

## Features

- Guest or authenticated checkout; cart persists for guests and merges on login.
- Dynamic payment methods (admin-defined) with QR code + proof upload
  (image/text/transaction ID); optional built-in Mercantil card checkout.
- Pickup-only fulfillment with order status tracking.
- Admin: dashboard, orders, products, categories, payment methods, proofs,
  users, store settings, Telegram config, and customer messaging.
- Customer email verification + admin-generated password-reset links.
- Telegram order notifications and two-way customer/admin chat.

---

## Roles & Access

| Role | Access |
|---|---|
| `CUSTOMER` | Storefront, own orders/profile |
| `STAFF` | Admin: orders, products, categories, messages, proofs |
| `ADMIN` | Everything, incl. users, settings, payment methods, Telegram |

Route protection lives in `middleware.ts`.

---

## Project Structure

```
app/
  (auth)/        login, signup, reset-password
  (customer)/    storefront, cart, checkout, orders, product, profile, search
  admin/         dashboard, orders, products, categories, payment-methods,
                 users, messages, settings
  api/           route handlers (auth, orders, products, payments, telegram, …)
components/      admin, cart, checkout, layout, product, ui
lib/             auth, db, email, payments, telegram, analytics, i18n, utils
prisma/          schema.prisma (17 models), migrations/, seed.ts
middleware.ts    auth + role route guards
__tests__/       unit + integration tests
```

---

## Environment Variables

Copy `.env.example` → `.env.local`. **Required to run:**

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | JWT signing secret (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | App URL (`http://localhost:3000` locally) |

Optional groups (see `.env.example` for the full, commented list): Cloudflare R2
(`R2_*`), Resend (`RESEND_API_KEY`), Telegram (`TELEGRAM_*`), Mercantil
(`MERCANTIL_*`, `DOMINIO_*`), Twilio (`TWILIO_*`), and `MOCK_PAYMENTS`.

> Secrets are stored in `.env.local` (gitignored) and in Railway for production.
> Never commit them.

---

## Testing

```bash
npm test                   # Jest (unit + integration)
npm run test:docker        # Full reproducible suite incl. E2E
```

See **[TESTING.md](TESTING.md)** for layers, writing tests, CI, and debugging.

---

## Deployment

Push to GitHub → GitHub Actions runs lint, tests, `prisma migrate deploy`, then
`railway up`. Configure production env vars in the Railway dashboard/CLI.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `UntrustedHost` (NextAuth) | Set `NEXTAUTH_URL` correctly (`trustHost: true` is on) |
| `Prisma P2021` (table missing) | `npx prisma migrate deploy` |
| `Prisma P1001` (can't connect) | Check `DATABASE_URL`; Docker host port is `5433` |
| Cart not persisting | `cart_session` cookie needs `SameSite=Lax` |
| Receipt/upload fails | Verify R2 env vars and bucket access |

---

## More Docs

- **[ONBOARDING.md](ONBOARDING.md)** — architecture, auth, cart merge, contribution guide
- **[TESTING.md](TESTING.md)** — test strategy and tooling
- **[SETUP.md](SETUP.md)** — detailed setup session notes
