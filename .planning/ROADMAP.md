# Roadmap: E-Commerce MVP

**Created:** 2025-05-05
**Granularity:** Coarse (3-5 phases)
**Mode:** Interactive

## Phases Overview

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | Infrastructure Setup | Deploy to cloud with database | 4 | 4 |
| 2 | Security Hardening | Patch CVEs, add rate limiting | 5 | 5 |
| 3 | Order Limits | Prevent slot abuse | 4 | 4 |
| 4 | Product Images | Admin image upload | 5 | 5 |

**Total: 4 phases | 17 requirements | 18 success criteria**

---

## Phase 1: Infrastructure Setup

**Goal:** Deploy application to cloud hosting with managed database

**Requirements:**
- INF-01: Deploy to Cloudflare Workers via Docker + OpenNext
- INF-02: Connect to Supabase managed PostgreSQL
- INF-03: Configure environment variables for production
- INF-04: Set up CI/CD for automatic deployments

**Success Criteria:**
1. [ ] Application accessible at Cloudflare Workers URL
2. [ ] Database connected (Supabase) and migrations run
3. [ ] Environment variables configured (no NEXT_PUBLIC_ secrets exposed)
4. [ ] Git push triggers automatic deployment

**Plans:** 2 plans

Plans:
- [x] 01-01-PLAN.md — OpenNext + Cloudflare Workers build configuration (INF-01)
- [x] 01-02-PLAN.md — CI/CD pipeline + production environment (INF-02, INF-03, INF-04)

---

## Phase 2: Security Hardening

**Goal:** Patch critical vulnerabilities and add rate limiting

**Requirements:**
- SEC-01: Upgrade Next.js to 14.2.35+ (patch CVE-2025-29927, CVE-2025-55182)
- SEC-02: Implement rate limiting on auth endpoints
- SEC-03: Add route-level auth validation (beyond middleware)
- SEC-04: Configure security headers (CSP, HSTS)
- SEC-05: Block x-middleware-subrequest at edge

**Success Criteria:**
1. [ ] Next.js version shows 14.2.35+ in build output
2. [ ] Login/signup endpoints return 429 after 5 attempts/minute
3. [ ] Protected API routes validate session server-side
4. [ ] Security headers present (curl -I shows HSTS, CSP)
5. [ ] Edge rule blocks x-middleware-subrequest header

---

## Phase 3: Order Limits

**Goal:** Prevent bad actors from abusing pickup slots

**Requirements:**
- ORD-01: Max 3 orders per account per day
- ORD-02: Max 1 order per pickup time slot
- ORD-03: Display remaining order limit to user
- ORD-04: Admin view of accounts with order counts

**Success Criteria:**
1. [ ] User cannot place >3 orders in 24 hours (verified with test account)
2. [ ] User cannot reserve same slot twice (verified with test)
3. [ ] Order limit shown in cart/checkout UI
4. [ ] Admin sees "Orders today" column in orders table

---

## Phase 4: Product Images

**Goal:** Admin can upload and display product images

**Requirements:**
- IMG-01: Admin image upload in admin panel
- IMG-02: Display in product detail page
- IMG-03: Display in product cards (thumbnail)
- IMG-04: Multiple images per product (optional)
- IMG-05: Storage in Supabase Storage or Cloudflare R2

**Success Criteria:**
1. [ ] Admin panel has "Upload Image" button on product edit
2. [ ] Product detail shows main image (>200px)
3. [ ] Product card shows thumbnail (alt: no image placeholder)
4. [ ] Uploaded images persist across sessions
5. [ ] Image storage bucket configured in Supabase/R2

---

## Phase Dependencies

```
Phase 1 (Infra)
    ↓
Phase 2 (Security)     [can be parallel with Phase 1]
    ↓
Phase 3 (Order Limits)  [requires: Phase 1 database]
    ↓
Phase 4 (Images)      [requires: Phase 1 storage]
```

---

## Notes

- **Phase 1** is prerequisite for all others (database + hosting required)
- **Phase 2** can start parallel but deploy needs Phase 1
- **Phase 3** requires database for order counting
- **Phase 4** requires storage solution (Supabase Storage or R2)

---
*Roadmap created: 2025-05-05*
*4 phases, 17 requirements, 18 success criteria*