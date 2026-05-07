# Phase 1: Infrastructure Setup - Context

**Gathered:** 2025-05-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Deploy application to Cloudflare Workers via Docker + OpenNext, connect to Supabase managed PostgreSQL, configure environment variables for production, and set up CI/CD for automatic deployments.

</domain>

<decisions>
## Implementation Decisions

### Hosting Platform
- **D-01:** Deploy to Cloudflare Workers via Docker + OpenNext
- **D-02:** Cloudflare Workers provides a default `*.workers.dev` subdomain
- **D-03:** Custom domains can be purchased separately and configured in Cloudflare dashboard — the default subdomain is sufficient for initial deployment
- **D-04:** DDoS protection and basic bot protection are included with Cloudflare Workers automatically — no additional configuration needed

### CI/CD Pipeline
- **D-05:** Use GitHub Actions for CI/CD deployment to Cloudflare Workers
- **D-06:** Trigger automatic deployment on push to main branch

### Database Connection
- **D-07:** Use direct Supabase PostgreSQL connection string (standard Prisma format) — no PgBouncer pooling in v1
- **D-08:** Prisma handles connection pooling at the ORM level

### Environment Variables
- **D-09:** Store production environment variables in Cloudflare Workers secrets via `wrangler secret put`
- **D-10:** GitHub Actions will inject secrets at deploy time using Cloudflare Workers secrets

### Agent's Discretion
- Dockerfile entrypoint already exists at `docker/entrypoint.sh` — reuse for Workers build
- Database URL format follows standard Supabase pattern: `postgresql://user:password@host:5432/dbname`
- No NEXT_PUBLIC_ secrets exposed — internal env vars only for database/API connections

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Infrastructure
- `.planning/ROADMAP.md` — Phase 1 requirements and success criteria (INF-01 through INF-04)
- `.planning/REQUIREMENTS.md` — Infrastructure requirements trace
- `.planning/PROJECT.md` — Current stack context (Next.js 14, Prisma, PostgreSQL, NextAuth.js v5)

### Existing Code
- `docker/Dockerfile` — Multi-stage build with Prisma generation, standalone output
- `docker/entrypoint.sh` — Database wait, migration, and seed logic (reuse pattern)
- `prisma/schema.prisma` — PostgreSQL with Prisma ORM (no changes needed)
- `docker-compose.yml` — Local dev setup (reference for env var names)
- `next.config.js` — Standalone output enabled, security headers configured

### No external specs — requirements fully captured in decisions above

</canonical_refs>

<codebase_context>
## Existing Code Insights

### Reusable Assets
- `docker/Dockerfile` — Multi-stage Node 20 build, prisma generate step, standalone output — reuse pattern for OpenNext build
- `docker/entrypoint.sh` — Wait-for-DB + migrate + seed logic — can be adapted for Workers startup
- `docker-compose.yml` — Reference for DATABASE_URL format and environment variable names

### Established Patterns
- Next.js `output: "standalone"` already configured — required for containerized Workers deployment
- Prisma ORM handles connection pooling — no additional pooling layer needed
- Security headers already configured in `next.config.js` — carried forward to Workers

### Integration Points
- Database: Supabase PostgreSQL via `DATABASE_URL` env var — Prisma schema unchanged
- Auth: NextAuth.js v5 — works with Workers edge runtime (check compatibility)
- Environment: `wrangler secrets` for production, `.env.example` for local dev

</codebase_context>

<specifics>
## Specific Ideas

- Cloudflare Workers includes DDoS and bot protection automatically — no additional configuration needed
- Custom domain can be added later via Cloudflare dashboard — use default `*.workers.dev` subdomain for initial deployment
- Workers secrets are managed via `wrangler secret put` CLI command

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

---

*Phase: 1-Infrastructure Setup*
*Context gathered: 2025-05-07*