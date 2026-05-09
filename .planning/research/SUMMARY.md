# Research Summary: E-Commerce Hosting & Security

**Research completed:** 2025-05-05

## Key Findings

### Database
**Recommendation: Supabase**
- Managed PostgreSQL with Next.js native support
- Auto-migrations, row-level security
- Free tier: 500MB / 2GB bandwidth
- Pro: $25/mo (generous)

**Alternative:** Railway if you want single-platform for app + DB.

### Web Hosting
**Recommendation: Cloudflare Workers (via OpenNext)**
- Edge network: 300+ locations worldwide
- No cold starts, unlimited bandwidth
- Cheapest at scale
- Free tier: unlimited bandwidth

**Alternative:** Railway (if using their DB), Render ($7/mo), or self-hosted Docker on DigitalOcean ($15/mo).

### Security Critical Issues

| Issue | Severity | Priority |
|-------|----------|-----------|
| No rate limiting | High | P0 |
| Next.js version (14.2.0) | High | P0 |
| Middleware-only auth | High | P0 |
| No CSRF protection | Medium | P1 |

**Immediate action:** Upgrade Next.js to 14.2.35+ to patch CVE-2025-29927 (middleware bypass) and CVE-2025-55182 (RCE).

## Table Stakes Features

1. **Per-account order limits** — Prevent slot abuse (requires verified accounts)
2. **Product images** — Admin upload → display in product cards/detail
3. **Security hardening** — Rate limiting, headers, input validation

## Architecture Recommendation

```
Cloudflare Workers (app) + Supabase (database)
```

- Total cost: ~$30-35/mo (assuming moderate traffic)
- Portable: Docker container can move to any platform
- Scalable: Both handle growth

## Confidence

- **Database:** High (Supabase excellent DX)
- **Hosting:** High (Cloudflare Workers mature)
- **Security urgency:** High (current Next.js version has CVEs)

---
*Summary completed: 2025-05-05*