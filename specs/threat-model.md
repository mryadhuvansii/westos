# Security Threat Model — Westos Storefront

## Scope
Web storefront, admin panel, customer APIs, inventory service, payment bridge.

## Trust Boundaries
1. **Browser → Frontend**: Client-side code is untrusted. All validation on server.
2. **Frontend → API Gateway**: TLS required. Request ID header `X-Request-ID` mandatory.
3. **API Gateway → Backend**: Internal service calls. JWT authentication. RBAC enforcement.
4. **Backend → Database**: Parameterized queries only. Least-privilege credentials.
5. **Backend → Payment Provider**: HTTPS with webhook HMAC verification. No raw card data.
6. **Backend → Courier/Notification**: API keys in secrets manager only.

## Identified Threats & Mitigations
| # | Threat | Asset | Likelihood | Impact | Mitigation |
|---|--------|-------|------------|--------|------------|
| T1 | Card data theft | Payment data | Low | Critical | Hosted checkout, tokenization, no raw card storage |
| T2 | Account takeover | Customer accounts | Medium | High | JWT short expiry, HttpOnly refresh, rate limiting, 2FA admin |
| T3 | SQL injection | Database | Low | High | Drizzle ORM, parameterized queries |
| T4 | XSS | Storefront | Medium | Medium | CSP, output encoding, next/image |
| T5 | CSRF | Write APIs | Low | High | SameSite cookies, same-origin enforcement |
| T6 | Inventory overselling | Stock | Medium | High | DB transactions, row locking, reserved stock |
| T7 | Privilege escalation | Admin panel | Low | Critical | RBAC `RESOURCE.ACTION.SCOPE`, backend authorization |
| T8 | OTP/SMS abuse | Auth | Medium | Medium | Rate limits, account lock, DLT templates |

## Compliance Requirements
- **PCI DSS**: Use hosted payment checkout. SAQ-A eligibility. No raw card data in logs/DB.
- **GST**: Tax calculation per ADR-005. Invoice generation with GSTIN.
- **Data Privacy**: Customer data export/deletion (GDPR-style). Audit log retention.

## Owner
Security/Architecture

## Target Date
Phase 0, Week 2