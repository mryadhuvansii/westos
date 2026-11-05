# ADR-001: Payment Gateway Provider Selection

## Status: PROPOSED (awaiting Finance sign-off)

## Decision
**Recommended: Razorpay** as primary payment provider, with Stripe as optional international fallback.

## Rationale
| Criterion | Razorpay | PhonePe | Stripe |
|-----------|----------|---------|--------|
| India market presence | Strong | Strong | Moderate |
| UPI support | Excellent | Excellent | Limited |
| Cards/Wallets/BNPL | Yes | Yes | Yes |
| Developer experience | Good | Good | Excellent |
| Transaction fees | Competitive | Competitive | Higher (international) |
| PCI DSS handling | Hosted checkout | Hosted checkout | Hosted checkout |
| Webhook reliability | Good | Good | Excellent |
| Refund API | Yes | Yes | Yes |
| Sandbox availability | Yes | Yes | Yes |

## Implementation Implications
- Adapter pattern in `server/payment-api.ts` (already exists as separate Node service)
- Raw card data **never** stored in Westos DB or logs (Doc 02 §9.41)
- Payment tokenization preferred (Doc 02 §9.40)
- Webhooks: `POST /api/payments/webhook` with HMAC signature verification
- Idempotency keys required on all payment intents (Doc 03 §1.103)

## Open Items
- [ ] Finance to confirm Razorpay contract & sandbox access
- [ ] Merchant onboarding completion
- [ ] Webhook secret configuration in Cloudflare secrets
- [ ] Transaction fee model sign-off

## Owner
Finance + Engineering Lead

## Target Date
Phase 0, Week 1