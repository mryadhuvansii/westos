# ADR-001: Payment Gateway Provider Selection

## Status: DECIDED — PhonePe

## Decision
**PhonePe** selected as primary payment gateway for UPI, cards, wallets, and BNPL. Sandbox first, production after merchant onboarding.

## Rationale
| Criterion | PhonePe |
|-----------|---------|
| India market presence | Strong |
| UPI support | Excellent (native) |
| Cards/Wallets/BNPL | Yes |
| Developer experience | Good |
| Transaction fees | Competitive |
| PCI DSS handling | Hosted checkout |
| Webhook reliability | Good |
| Refund API | Yes |
| Sandbox availability | Yes |

## Implementation Implications
- Adapter pattern in `server/payment-api.ts` (PhonePe-specific)
- Raw card data **never** stored in Westos DB or logs (Doc 02 §9.41)
- Payment tokenization preferred (Doc 02 §9.40)
- Webhooks: `POST /api/payment/webhook` with PhonePe checksum verification
- Idempotency keys required on all payment intents (Doc 03 §1.103)
- Environment variables: `PHONEPE_MERCHANT_ID`, `PHONEPE_SALT_KEY`, `PHONEPE_SALT_INDEX`, `PHONEPE_ENVIRONMENT` (Cloudflare secrets, never committed to Git)

## Open Items
- [ ] PhonePe Merchant Dashboard access & sandbox credentials
- [ ] Merchant onboarding completion
- [ ] Webhook secret configuration in Cloudflare secrets
- [ ] Transaction fee model sign-off

## Owner
Finance + Engineering Lead

## Target Date
Phase 0, Week 1