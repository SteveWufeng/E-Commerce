# Features Research: E-Commerce Extensions

**Domain:** E-commerce MVP feature extensions
**Researched:** 2025-05-05

## Table Stakes (Must Have)

### Order Limits
- Per-account daily/weekly order limits
- Per-time-slot order limits (prevent slot hoarding)
- Account verification to enforce limits

### Product Images
- Image upload in admin panel
- Image storage (local or cloud)
- Image display in product cards/detail
- Multiple images per product

### Security Hardening
- Rate limiting on auth endpoints
- CSRF protection
- Secure headers (CSP, HSTS)
- Input validation hardening

## Differentiators

### Enhanced Admin
- Bulk product import/export
- Order analytics
- Customer management
- Inventory alerts

### User Features
- Order history with status
- Save for later
- Wish lists

## Anti-Features

- Mobile app (web-first sufficient)
- Real-time chat (complexity not worth it)
- Subscriptions (out of scope for v1)
- Loyalty programs (defer to v2)

## Feature Dependencies

| Feature | Depends On |
|---------|-----------|
| Order limits | Account system, pickup slots |
| Image upload | Storage solution (Supabase R2) |
| Security audit | All API routes |

## Complexity Notes

- Order limits: Medium - requires DB changes, API validation
- Images: Low-Medium - UI + storage integration
- Security audit: Varies by findings

---
*Research completed: 2025-05-05*