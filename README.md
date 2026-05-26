# E-Commerce MVP

A modern, mobile-responsive e-commerce platform with **pickup-only** fulfillment. Customers browse products, place orders, and schedule pickup times — no shipping. Built for a single-dealer store with a full admin panel.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Directory Structure](#directory-structure)
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Local Development](#local-development)
- [Database](#database)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Deployment (Railway)](#deployment-railway)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Database | PostgreSQL 16 |
| ORM | Prisma 5 |
| Authentication | NextAuth.js v5 (Credentials provider, JWT sessions) |
| Styling | Tailwind CSS 3.4 + Framer Motion |
| Forms | React Hook Form + Zod |
| State Management | Zustand (cart, settings) |
| Payments | Stripe (mock mode by default, toggleable) |
| Email | Resend (with SMTP fallback) |
| SMS | Twilio (with dev console fallback) |
| Containerization | Docker (multi-stage, standalone output) |
| Deployment | Railway (via Docker or GitHub integration) |
| CI/CD | GitHub Actions |

---

## Architecture Overview

```
[Browser] --> Cloudflare/Railway CDN --> [Next.js App (Docker container)]
                                              |
                                      Next.js App Router
                                     /        |         \
                               Pages        API Routes   Middleware
                                |              |          (auth guard)
                          React Components    |
                                |           Prisma ORM
                          Zustand stores      |
                                |         PostgreSQL
                          Tailwind CSS    (Railway / Supabase)
```

- **App Router:** Pages in `app/` with route groups for auth, customer, and admin sections.
- **API Routes:** Route handlers in `app/api/*` — each file maps to an endpoint.
- **Middleware:** Auth guard at `/admin/*` (requires ADMIN role) and `/profile` (requires login).
- **Server Components:** Most pages are server-rendered; client components use `"use client"`.
- **Guest Checkout:** Works without an account via session-based cart cookies.

---

## Directory Structure

```
.
├── app/                            # Next.js App Router
│   ├── (auth)/                     #   Auth pages (login, signup)
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (customer)/                 #   Customer-facing pages
│   │   ├── page.tsx                #     Storefront home
│   │   ├── cart/page.tsx           #     Shopping cart
│   │   ├── checkout/page.tsx       #     Checkout flow
│   │   ├── orders/                 #     Order history
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── product/[id]/page.tsx   #     Product detail
│   │   ├── profile/page.tsx        #     User profile
│   │   └── search/page.tsx         #     Search results
│   ├── admin/                      #   Admin panel
│   │   ├── dashboard/page.tsx      #     Analytics dashboard
│   │   ├── orders/page.tsx         #     Order management
│   │   ├── pickups/page.tsx        #     Pickup slot management
│   │   ├── products/page.tsx       #     Product CRUD
│   │   └── settings/page.tsx       #     Store config
│   ├── api/                        #   API route handlers
│   │   ├── analytics/              #     Dashboard metrics
│   │   │   ├── route.ts
│   │   │   └── dashboard/route.ts
│   │   ├── auth/                   #     Auth endpoints
│   │   │   ├── [...nextauth]/route.ts
│   │   │   ├── signup/route.ts
│   │   │   ├── login/route.ts
│   │   │   ├── logout/route.ts
│   │   │   ├── me/route.ts
│   │   │   └── admin/create/route.ts
│   │   ├── cart/route.ts           #     Cart operations
│   │   ├── health/route.ts         #     Health check
│   │   ├── orders/                 #     Order operations
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── pickup-slots/           #     Pickup scheduling
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── products/               #     Product CRUD
│   │   │   ├── route.ts
│   │   │   ├── [id]/route.ts
│   │   │   └── categories/route.ts
│   │   └── settings/route.ts       #     Store settings
│   ├── globals.css                 #   Tailwind imports + custom styles
│   └── layout.tsx                  #   Root layout
│
├── components/                     # React components
│   ├── admin/admin-layout.tsx      #   Admin sidebar
│   ├── cart/                       #   Cart UI
│   │   ├── cart-item.tsx
│   │   └── cart-summary.tsx
│   ├── checkout/                   #   Checkout UI
│   │   ├── checkout-form.tsx
│   │   └── order-summary.tsx
│   ├── layout/                     #   App shell
│   │   ├── header.tsx
│   │   ├── footer.tsx
│   │   └── providers.tsx
│   ├── pickup/pickup-scheduler.tsx #   Pickup slot picker
│   ├── product/                    #   Product UI
│   │   ├── category-nav.tsx
│   │   ├── hero-banner.tsx
│   │   ├── product-card.tsx
│   │   └── search-bar.tsx
│   └── ui/toast.tsx                #   Toast notification
│
├── lib/                            # Core libraries
│   ├── analytics/index.ts          #   Dashboard metrics (revenue, profit, trends)
│   ├── auth/                       #   Authentication
│   │   ├── index.ts                #     NextAuth v5 config (credentials, JWT)
│   │   └── session.ts              #     Server helpers (requireAdmin, getSession)
│   ├── db/index.ts                 #   Prisma client singleton
│   ├── email/index.ts              #   Email via Resend (console fallback in dev)
│   ├── payments/index.ts           #   Stripe/mock payment processor
│   ├── sms/index.ts                #   SMS via Twilio (console fallback in dev)
│   └── utils/index.ts              #   Helpers (cn, formatCurrency, slugify)
│
├── hooks/                          # Custom React hooks
│   ├── use-cart.ts                 #   Zustand cart store + localStorage
│   ├── use-currency.ts             #   Multi-currency formatting
│   └── use-settings.ts             #   Store settings context
│
├── prisma/                         # Database
│   ├── schema.prisma               #   Full schema (10 models, 6 enums)
│   ├── migrations/                 #   Migration history
│   └── seed.ts                     #   Seed: admin user, 9 categories, 20 products, slots
│
├── types/index.ts                  # Shared TypeScript types
│
├── docker/                         # Docker config
│   ├── Dockerfile                  #   Multi-stage production build
│   └── entrypoint.sh               #   Entrypoint: migrate + seed + start
│
├── docker-compose.yml              # Local dev: PostgreSQL + app
├── middleware.ts                   # Auth guard middleware
├── next.config.mjs                 # Next.js config (standalone output, headers)
├── tailwind.config.ts              # Tailwind theme (colors, animations)
├── tsconfig.json                   # TypeScript config (strict, @/ path alias)
├── jest.config.js                  # Jest config
│
├── __tests__/                      # Tests
│   ├── unit/auth/                  #   Unit tests (7 files)
│   ├── integration/                #   Integration tests
│   └── e2e/                        #   E2E tests (Playwright)
│
├── .env.example                    # Local dev environment template
├── .env.production.example         # Railway production environment template
├── .github/workflows/deploy.yml    # CI/CD pipeline
└── .gitignore
```

---

## Prerequisites

- **Node.js 20+** (for local development outside Docker)
- **Docker + Docker Compose** (recommended for local PostgreSQL and/or full-stack dev)
- **npm** (v9+) or **bun**

---

## Environment Setup

### 1. Clone and install

```bash
git clone <repo-url> ecommerce-mvp
cd ecommerce-mvp
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values. At minimum, set:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Random 32+ char string (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Your app URL (`http://localhost:3000` for dev) |

For local Docker dev, use:
```
DATABASE_URL="postgresql://ecommerce:secret@localhost:5433/ecommerce_mvp?schema=public"
```

---

## Local Development

### Option A: Full Docker (recommended — everything in containers)

```bash
# Build and start both PostgreSQL and the app
docker compose up -d --build

# Follow app logs
docker compose logs -f app

# Open http://localhost:3000

# Stop everything
docker compose down
```

The entrypoint runs migrations and seeds automatically on first start.

### Option B: Docker PostgreSQL + local Node

```bash
# Start only PostgreSQL
docker compose up -d postgres

# Initialize database
npx prisma generate
npx prisma migrate dev
npm run db:seed

# Start dev server (hot reload)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Database

### Schema

The Prisma schema (`prisma/schema.prisma`) defines 10 models:

| Model | Purpose | Key Relations |
|-------|---------|--------------|
| `User` | Customers + admins | has Orders, Cart, PickupSlots |
| `Category` | Product groupings | has many Products |
| `Product` | Sellable items | belongs to Category, referenced by OrderItems |
| `Cart` | Shopping cart (guest or user) | has many CartItems |
| `CartItem` | Line item in a cart | belongs to Cart |
| `Order` | Customer order | has OrderItems, optionally has PickupSlot |
| `OrderItem` | Line item in an order | belongs to Order, references Product |
| `PickupSlot` | Available pickup time slot | optionally linked to Order + User |
| `Settings` | Single-row store configuration | — |
| `Notification` | Outbound email/SMS log | — |
| `AuditLog` | Admin action audit trail | — |

### Common commands

```bash
# Generate Prisma client (run after schema changes)
npm run db:generate

# Create a new migration
npm run db:migrate

# Push schema directly (dev only, no migration file)
npm run db:push

# Seed database
npm run db:seed

# Open Prisma Studio (GUI)
npm run db:studio
```

### Seed data

```bash
npm run db:seed
```

Creates:
- **Admin user:** `admin@store.com` / `admin123`
- **9 categories:** Dairy & Eggs, Fresh Produce, Bakery, Beverages, Snacks, Pantry Staples, Electronics, Household, Personal Care
- **20 products** across all categories with realistic pricing
- **14 days of pickup slots** (Mon–Sat, 7 slots per weekday, 4 on Saturdays)

---

## Default Credentials

After seeding:
- **Admin:** `admin@store.com` / `admin123` (change in production)

---

## API Reference

### Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | Public | Database connectivity check (used by Docker HEALTHCHECK) |

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/signup` | Public | Register a new CUSTOMER account |
| POST | `/api/auth/login` | Public | Sign in (NextAuth credentials) |
| GET | `/api/auth/me` | Auth | Get current user profile |
| POST | `/api/auth/logout` | Auth | Sign out |
| POST | `/api/auth/admin/create` | Admin | Create a new ADMIN user |

### Products

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/products?q=&category=&featured=&sort=&page=&limit=` | Public | List/search products |
| POST | `/api/products` | Admin | Create a product |
| GET | `/api/products/[id]` | Public | Get product by ID |
| PUT | `/api/products/[id]` | Admin | Update a product |
| DELETE | `/api/products/[id]` | Admin | Delete a product |
| GET | `/api/products/categories` | Public | List all active categories |

### Cart

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/cart` | Public (guest or auth) | Get current cart |
| POST | `/api/cart` | Public (guest or auth) | Add/update items in cart |

### Orders

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/orders` | Public (guest or auth) | Create an order (checkout) |
| GET | `/api/orders` | Auth | List user's orders (or all orders if admin) |
| GET | `/api/orders/[id]` | Auth | Get order details |
| PUT | `/api/orders/[id]` | Admin | Update order status |

### Pickup Slots

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/pickup-slots` | Public | List available pickup slots |
| POST | `/api/pickup-slots` | Admin | Create a pickup slot |
| PUT | `/api/pickup-slots/[id]` | Admin | Update a pickup slot |
| DELETE | `/api/pickup-slots/[id]` | Admin | Delete a pickup slot |

### Settings

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/settings` | Public | Get store settings |
| POST | `/api/settings` | Admin | Update store settings |

### Analytics

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/analytics` | Admin | Dashboard metrics |
| GET | `/api/analytics/dashboard` | Admin | Aggregated dashboard metrics |

### Payment Modes

| Mode | Env Variable | Behavior |
|------|-------------|----------|
| Mock (default) | `MOCK_PAYMENTS=true` | Simulated payments (~95% success rate) |
| Live | `MOCK_PAYMENTS=false` + `STRIPE_SECRET_KEY` | Real Stripe payment processing |

---

## Testing

```bash
# Unit + integration tests (Jest)
npm test

# Watch mode
npm run test:watch

# E2E tests (Playwright)
npm run test:e2e
```

Test files live in `__tests__/`:
- `unit/auth/` — 7 test files (signup, login, logout, admin, middleware, profile, security)
- `integration/` — auth flow integration test
- `e2e/` — Playwright auth E2E spec

---

## Deployment (Railway)

### Automated Deploy (recommended)

1. Push your repository to GitHub.
2. Create a new project in [Railway](https://railway.app) and connect your GitHub repo.
3. Add a **PostgreSQL** plugin — Railway auto-provisions `DATABASE_URL`.
4. Set environment variables in Railway dashboard:
   - `NEXTAUTH_SECRET` — random 32+ char string
   - `NEXTAUTH_URL` — your Railway-generated URL (e.g. `https://yourapp.up.railway.app`)
   - `MOCK_PAYMENTS=true` (or set up Stripe keys)
5. Railway auto-detects the Dockerfile and deploys.

### CI/CD with GitHub Actions

The project includes `.github/workflows/deploy.yml` for Railway:

```yaml
name: Deploy to Railway
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npx prisma generate
      - run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
      - name: Deploy to Railway
        uses: railwayapp/cli-action@v3
        with:
          railwayToken: ${{ secrets.RAILWAY_TOKEN }}
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}
```

To use it:
1. Generate a Railway token: `railway token create`
2. Add it as `RAILWAY_TOKEN` in GitHub → Settings → Secrets and variables → Actions.
3. Add `DATABASE_URL` and `NEXTAUTH_SECRET` as repository secrets.

### Production Environment Variables

See `.env.production.example` for the full list. Key ones:

| Variable | Source | Required |
|----------|--------|----------|
| `DATABASE_URL` | Railway PostgreSQL plugin (auto-provisioned) | Yes |
| `NEXTAUTH_SECRET` | Railway dashboard or CLI | Yes |
| `NEXTAUTH_URL` | Railway app URL | Yes |
| `MOCK_PAYMENTS` | Set to `true` or configure Stripe | Yes |
| `STRIPE_SECRET_KEY` | Stripe dashboard | Only if `MOCK_PAYMENTS=false` |

### Health Check

The app exposes `GET /api/health` which verifies database connectivity. The Dockerfile includes a HEALTHCHECK instruction that polls this endpoint — Railway uses it for container health monitoring.

---

## Contributing

### Branch Naming

- `feature/<short-description>` — new features
- `fix/<short-description>` — bug fixes
- `docs/<short-description>` — documentation only
- `refactor/<short-description>` — code restructuring

### Workflow

1. Create a branch from `main`.
2. Make your changes.
3. Run tests: `npm test`
4. Run TypeScript check: `npx tsc --noEmit`
5. Open a pull request with a concise description of what changed and why.

### Code Standards

- **TypeScript strict mode** is enabled — avoid `any`, prefer proper types.
- **Zod** for all API input validation (both client and server).
- **Server Components** by default; only use `"use client"` when interactivity is needed.
- **Imports** use the `@/` path alias (maps to project root).
- **Tailwind** for all styling — no CSS modules or inline styles.
- **Prisma** for all database access — no raw SQL queries (except `$queryRaw` for health checks).

### Adding a New API Route

1. Create file at `app/api/<resource>/route.ts`.
2. Export named functions for HTTP methods (`GET`, `POST`, `PUT`, `DELETE`).
3. Add `export const dynamic = "force-dynamic"` if the route should not be cached.
4. Use `requireAdmin()` from `@/lib/auth/session` for admin-only endpoints.
5. Use Zod for request body validation.
6. Add the endpoint to the API Reference section in this README.

### Adding a New Database Model

1. Add the model to `prisma/schema.prisma`.
2. Run `npm run db:generate` to update Prisma client.
3. Run `npm run db:migrate` to create a migration.
4. Add seed data to `prisma/seed.ts` if needed.

### PR Checklist

- [ ] Tests pass (`npm test`)
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] No new ESLint warnings (`npm run lint`)
- [ ] API changes are reflected in this README
- [ ] Database migrations are committed (if schema changed)
- [ ] Environment variable changes are documented in `.env.example`

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `UntrustedHost` error from NextAuth | Ensure `NEXTAUTH_URL` is set correctly. The config has `trustHost: true` for containers. |
| `Prisma P2021` (table not found) | Run migrations: `npx prisma migrate deploy` against the database. |
| `Prisma P1001` (can't connect) | Verify `DATABASE_URL` is correct. For Docker, use `postgresql://ecommerce:secret@postgres:5432/ecommerce_mvp`. |
| Cart not persisting across sessions | Check the `cart_session` cookie in browser dev tools. It needs `SameSite=Lax` (set correctly). |
| Docker build fails on `npm run build` | Ensure all dependencies are installed (`npm ci`). Check for TypeScript errors. |
| `next-env.d.ts` is missing from version control | It's now tracked (removed from `.gitignore`). Run `npx next-env` to regenerate. |
| Migrations fail on Railway | Run `npx prisma migrate deploy` locally first. Ensure the migration files are committed to git. |
| Health check fails after deploy | Check the Railway logs. Verify `DATABASE_URL` is set and the database is accessible. |

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | — | NextAuth JWT signing secret |
| `NEXTAUTH_URL` | **Yes (required for Google OAuth)** | — | Public URL of the app — must match exactly what's registered in Google Cloud Console |
| `MOCK_PAYMENTS` | No | `true` | Toggle mock vs real Stripe |
| `STRIPE_SECRET_KEY` | No | — | Stripe secret key (if mock disabled) |
| `RESEND_API_KEY` | No | — | Resend API key for email |
| `SMTP_HOST` | No | — | SMTP fallback host |
| `SMTP_PORT` | No | `587` | SMTP fallback port |
| `SMTP_USER` | No | — | SMTP username |
| `SMTP_PASSWORD` | No | — | SMTP password |
| `TWILIO_ACCOUNT_SID` | No | — | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | No | — | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | No | — | Twilio sender number |
| `NEXT_PUBLIC_GA_ID` | No | — | Google Analytics ID |
| `NEXT_PUBLIC_APP_NAME` | No | `E-Commerce MVP` | App name for emails |
| `NEXT_PUBLIC_STORE_NAME` | No | `My Store` | Store display name |
| `NEXT_PUBLIC_STORE_ADDRESS` | No | — | Store address for emails |
| `NODE_ENV` | No | `development` | Environment mode |
| `PORT` | No | `3000` | Server port |

---

## License

Private — All rights reserved.
