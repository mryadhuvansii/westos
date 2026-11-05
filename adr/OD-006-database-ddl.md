# ADR-006: Database DDL Finalization

## Status: DECIDED

## Decision
**SQLite/D1 for local development and preview; PostgreSQL for production.** Schema defined in `db/schema.ts` with Drizzle migrations. Final consolidated DDL in `drizzle/0003_final_ddl.sql`.

## Tables (Final)
| Table | Purpose |
|-------|---------|
| store_owner | Admin owner identity |
| store_products | Product master (JSON data column) |
| store_settings | Store settings (UPI, buyback toggle) |
| store_audit | Audit log (all mutations) |
| stock_variants | Color-size SKU inventory |
| stock_reservations | Inventory holds |
| stock_reservation_lines | Reservation line items |
| stock_requests | Idempotency/request dedup |
| customers | Customer accounts |
| customer_addresses | Shipping/billing addresses |
| customer_sessions | Auth sessions |
| orders | Order header |
| order_items | Order line items |
| returns | Return requests |
| return_items | Return line items |

## Migration Strategy
- 0000, 0001: Already applied (store + inventory)
- 0002: Customer, orders, returns (applied)
- 0003: Consolidated final DDL + any missing indexes/constraints

## Constraints
- Soft delete preferred for entities with historical references (Doc 01 §3.44)
- Unique constraints: email, SKU, order ID, coupon code, serial code (Doc 01 §34.1)
- Indexes on: email, phone, slug, SKU, serial_code, lot_code, coupon_code, order_number (Doc 01 §3.43)
- Transactional integrity for order creation, inventory reservation, payment confirmation (Doc 01 §3.45)

## Future
- Multi-warehouse: Product Variant → Warehouse → Inventory (Doc 01 §3.48)
- Multi-courier: Order → Shipment → Courier → Tracking Events (Doc 01 §3.49)

## Owner
DBA/Backend Lead

## Target Date
Phase 0, Week 1