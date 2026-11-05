# ADR-016: Multi-Currency Scope

## Status: DEFERRED

## Decision
**INR only at launch.** Multi-currency (USD, etc.) deferred to post-launch phase.

## Rationale
Doc 01 §3.50 mentions future mobile app but no multi-currency requirement. Target market is India (denim focus, UPI payments, GST). Adding multi-currency now increases complexity (exchange rates, localized pricing, tax) without user benefit.

## Implementation
- `currency` field defaults to `INR` on orders
- All prices stored in INR (paise as integers)
- Format: `Intl.NumberFormat('en-IN', {currency: 'INR'})`

## Future
- Currency selector on storefront
- Exchange rate provider integration
- Multi-currency payment methods

## Owner
Product + Engineering

## Target Date
Post-launch