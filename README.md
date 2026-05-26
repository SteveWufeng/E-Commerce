# E-Commerce MVP

A modern, mobile-responsive e-commerce platform with **pickup-only** fulfillment and **bank transfer** payment. Customers browse products, place orders, upload payment receipts, and pick up at the store. Admin manages orders with full receipt review and rejection flow.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Order Lifecycle](#order-lifecycle)
- [Payment & Receipt Flow](#payment--receipt-flow)
- [Product Image Gallery](#product-image-gallery)
- [Directory Structure](#directory-structure)
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Local Development](#local-development)
- [Database](#database)
- [API Reference](#api-reference)
- [Admin Panel](#admin-panel)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Database | PostgreSQL 16 |
| ORM | Prisma 5 |
| Authentication | NextAuth.js v5 (Credentials + Google OAuth, JWT sessions) |
| Styling | Tailwind CSS 3.4 |
| Forms | React Hook Form + Zod |
| State Management | Zustand (cart, settings) |
| File Storage | Cloudflare R2 (S3-compatible) |
| Email | Resend (with dev console fallback) |
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
                          Tailwind CSS    (Railway)
```

- **App Router:** Pages in `app/` with route groups for auth, customer, and admin sections.
- **API Routes:** Route handlers in `app/api/*` — each file maps to an endpoint.
- **Middleware:** Auth guard at `/admin/*` (requires ADMIN role) and `/profile` (requires login).
- **Guest Checkout:** Works without an account — customer provides contact info at checkout.
- **File Uploads:** Images uploaded to Cloudflare R2 via admin or customer receipt flow.

---

## Order Lifecycle

```
PLACE ORDER                    CUSTOMER                     ADMIN
───────────                    ────────                     ─────
                                                   
  [Checkout] ──> PENDING ──> Upload Receipt ──> CONFIRMED ──> Mark Ready
                                (receiptImage)                    │
                                     │                     READY_FOR_PICKUP
                                     │                            │
                               [If fake receipt]              Mark Picked Up
                                     │                            │
                               REJECTED ──> Customer          PICKED_UP
                               (rejectionReason)  re-uploads
                                     │
                                     └──> CONFIRMED (re-upload clears reason)
```

### Status Definitions

| Status | Meaning | Who Sets It |
|--------|---------|-------------|
| `PENDING` | Order placed, awaiting receipt upload | System (checkout) |
| `CONFIRMED` | Receipt uploaded, awaiting admin review | Customer (receipt upload) |
| `READY_FOR_PICKUP` | Admin verified receipt, ready for pickup | Admin |
| `PICKED_UP` | Customer collected the order | Admin |
| `REJECTED` | Receipt invalid — customer must re-upload | Admin (with reason) |
| `CANCELLED` | Order cancelled | Admin |

---

## Payment & Receipt Flow

### How it works

1. **Checkout** — Customer fills in contact info and places the order. Only **Bank Transfer** is available as payment method. Customer can optionally upload the receipt immediately during checkout.

2. **Receipt Upload** — On the order detail page, the customer uploads a clear image of their bank transfer receipt. This is sent to Cloudflare R2 and the URL is stored on the order.

3. **Admin Review** — Admin sees the receipt in the order management panel. They can:
   - **Mark Ready** — receipt looks valid, order becomes ready for pickup
   - **Reject** — opens a modal for entering a reason (e.g. "image unclear", "amount incorrect")

4. **Rejection Flow** — The customer sees the rejection reason prominently on their order page and can upload a new receipt. The old rejection reason is cleared.

### Receipt API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/orders/[id]/receipt` | Public (order lookup) | Store receipt image URL, mark order CONFIRMED |

**Request body:**
```json
{ "receiptImage": "https://r2.example.com/products/receipt-123.jpg" }
```

**Response:** Returns updated order with `paymentStatus: COMPLETED`, `status: CONFIRMED`.

---

## Product Image Gallery

The product detail page (`/product/[id]`) supports multiple images per product:

- **Main Image** — Large display area showing the selected image
- **Thumbnail Strip** — All product images shown as thumbnails below the main image
  - **Desktop:** 5-column grid layout
  - **Mobile:** Horizontal scrollable row with 64px thumbnails
- **Active thumbnail** is highlighted with a primary color border and ring
- **Animated transitions** — fade-in effect when switching images (0.3s)
- **Placeholder** — SVG icon shown when `images` array is empty

Products store images as an array of URLs in the `images: String[]` Prisma field. Admin uploads images via the admin product form using the `ImageUpload` component (supports file upload to R2 and external URL input).

---

## Directory Structure

```
.
├── app/
│   ├── (auth)/                     # Auth pages (login, signup)
│   ├── (customer)/                 # Customer-facing pages
│   │   ├── page.tsx                #   Storefront home
│   │   ├── cart/page.tsx           #   Shopping cart
│   │   ├── checkout/page.tsx       #   Bank transfer checkout
│   │   ├── orders/
│   │   │   ├── page.tsx            #   Order history
│   │   │   └── [id]/page.tsx       #   Order detail + receipt upload
│   │   ├── product/[id]/page.tsx   #   Product detail with image gallery
│   │   ├── profile/page.tsx        #   User profile
│   │   └── search/page.tsx         #   Search results
│   ├── admin/
│   │   ├── dashboard/page.tsx      #   Analytics dashboard
│   │   ├── orders/page.tsx         #   Order management + receipt review
│   │   ├── pickups/page.tsx        #   Pickup slot management (legacy)
│   │   ├── products/page.tsx       #   Product CRUD with image upload
│   │   └── settings/page.tsx       #   Store config
│   ├── api/
│   │   ├── analytics/              #   Dashboard metrics
│   │   ├── auth/                   #   Auth endpoints
│   │   ├── cart/route.ts           #   Cart operations
│   │   ├── health/route.ts         #   Health check
│   │   ├── orders/
│   │   │   ├── route.ts            #   Create/list orders
│   │   │   └── [id]/
│   │   │       ├── route.ts        #   Get/update order status
│   │   │       └── receipt/route.ts #   Upload payment receipt
│   │   ├── pickup-slots/           #   Pickup slot CRUD (legacy)
│   │   ├── products/               #   Product CRUD
│   │   ├── settings/route.ts       #   Store settings
│   │   └── upload/route.ts         #   File upload to Cloudflare R2
│   ├── globals.css
│   └── layout.tsx
│
├── components/
│   ├── admin/admin-layout.tsx      #   Admin sidebar
│   ├── cart/                       #   Cart UI components
│   ├── checkout/                   #   Checkout form + order summary
│   ├── layout/                     #   Header, footer, providers
│   ├── product/                    #   Product card, search, banner
│   ├── pickup/pickup-scheduler.tsx #   Legacy pickup slot picker
│   └── ui/                         #   Toast, image-upload
│
├── lib/
│   ├── analytics/index.ts
│   ├── auth/                       #   NextAuth config + session helpers
│   ├── db/index.ts                 #   Prisma client singleton
│   ├── email/index.ts              #   Email via Resend
│   ├── payments/index.ts           #   Payment processor (bank transfer aware)
│   ├── sms/index.ts                #   SMS via Twilio
│   └── utils/index.ts              #   Helpers (formatCurrency, slugify, etc.)
│
├── prisma/
│   ├── schema.prisma               #   11 models, 7 enums
│   ├── migrations/                 #   Migration history
│   └── seed.ts                     #   Seeds: admin, categories, products, slots
│
├── types/index.ts                  # Shared TypeScript types
├── middleware.ts                   # Auth guard middleware
├── docker/                         # Docker config
├── docker-compose.yml              # Local dev: PostgreSQL + app
└── __tests__/                      # Test suites
```

---

## Prerequisites

- **Node.js 20+** (for local development outside Docker)
- **Docker + Docker Compose** (recommended for local PostgreSQL)
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

Edit `.env.local` with your values. At minimum:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Random 32+ char string (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Your app URL (`http://localhost:3000` for dev) |

For local Docker dev:
```
DATABASE_URL="postgresql://ecommerce:secret@localhost:5433/ecommerce_mvp?schema=public"
```

---

## Local Development

### Option A: Full Docker

```bash
docker compose up -d --build
docker compose logs -f app
# Open http://localhost:3000
docker compose down
```

### Option B: Docker PostgreSQL + local Node

```bash
docker compose up -d postgres
npx prisma generate
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Database

### Schema (11 models)

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| `User` | Customers + admins | email, role, isVerified |
| `Category` | Product groupings | name, slug, isActive |
| `Product` | Sellable items | price, stock, images[], categoryId |
| `Cart` | Shopping cart | sessionId (guest) or userId (auth) |
| `CartItem` | Line item in cart | cartId, productId, quantity |
| `Order` | Customer order | status, paymentMethod, receiptImage, rejectionReason |
| `OrderItem` | Line item in order | productName (snapshot), quantity, productPrice |
| `PickupSlot` | Legacy pickup scheduling | date, startTime, endTime, maxOrders |
| `Settings` | Store configuration | taxRate, currencyCode, storeName |
| `Notification` | Email/SMS log | type, recipient, status |
| `AuditLog` | Admin action trail | action, entity, userId |

### Enums

| Enum | Values |
|------|--------|
| `Role` | `CUSTOMER`, `ADMIN` |
| `OrderStatus` | `PENDING`, `CONFIRMED`, `READY_FOR_PICKUP`, `PICKED_UP`, `CANCELLED`, `REJECTED` |
| `PaymentStatus` | `PENDING`, `COMPLETED`, `FAILED`, `REFUNDED` |
| `PaymentMethod` | `CREDIT_CARD`, `GOOGLE_PAY`, `PAYPAL`, `CASH_ON_PICKUP`, `BANK_TRANSFER` |
| `NotificationType` | `ORDER_CONFIRMATION`, `PICKUP_REMINDER`, `ORDER_READY`, `ORDER_CANCELLED` |
| `NotificationStatus` | `PENDING`, `SENT`, `FAILED` |

### Common commands

```bash
npm run db:generate    # Generate Prisma client
npm run db:migrate     # Create migration
npm run db:push        # Push schema directly (dev only)
npm run db:seed        # Seed database
npm run db:studio      # Open Prisma Studio
```

### Seed data

```bash
npm run db:seed
```

Creates:
- **Admin user:** `admin@store.com` / `admin123`
- **9 categories, 20 products** across all categories
- **14 days of pickup slots** (legacy)

---

## API Reference

### Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | Public | Database connectivity check |

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/signup` | Public | Register a new CUSTOMER account |
| POST | `/api/auth/login` | Public | Sign in |
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
| GET | `/api/orders` | Auth | List user's orders (all if admin) |
| GET | `/api/orders/[id]?email=` | Public (with email) | Get order details |
| PUT | `/api/orders/[id]` | Admin | Update order status (PENDING/CONFIRMED/READY_FOR_PICKUP/PICKED_UP/CANCELLED/REJECTED) |
| POST | `/api/orders/[id]/receipt` | Public | Upload receipt image + mark CONFIRMED |

**PUT `/api/orders/[id]` — Rejection:**
```json
{ "status": "REJECTED", "rejectionReason": "Receipt image is unclear. Please upload a clearer photo." }
```

### Uploads

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/upload` | Admin | Upload file to Cloudflare R2 (returns URL) |

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

---

## Admin Panel

Accessible at `/admin` (requires ADMIN role).

### Order Management
- **Table:** All orders with status filter, search by order number/email
- **Actions per status:**

| Order Status | Available Actions |
|-------------|-------------------|
| `PENDING` | Confirm, Cancel |
| `CONFIRMED` | Mark Ready, Reject (with reason modal), Cancel |
| `REJECTED` | Restore (back to CONFIRMED), Cancel |
| `READY_FOR_PICKUP` | Mark Picked Up, Undo |
| `PICKED_UP` | Undo |
| `CANCELLED` | Restore |

- **Detail modal:** Shows order info, receipt link, rejection reason (if any), items, totals
- **Receipt indicator:** 📎 icon on rows with uploaded receipt

### Product Management
- Add/edit products with image upload (file or URL)
- Multiple images per product — stored as array of URLs

---

## Testing

```bash
npm test              # Unit + integration tests (Jest)
npm run test:watch    # Watch mode
npm run test:e2e      # E2E tests (Playwright)
```

---

## Deployment

### Automated Deploy (Railway)

1. Push to GitHub and connect to Railway.
2. Add a **PostgreSQL** plugin — Railway auto-provisions `DATABASE_URL`.
3. Set environment variables in Railway dashboard.
4. Railway auto-detects the Dockerfile and deploys.

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | — | NextAuth JWT signing secret |
| `NEXTAUTH_URL` | Yes* | — | Public URL of the app |
| `MOCK_PAYMENTS` | No | `true` | Toggle mock vs real Stripe |
| `STRIPE_SECRET_KEY` | No | — | Stripe secret key |
| `R2_ENDPOINT` | No | — | Cloudflare R2 endpoint |
| `R2_ACCESS_KEY_ID` | No | — | R2 access key |
| `R2_SECRET_ACCESS_KEY` | No | — | R2 secret key |
| `R2_BUCKET_NAME` | No | — | R2 bucket name |
| `R2_PUBLIC_URL` | No | — | R2 public URL prefix |
| `RESEND_API_KEY` | No | — | Resend API key for email |
| `TWILIO_ACCOUNT_SID` | No | — | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | No | — | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | No | — | Twilio sender number |

*Required for Google OAuth.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `UntrustedHost` from NextAuth | Ensure `NEXTAUTH_URL` is set correctly. Config has `trustHost: true`. |
| `Prisma P2021` (table not found) | Run migrations: `npx prisma migrate deploy` |
| `Prisma P1001` (can't connect) | Verify `DATABASE_URL`. For Docker: `postgresql://ecommerce:secret@postgres:5432/ecommerce_mvp` |
| Receipt upload fails | Check R2 environment variables are set and bucket is accessible |
| Cart not persisting | Check `cart_session` cookie — needs `SameSite=Lax` |
| Migrations fail on Railway | Ensure migration SQL files are committed to git |
