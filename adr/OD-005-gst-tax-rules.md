# ADR-005: GST/Tax Calculation Rules

## Status: PROPOSED (awaiting Finance/Tax Consultant sign-off)

## Decision
**Tax-inclusive pricing** (MRP includes GST). GST calculated at checkout based on HSN/SAC code per product, IGST for inter-state, CGST+SGST for intra-state.

## Rationale
Doc 01 §23, Doc 04 §10, Doc 01 §7.24 mention GST calculation. India legal compliance requirement.

## Tax Configuration
| Aspect | Decision |
|--------|----------|
| Pricing model | Tax-inclusive (MRP includes GST) |
| HSN/SAC mapping | Per-product HSN code field |
| Inter-state | IGST (single tax to center) |
| Intra-state | CGST + SGST (split center/state) |
| Composition scheme | Not supported initially |
| Reverse charge | Not supported initially |
| Export/SEZ zero-rating | Not supported initially |
| Tax-inclusive vs exclusive display | Tax-inclusive display, breakdown at checkout |

## Implementation Implications
- `hsn_code` field on product variants
- `state` on customer address determines inter/intra-state
- GST breakdown on invoice: CGST, SGST, IGST lines
- Tax calculation in pricing engine, server-side only
- Invoice generation with GSTIN

## Open Items
- [ ] Tax consultant to define HSN/SAC codes per product category
- [ ] GSTIN registration and invoice format
- [ ] State vs union territory determination logic

## Owner
Finance/Tax Consultant + Engineering

## Target Date
Phase 0, Week 1-2