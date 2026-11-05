# ADR-003: Email/SMS/WhatsApp Provider Selection

## Status: PROPOSED (awaiting Marketing sign-off)

## Decision
**Recommended: Twilio** for SMS/WhatsApp, **AWS SES** for email. Unified via Gupshup as alternative for all three.

## Rationale
| Channel | Option A | Option B | Notes |
|---------|----------|----------|-------|
| Email | AWS SES (cost-effective) | SendGrid (deliverability) | Transactional + marketing |
| SMS | Twilio (global) | Gupshup/ValueFirst (India DLT) | DLT registration mandatory in India |
| WhatsApp | Twilio | Gupshup / Meta Business API | Requires Business API approval |

## DLT Registration (India Regulatory)
- SMS DLT registration: 2-4 weeks — **must start in Phase 0, Week 1**
- Header/template registration required before any SMS goes out
- Applies to OTP (auth), order updates, marketing

## Implementation Implications
- Adapter pattern in `notifications` module (Doc 02 §7.96)
- Multi-channel notifications with templates, preferences, delivery tracking (Doc 04 §13)
- OTP delivery for auth (Doc 06 §11.158 security event notifications)
- External API secrets in Secrets Manager (Doc 02 §9.46)

## Open Items
- [ ] DLT registration initiation (2-4 week lead time)
- [ ] WhatsApp Business API approval
- [ ] Template management strategy
- [ ] Provider credentials in secrets manager

## Owner
Engineering + Marketing

## Target Date
Phase 0, Week 1-2