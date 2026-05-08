# Phase 2: Security Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-08
**Phase:** 02-security-hardening
**Areas discussed:** Rate limiting strategy, CSP & HSTS headers, Auth validation standardization, x-middleware-subrequest blocking, Next.js upgrade approach

---

## Rate Limiting Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Upstash Redis | Edge-compatible, shared across Workers, persists across cold starts | |
| Cloudflare WAF rate limiting rules | No code changes, configured in dashboard, less flexible | |
| In-app in-memory (Map) | Simplest to implement, won't survive cold starts | ✓ |

**User's choice:** In-app in-memory (Map)
**Notes:** User wanted minimal rate limiting as a safeguard only — order limits in Phase 3 are the primary abuse prevention mechanism. Initially considered removing SEC-02 entirely, settled on keeping it minimal.

| Option | Description | Selected |
|--------|-------------|----------|
| 5 req/min, plain 429 | Strict, matches success criteria exactly | |
| 10 req/min, with Retry-After header | More lenient, better UX | |
| Separate limits for login + signup | Different thresholds per operation | |
| 30 req/min on all auth endpoints | Broad, permissive, high enough for normal use | ✓ |

**User's choice:** 30 req/min on all /api/auth/* routes

---

## CSP & HSTS Headers

| Option | Description | Selected |
|--------|-------------|----------|
| Domain allow-list | Allow self + Cloudflare CDN, no inline scripts, simpler with Next.js | ✓ |
| Nonce-based | Most secure, per-request nonces, breaks Cloudflare injected scripts | |
| Report-only mode first | Deploy in report-only, collect violations, flip to enforce later | |

**User's choice:** Domain allow-list CSP

| Option | Description | Selected |
|--------|-------------|----------|
| 1 year, include subdomains | max-age=31536000; includeSubDomains | ✓ |
| 6 months, no subdomains | Shorter commitment, no subdomain impact | |
| 1 year + preload | Adds preload directive for HSTS preload list | |

**User's choice:** 1 year, include subdomains

| Option | Description | Selected |
|--------|-------------|----------|
| Cross-Origin headers set | Add COOP: same-origin + COEP: require-corp | ✓ |
| Just CSP + HSTS | Only the two missing headers | |
| Full modern set | COOP, COEP, CORP, Clear-Site-Data | |

**User's choice:** Cross-Origin headers (COOP + COEP)

---

## Auth Validation Standardization

| Option | Description | Selected |
|--------|-------------|----------|
| Ensure all API routes use helpers | Audit and fill gaps using existing lib/auth/session.ts | ✓ |
| Create API middleware wrapper | withAuth(fn, role?) abstraction | |
| Extend Next.js middleware to API routes | Broaden matcher to /api/*, add role checks | |

**User's choice:** Audit and ensure all routes use existing helpers

| Option | Description | Selected |
|--------|-------------|----------|
| Add tests to verify | Integration test checking all /api/* routes require auth | ✓ |
| One-time audit only | Fix now, rely on code review | |
| ESLint rule | Custom rule requiring auth() call in route handlers | |

**User's choice:** Integration tests to verify API route protection

---

## x-middleware-subrequest Blocking

| Option | Description | Selected |
|--------|-------------|----------|
| Cloudflare WAF rule | Block in dashboard at edge, zero code changes | ✓ |
| App middleware check | Check header in middleware.ts, return 403 | |
| Both layers | WAF + middleware for defense in depth | |

**User's choice:** Cloudflare WAF rule only

| Option | Description | Selected |
|--------|-------------|----------|
| Just x-middleware-subrequest | Block only that header | ✓ |
| Add edge rate limiting too | Second layer on top of in-app | |
| Add geo-blocking + threat score | Geographic restrictions, threat filtering | |

**User's choice:** Just the x-middleware-subrequest header

---

## Next.js Upgrade Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Exact 14.2.35 | Minimum version patching both CVEs, least risk | ✓ |
| Latest 14.x | All security + bug fixes, slightly higher risk | |
| 14.3.x or 14.x latest | All improvements, more change surface | |

**User's choice:** Pin to 14.2.35

| Option | Description | Selected |
|--------|-------------|----------|
| npm audit fix only | Fix only known CVE dependencies | ✓ |
| Update all deps to latest | Full dependency refresh, highest risk | |
| Next.js only | Only bump Next.js, nothing else | |

**User's choice:** npm audit fix only

---

## Deferred Ideas

None — all discussion stayed within phase scope.
