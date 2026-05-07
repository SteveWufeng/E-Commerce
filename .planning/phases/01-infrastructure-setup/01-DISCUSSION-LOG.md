# Phase 1: Infrastructure Setup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2025-05-07
**Phase:** 1-Infrastructure Setup
**Areas discussed:** Hosting platform, CI/CD pipeline, Database connection, Environment variables

---

## Hosting Platform

| Option | Description | Selected |
|--------|-------------|----------|
| Cloudflare Workers | Workers + OpenNext (serverless, edge-native, generous free tier) | ✓ |
| Docker container on VPS/ECS | Monolith Docker container, simple but scales differently | |
| Vercel | Serverless Next.js with strong DX, integrated DB storage options | |

**User's choice:** Cloudflare Workers (Recommended)
**Notes:** User confirmed Cloudflare Workers as hosting platform. Asked about default domain name and DDoS/bot protection — both answered: workers.dev subdomain included by default, DDoS and bot protection automatic with Workers.

---

## CI/CD Pipeline

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub Actions | Free tier, native GitHub integration, secrets in repo settings — simple and reliable | ✓ |
| CircleCI | Already using CircleCI for other projects? | |
| Custom script | Already have deployment scripts you want to reuse? | |

**User's choice:** GitHub Actions (Recommended)
**Notes:** GitHub Actions selected for CI/CD. Trigger on push to main branch.

---

## Database Connection

| Option | Description | Selected |
|--------|-------------|----------|
| Direct connection string | Connection string provided by Supabase dashboard. Standard Prisma format. | ✓ |
| With PgBouncer pooling | If you need Prisma connection pooler (higher concurrency scenarios) | |

**User's choice:** Direct connection string (Recommended)
**Notes:** Direct connection string for Supabase PostgreSQL. Prisma handles connection pooling at ORM level — no PgBouncer needed in v1.

---

## Environment Variables

| Option | Description | Selected |
|--------|-------------|----------|
| Cloudflare Workers secrets | Workers KV pairs — simple, no external service needed, works with wrangler CLI | ✓ |
| GitHub Actions secrets | GitHub Actions env vars injected at deploy time | |

**User's choice:** Cloudflare Workers secrets (Recommended)
**Notes:** Use `wrangler secret put` to store production env vars. GitHub Actions injects secrets at deploy time.

---

## Agent's Discretion

- Dockerfile entrypoint already exists at `docker/entrypoint.sh` — reuse for Workers build
- Database URL format follows standard Supabase pattern
- No NEXT_PUBLIC_ secrets exposed — internal env vars only

## Deferred Ideas

None — discussion stayed within phase scope.