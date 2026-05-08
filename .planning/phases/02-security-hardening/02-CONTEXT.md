# Phase 2: Security Hardening - Context

**Gathered:** 2026-05-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Patch critical CVEs (CVE-2025-29927, CVE-2025-55182) via Next.js upgrade, implement minimal rate limiting on auth endpoints, add route-level auth validation, configure security headers (CSP, HSTS, COOP, COEP), and block x-middleware-subrequest header at Cloudflare edge.

</domain>

<decisions>
## Implementation Decisions

### Rate Limiting
- **D-01:** Store rate-limit counters in-memory using a `Map` — no external Redis/Upstash dependency for Phase 2
- **D-02:** Apply 30 requests/minute limit across all `/api/auth/*` routes (login, signup, session, logout, etc.)
- **D-03:** Return HTTP 429 with plain message on exceeded limit — no `Retry-After` header needed
- **D-04:** Rate limiting applies per IP address

### Security Headers
- **D-05:** CSP: domain allow-list approach (`default-src 'self'` with Cloudflare CDN allowed for scripts)
- **D-06:** HSTS: `max-age=31536000; includeSubDomains` (1 year, subdomains included)
- **D-07:** Add `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers
- **D-08:** Keep existing 5 headers (X-DNS-Prefetch-Control, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) — add the 3 new ones on top

### Route-Level Auth Validation
- **D-09:** Audit all API route handlers — ensure each uses `requireAdmin()` (admin routes) or `auth()`/`requireAuth()` (authenticated routes) from `lib/auth/session.ts`
- **D-10:** Add integration test that verifies all `/api/*` routes (except auth endpoints like login/signup) require authentication when accessed without a session
- **D-11:** No new abstraction — reuse existing `lib/auth/session.ts` helpers (`getSession`, `requireAdmin`) as the standard pattern

### Edge Protection
- **D-12:** Block `x-middleware-subrequest` header via Cloudflare WAF custom rule in the Cloudflare dashboard
- **D-13:** No additional WAF rules — Cloudflare's built-in DDoS and bot protection is sufficient

### Dependency Upgrade
- **D-14:** Pin Next.js to exact version 14.2.35 (minimum version patching both CVEs)
- **D-15:** Run `npm audit fix` to address other known vulnerabilities — no blanket dependency upgrades beyond security fixes

### Agent's Discretion
- Exact CSP directive values (e.g., specific Cloudflare CDN domains) determined at plan/implement time
- Rate limiting implementation location: middleware.ts matcher can be broadened or a new utility created
- Integration test structure follows existing patterns in `__tests__/unit/auth/`
- npm audit fix scope: only auto-fixable non-breaking patches

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/ROADMAP.md` — Phase 2 requirements (SEC-01 through SEC-05) and success criteria
- `.planning/REQUIREMENTS.md` — Security requirements trace (SEC-01 through SEC-05)
- `.planning/PROJECT.md` — Current stack context and constraints

### Prior Phase Context
- `.planning/phases/01-infrastructure-setup/01-CONTEXT.md` — Cloudflare Workers deployment, Supabase PostgreSQL, GitHub Actions CI/CD

### Existing Auth Code
- `lib/auth/index.ts` — NextAuth.js v5 configuration (JWT sessions, credentials provider, bcrypt cost 12)
- `lib/auth/session.ts` — Session helpers (`getSession`, `getCurrentUser`, `isAdmin`, `requireAuth`, `requireAdmin`)
- `middleware.ts` — Route protection middleware (page routes only, excludes api/auth from matcher)
- `app/api/auth/[...nextauth]/route.ts` — NextAuth catch-all route handler
- `app/api/auth/signup/route.ts` — Signup endpoint (no rate limiting, no auth check — both correct)

### Security Configuration
- `next.config.mjs` — Current 5 security headers (no CSP, no HSTS), standalone output for Workers

### Tests
- `__tests__/unit/auth/security.test.ts` — Existing security tests (password handling, input validation, session safety)

### No external specs — requirements fully captured in ROADMAP.md and decisions above

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/auth/session.ts` — `requireAdmin()`, `auth()`, `requireAuth()` helpers already used across admin API routes — standardize and extend to all routes
- `lib/auth/index.ts` — NextAuth config with JWT strategy, bcrypt cost 12 — no changes needed for this phase
- `middleware.ts` — Existing route protection middleware — can extend matcher for API route coverage or add rate limiting logic
- `next.config.mjs` — Existing `headers()` function returning security headers — add CSP, HSTS, COOP, COEP here

### Established Patterns
- API route handlers use `auth()` directly or `requireAdmin()` for server-side auth checks — follow same pattern for gap-filling
- Zod schemas for input validation (`signupSchema` pattern) — reuse for any new validation
- Jest unit tests in `__tests__/unit/` — follow existing structure for new auth validation tests

### Integration Points
- Rate limiting: implement in `middleware.ts` or as a utility imported by auth route handlers
- Security headers: add to existing `headers()` function in `next.config.mjs`
- Auth validation: fill gaps in API routes that currently lack `auth()` / `requireAdmin()` calls
- Edge rule: configured in Cloudflare dashboard (WAF → Custom Rules), not in code
- Next.js upgrade: package.json version bump + npm install, no code changes expected (14.2.0 → 14.2.35 is patch-level)

</code_context>

<specifics>
## Specific Ideas

- User emphasized order limits (Phase 3) as the primary abuse prevention mechanism — rate limiting in Phase 2 is a minimal safeguard only
- CSP should not be nonce-based — stick to domain allow-list to avoid breaking Cloudflare's injected scripts
- HSTS preload directive not needed for now — can be added later
- WAF rule approach preferred over code-level x-middleware-subrequest blocking because it keeps security at the edge
- Integration tests for API auth are preferred over ESLint rules for catching unprotected routes

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. User's interest in per-account order limits is already scoped to Phase 3 (Order Limits).

</deferred>

---

*Phase: 02-Security Hardening*
*Context gathered: 2026-05-08*
