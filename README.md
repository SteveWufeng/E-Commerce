# E-Commerce MVP

A modern, mobile-responsive e-commerce platform with pickup scheduling. Built for a single-dealer store where customers browse, order, pay, and schedule pickup times — no shipping.

## Features

### Customer-Facing
- **Product Browsing** — Grid layout with search, category filters, and featured products
- **Product Detail** — Full product info, image gallery, stock status, quantity selector
- **Shopping Cart** — Persistent cart (localStorage), quantity controls, real-time totals
- **Checkout** — Guest checkout or authenticated, multi-step form with validation
- **Pickup Scheduling** — Choose from available time slots with real-time availability
- **Mock Payments** — Credit Card, Google Pay, PayPal, Cash on Pickup (simulated)
- **Order Tracking** — View order history and status updates
- **Responsive Design** — Optimized for PC, tablet, iPhone, and Android

### Admin Panel
- **Dashboard** — Revenue, orders, profit, top products, daily sales trends
- **Product Management** — CRUD operations, stock tracking, category assignment
- **Order Management** — View, confirm, mark ready, cancel orders
- **Pickup Management** — Create/manage time slots, view bookings
- **Settings** — Store info, tax rate, payment methods, notification config

### Security & Performance
- **PostgreSQL** — ACID-compliant, parameterized queries via Prisma ORM
- **Bcrypt Password Hashing** — No plaintext passwords
- **Zod Validation** — All inputs validated server-side and client-side
- **Security Headers** — X-Frame-Options, CSP, HSTS via Next.js config
- **Audit Logging** — All admin actions tracked
- **Rate Limiting Ready** — Architecture supports middleware rate limiting

### Notifications
- **Email** — Order confirmation, ready-for-pickup (Resend API or SMTP)
- **SMS** — Order confirmation, ready-for-pickup (Twilio)
- **Dev Mode** — Graceful fallback to console logging when providers not configured

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | NextAuth.js v5 (credentials + guest) |
| Styling | Tailwind CSS + Framer Motion |
| Forms | React Hook Form + Zod |
| State | Zustand (cart) |
| Payments | Stripe (mock mode) |
| Email | Resend |
| SMS | Twilio |
| Deployment | Docker (standalone) |

## Project Structure

```
ecommerce-mvp/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth pages (login, signup)
│   ├── (customer)/               # Customer-facing pages
│   │   ├── page.tsx              # Home/storefront
│   │   ├── product/[id]/         # Product detail
│   │   ├── cart/                 # Shopping cart
│   │   ├── checkout/             # Checkout flow
│   │   ├── search/               # Search results
│   │   └── orders/               # Order history
│   ├── admin/                    # Admin panel
│   │   ├── dashboard/            # Analytics dashboard
│   │   ├── products/             # Product CRUD
│   │   ├── orders/               # Order management
│   │   ├── pickups/              # Pickup slot management
│   │   └── settings/             # Store settings
│   └── api/                      # API routes
│       ├── auth/                 # Authentication
│       ├── products/             # Product CRUD
│       ├── orders/               # Order creation
│       ├── pickup-slots/         # Pickup scheduling
│       └── analytics/            # Dashboard metrics
├── components/                   # React components
│   ├── ui/                       # Reusable UI primitives
│   ├── layout/                   # Header, footer, providers
│   ├── product/                  # Product card, search, categories
│   ├── cart/                     # Cart items, summary
│   ├── checkout/                 # Checkout form, order summary
│   ├── pickup/                   # Pickup scheduler
│   └── admin/                    # Admin layout, tables
├── lib/                          # Core libraries
│   ├── db/                       # Database client
│   ├── auth/                     # Auth configuration
│   ├── payments/                 # Payment processing
│   ├── email/                    # Email service
│   ├── sms/                      # SMS service
│   ├── analytics/                # Dashboard metrics
│   └── utils/                    # Helper functions
├── hooks/                        # Custom React hooks
├── types/                        # TypeScript type definitions
├── prisma/                       # Database schema & migrations
│   └── schema.prisma             # Full schema with indexes
├── docker/                       # Docker configuration
│   └── Dockerfile                # Multi-stage build
├── docker-compose.yml            # Local dev with PostgreSQL
└── __tests__/                    # Test suites
    ├── unit/
    ├── integration/
    └── e2e/
```

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- npm or bun

### Local Development

1. **Clone and install:**
   ```bash
   cd ecommerce-mvp
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

3. **Start PostgreSQL (Docker):**
   ```bash
   docker-compose up -d postgres
   ```

4. **Initialize database:**
   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

5. **Start dev server:**
   ```bash
   npm run dev
   ```

6. **Open** [http://localhost:3000](http://localhost:3000)

### Docker Deployment

```bash
# Build and run everything
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop
docker-compose down
```

## Default Credentials

After seeding:
- **Admin:** `admin@store.com` / `admin123`

## Payment Modes

| Mode | Environment Variable | Behavior |
|------|---------------------|----------|
| Mock (default) | `MOCK_PAYMENTS=true` | Simulated payments, 95% success rate |
| Real | `MOCK_PAYMENTS=false` + `STRIPE_SECRET_KEY` | Stripe payment processing |

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/products` | Public | List/search products |
| POST | `/api/products` | Admin | Create product |
| GET | `/api/products/categories` | Public | List categories |
| POST | `/api/orders` | Public | Create order + payment |
| GET | `/api/orders` | Admin | List all orders |
| PUT | `/api/orders/[id]` | Admin | Update order status |
| GET | `/api/pickup-slots` | Public | List available slots |
| POST | `/api/pickup-slots` | Admin | Create pickup slot |
| GET | `/api/analytics/dashboard` | Admin | Dashboard metrics |
| POST | `/api/auth/signup` | Public | Register new user |
| POST | `/api/auth/login` | Public | Authenticate user |

## Environment Variables

See `.env.example` for the full list of required and optional environment variables.

## Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

## License

Private — All rights reserved.
