# E-Commerce MVP

## What This Is

A modern, mobile-responsive e-commerce platform with pickup scheduling. Customers browse, order, pay, and schedule pickup times with no shipping. Built on Next.js 14, PostgreSQL, Prisma ORM, and NextAuth.js.

## Core Value

Customers can browse products and schedule pickup slots at their convenience. The store owner can manage products, orders, and pickup schedules through an admin panel.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Host on cloud service with managed PostgreSQL database
- [ ] Deploy via Docker to cloud hosting (Cloudflare/AWS)
- [ ] Implement per-account order limits to prevent slot abuse
- [ ] Conduct security audit and fix vulnerabilities
- [ ] Add product image upload to admin panel

### Out of Scope

- Mobile app — Web-first, responsive design sufficient
- Shipping — Pickup only model
- Real-time chat — Out of budget

## Context

**Current State:**
- Next.js 14 app with App Router using TypeScript
- PostgreSQL with Prisma ORM
- NextAuth.js v5 (credentials + guest auth)
- Product browsing, cart, checkout, pickup scheduling implemented
- Admin panel: dashboard, products, orders, pickups, settings
- Mock Stripe payments, Resend email, Twilio SMS
- No product images currently (only tags/placeholders)

**Platform:** Linux x64 server deployment

## Constraints

- **Budget**: Affordable cloud hosting (need research)
- **Scalability**: Must handle growth from current state
- **Security**: Prevent abuse, protect user data

## Key Decisions

| Decision | Rationale | Outcome |
|----------|---------|---------|
| Pickup-only model | No shipping complexity, local delivery | — Pending |
| PostgreSQL | ACID compliance, relational data | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2025-05-05 after project initialization*