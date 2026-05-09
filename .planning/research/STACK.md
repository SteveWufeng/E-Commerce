# Stack Research: E-Commerce Hosting & Database

**Domain:** E-commerce platform hosting and database infrastructure
**Researched:** 2025-05-05

## Database Hosting

### Recommended: Supabase (PostgreSQL)

| Option | Price | Free Tier | Why |
|--------|-------|------------|-----|
| **Supabase** | $25/mo (Pro) | 500MB, 2GB bandwidth | Best DX, built-in Auth/Storage, Automigration |
| Neon | $59/mo | 1GB, 1GB bandwidth | Serverless, good for low traffic |
| PlanetScale | $5/mo | No | MySQL-compatible, good scaling |
| DigitalOcean | $15/mo | No | Simple, predictable |
| SelfHost (AWS) | ~$22/mo | No | BYOC, most affordable managed |

**Selection:** Supabase — tightest Next.js integration, auto-v15 schema migration, built-in row-level security, and generous free tier for development.

### Alternative: Railway

- $5 base + usage
- Built-in Postgres, Redis
- No cold starts
- Watch for egress costs

### Alternative: Self-Hosted on VPS

- Hetzner: ~€4/mo (1 vCPU, 2GB RAM)
- DigitalOcean: ~$15/mo (1 vCPU, 1GB RAM)
- Requires DevOps management

## Web Hosting

### Recommended: Cloudflare Workers + OpenNext

| Option | Price | Free Tier | Bandwidth |
|--------|-------|----------|-----------|
| **Cloudflare Pages** | $5/mo (Workers) | Unlimited | Unlimited |
| Vercel | $20/mo Pro | 100GB | 100GB free |
| Railway | ~$7-15/mo | $5 credit | $0.10/GB |
| Render | $7/mo | Free | 100GB |
| Fly.io | $5/mo | No | 1GB |

**Selection:** Cloudflare Workers (via OpenNext adapter) — fastest TTFB, unlimited bandwidth, no cold starts, cheapest at scale.

### Alternative: Railway

- Good full-stack option if also hosting database
- No cold starts, persistent processes
- Usage billing can spike

### Alternative: Self-Hosted Docker

- Deploy anywhere (AWS, GCP, DigitalOcean, Hetzner)
- Full control, predictable cost
- Requires setup: SSL, health checks, deployments

**Selection:** Cloudflare Workers — edge network, unlimited bandwidth, zero cold starts, cheaper at scale than Vercel.

## Docker Build Configuration

### Current Dockerfile Status

- `testonly.Dockerfile` exists (not production-ready)
- Need: Multi-stage build with `standalone` output

### Required Changes

1. Add `output: "standalone"` to `next.config.js`
2. Create production Dockerfile with multi-stage build
3. Add Dockerfile for Cloudflare Workers (OpenNext) OR standard Docker

## Tech Stack Summary

| Layer | Current | Recommended |
|-------|---------|-------------|
| **Database** | Local PostgreSQL | Supabase (managed PostgreSQL) |
| **Hosting** | Local dev | Cloudflare Workers + OpenNext |
| **Deployment** | Manual | GitHub → Cloudflare auto-deploy |
| **Storage** | None | Supabase Storage (images) |

## Migration Path

1. **Database:** Export local PostgreSQL → Supabase (pg_dump/restore)
2. **Hosting:** Dockerize app → Cloudflare Workers OR Railway
3. **Images:** Use Supabase Storage or Cloudflare R2

## Confidence Levels

| Technology | Confidence | Rationale |
|------------|------------|------------|
| Supabase | High | Active community, auto-migrations, Next.js examples |
| Cloudflare Workers | High | Edge runtime mature, OpenNext stable |
| Docker self-host | Medium | More ops work, but portable |

---
*Research completed: 2025-05-05*