# Architecture Research: E-Commerce Hosting

**Domain:** System architecture and deployment
**Researched:** 2025-05-05

## Current Architecture

```
┌─────────────────┐
│   Next.js 14    │  App Router
├─────────────────┤
│   API Routes    │  /app/api/*
├─────────────────┤
│   NextAuth v5   │  Auth (credentials)
├─────────────────┤
│    Prisma       │  PostgreSQL ORM
├─────────────────┤
│  PostgreSQL     │  Local dev
└─────────────────┘
```

## Cloud-Ready Architecture

### Database Layer
- Supabase (managed PostgreSQL)
- Migrations via Prisma CLI
- Connection pooling

### Application Layer
- Docker with multi-stage build
- Output: `standalone` for minimal image
- Environment variables for config

### Hosting Options

| Platform | Docker Support | Database | Cost |
|----------|----------------|---------|------|
| **Cloudflare Workers** | Via OpenNext | External | $5/mo |
| **Railway** | Native | Built-in | ~$10/mo |
| **Render** | Docker | External | $7/mo |
| **AWS ECS** | Docker | RDS | ~$30/mo |

## Build Order

1. **Database first** — Supabase setup + migrations
2. **Dockerize** — Multi-stage Dockerfile
3. **Deploy** — Cloudflare Workers OR Railway
4. **Migrate data** — pg_dump → Supabase

## Component Boundaries

```
[User] → [CDN/Edge] → [Next.js (Docker)]
                           ↓
                      [API Routes]
                           ↓
                      [Prisma ORM]
                           ↓
                      [Supabase DB]
```

Data flows: User → Edge → App → Prisma → Supabase

## Confidence Levels

| Component | Confidence | Rationale |
|-----------|------------|------------|
| Supabase | High | Next.js native support, auto-migrations |
| Cloudflare Workers | High | OpenNext stable, edge network |
| Docker | High | Standard Next.js pattern |

---
*Research completed: 2025-05-05*