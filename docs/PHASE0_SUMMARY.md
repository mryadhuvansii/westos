# Phase 0: Project Decisions & Architecture Lock — Summary

## Duration: 1-2 weeks | Owner: Architecture/Engineering + Product/Finance

## Decisions Made

| ID | Topic | Decision | Status |
|----|-------|----------|--------|
| OD-001 | Payment Gateway | Razorpay (primary), Stripe (fallback) | PROPOSED |
| OD-002 | Courier Provider | Multi-carrier: Delhivery + BlueDart + Ecom Express | PROPOSED |
| OD-003 | Notification Provider | Twilio (SMS/WhatsApp) + AWS SES (email) | PROPOSED |
| OD-004 | Discount Priority | Configurable matrix, hierarchy: Coupon > Product > Lot > Combo, max 50% off MRP, 1 coupon/order | PROPOSED |
| OD-005 | GST/Tax Rules | Tax-inclusive (MRP includes GST), HSN/SAC per variant, IGST/CGST+SGST | PROPOSED |
| OD-006 | Database DDL | SQLite/D1 local, PostgreSQL prod, Drizzle migrations | DECIDED |
| OD-007 | Search API | Server-side filtering on `/api/store`, dedicated search deferred | PROPOSED |
| OD-016 | Multi-currency | INR only at launch, deferred | DEFERRED |
| OD-018 | 3D Assets | SVG/CSS illustration at launch, GLTF/GLB deferred | PROPOSED |
| OD-021 | Feature Flags | Environment-based in `store_settings`, admin toggle | PROPOSED |

## Supporting ADRs
- ADR-0000: CI/CD Pipeline (GitHub Actions → Cloudflare Workers)
- ADR-0001: Observability (Loki + Prometheus + Grafana + Jaeger + Alertmanager)
- ADR-0002: Threat Model (Defense-in-depth, PCI DSS, RBAC)

## Exit Criteria Checklist
- [ ] All ADRs signed by relevant owners
- [ ] Payment provider contract + sandbox access
- [ ] Courier provider contracts + API docs
- [ ] Email/SMS/WhatsApp provider accounts + DLT registration started
- [ ] Discount priority matrix signed off by Finance
- [ ] GST/tax rules signed off by Tax Consultant
- [ ] Database DDL finalized (0003 migration ready)
- [ ] CI/CD pipeline configured
- [ ] Observability stack spec
- [ ] Threat model reviewed

## Next Steps After Phase 0
1. Phase 1: Foundation (infrastructure, PostgreSQL, Redis, R2, CDN)
2. Phase 2: Customer auth (already implemented in code)
3. Phase 3-4: Catalogue & storefront (already implemented in code)
