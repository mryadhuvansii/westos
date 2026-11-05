# ADR-004: Discount/Coupon Priority & Stacking Rules

## Status: PROPOSED (awaiting Product + Finance sign-off)

## Decision
**Configurable matrix with strict hierarchy fallback**: Admin defines priority per campaign; default hierarchy: Coupon > Product Discount > Lot Discount > Combo (highest applicable discount wins). Maximum discount cap: 50% of MRP. No stacking of multiple coupon codes per order.

## Rationale
Doc 01 §7.21 requires clearly defined priority and stacking rules. Doc 04 §8 requires configurable priority engine.

## Priority Matrix (Default)
| Priority | Discount Type | Stackable With | Max Cap |
|----------|--------------|----------------|---------|
| 1 | Coupon (single per order) | Automatic discounts | 50% MRP |
| 2 | Product Discount | Coupon | 50% MRP |
| 3 | Lot Discount | Coupon | 50% MRP |
| 4 | Combo/Bundle | Coupon | 50% MRP |

## Rules
- Only **one coupon code** per order (no coupon stacking)
- Automatic discounts (product/lot/combo) can combine with one coupon
- Final payable = MRP − (automatic discount + coupon), capped at 50% off MRP
- Buyback benefit **cannot** combine with coupons (exclusivity rule)
- All rules configurable via admin UI (`/admin/discounts`)

## Implementation Implications
- Pricing engine in `pricing` module
- Cart/checkout must apply rules server-side (never trust client-side totals)
- Admin UI for campaign creation with validation
- Discount priority stored in `admin_settings` or dedicated `discounts` table

## Open Items
- [ ] Finance to confirm maximum discount cap % 
- [ ] Product/Finance to define category exclusions
- [ ] Admin discount UI design

## Owner
Product + Finance + Engineering

## Target Date
Phase 0, Week 1 — CRITICAL BLOCKER