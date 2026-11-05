# ADR-0002: Security Threat Model

## Status: PROPOSED

## Decision
**Defense-in-depth** with security at every layer: API gateway (TLS, WAF, rate limiting), service layer (authorization, business rules, validation), database (least privilege, encrypted connections).

## Threats & Mitigations
| Threat | Mitigation |
|--------|------------|
| Card data theft | Never store raw card data; tokenization via payment provider |
| Account takeover | JWT access (15-30 min) + HttpOnly refresh tokens, rate limiting, 2FA for admin |
| SQL injection | Parameterized queries (D1 prepared statements), Drizzle ORM |
| XSS | Content Security Policy, output encoding, next/image optimization |
| CSRF | Same-site cookies, same-origin enforcement on write routes |
| Inventory overselling | Database transactional integrity, row-level locking, reserved stock checks |
| Privilege escalation | RBAC `RESOURCE.ACTION.SCOPE`, backend authorization authority |
| OTP abuse | Rate limits (10/min IP), account lock (3 failed = 24hr), OTP limits |

## Compliance
- PCI DSS: Use hosted payment checkout, no raw card data
- GST: Tax calculation per ADR-005
- Data retention: Audit log retains last 100 changes (admin UI), DB retains history

## Owner
Security/Architecture

## Target Date
Phase 0, Week 2