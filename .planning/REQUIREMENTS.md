# Requirements: E-Commerce MVP

**Defined:** 2025-05-05
**Core Value:** Customers can browse products and schedule pickup times at their convenience without shipping complexity.

## v1 Requirements

### Infrastructure

- [x] **INF-01**: Deploy application to Cloudflare Workers via Docker + OpenNext
- [ ] **INF-02**: Connect to Supabase managed PostgreSQL database
- [ ] **INF-03**: Configure environment variables for production
- [ ] **INF-04**: Set up CI/CD for automatic deployments

### Security

- [ ] **SEC-01**: Upgrade Next.js to 14.2.35+ to patch CVE-2025-29927 and CVE-2025-55182
- [ ] **SEC-02**: Implement rate limiting on auth API endpoints (login, signup)
- [ ] **SEC-03**: Add route-level authentication validation (not just middleware)
- [ ] **SEC-04**: Configure security headers (CSP, HSTS, X-Frame-Options)
- [ ] **SEC-05**: Block x-middleware-subrequest header abuse at edge

### Order Limits

- [ ] **ORD-01**: User can place maximum 3 orders per day per account
- [ ] **ORD-02**: User can book maximum 1 order per pickup time slot
- [ ] **ORD-03**: Display remaining order limit to authenticated users
- [ ] **ORD-04**: Admin can view all accounts with order count

### Product Images

- [ ] **IMG-01**: Admin can upload product image via admin panel
- [ ] **IMG-02**: Product images display in product detail page
- [ ] **IMG-03**: Product images display in product cards (thumbnail)
- [ ] **IMG-04**: Multiple images support per product (optional for v1)
- [ ] **IMG-05**: Images stored in Supabase Storage or Cloudflare R2

## v2 Requirements

### Enhanced Admin

- [ ] **ADM-01**: Bulk product import/export (CSV)
- [ ] **ADM-02**: Order analytics dashboard
- [ ] **ADM-03**: Customer management view

### Enhanced Security

- [ ] **SEC-06**: CSRF tokens on sensitive forms
- [ ] **SEC-07**: Account lockout after failed login attempts
- [ ] **SEC-08**: Two-factor authentication (2FA)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile app | Web-first, responsive design sufficient |
| Real-time chat | High complexity, not core value |
| Subscriptions | Out of scope for pickup-only model |
| Loyalty programs | Defer to v2+ |
| Shipping | Pickup-only model |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INF-01 | Phase 1 | Complete |
| INF-02 | Phase 1 | Pending |
| INF-03 | Phase 1 | Pending |
| INF-04 | Phase 1 | Pending |
| SEC-01 | Phase 2 | Pending |
| SEC-02 | Phase 2 | Pending |
| SEC-03 | Phase 2 | Pending |
| SEC-04 | Phase 2 | Pending |
| SEC-05 | Phase 2 | Pending |
| ORD-01 | Phase 3 | Pending |
| ORD-02 | Phase 3 | Pending |
| ORD-03 | Phase 3 | Pending |
| ORD-04 | Phase 3 | Pending |
| IMG-01 | Phase 4 | Pending |
| IMG-02 | Phase 4 | Pending |
| IMG-03 | Phase 4 | Pending |
| IMG-04 | Phase 4 | Pending |
| IMG-05 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0 ✓

---
*Requirements defined: 2025-05-05*
*Last updated: 2025-05-05 after research synthesis*