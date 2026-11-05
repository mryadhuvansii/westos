-- Final consolidated DDL for Phase 0 lock
-- Applies on top of 0000, 0001, 0002. Idempotent where possible.

-- Add any missing indexes for frequently queried fields (Doc 01 §3.43)
CREATE INDEX IF NOT EXISTS `idx_orders_customer` ON `orders` (`customer_id`);
CREATE INDEX IF NOT EXISTS `idx_orders_status` ON `orders` (`status`);
CREATE INDEX IF NOT EXISTS `idx_orders_order_number` ON `orders` (`order_number`);
CREATE INDEX IF NOT EXISTS `idx_order_items_order` ON `order_items` (`order_id`);
CREATE INDEX IF NOT EXISTS `idx_order_items_variant` ON `order_items` (`variant_id`);
CREATE INDEX IF NOT EXISTS `idx_returns_customer` ON `returns` (`customer_id`);
CREATE INDEX IF NOT EXISTS `idx_returns_order` ON `returns` (`order_id`);
CREATE INDEX IF NOT EXISTS `idx_returns_status` ON `returns` (`status`);
CREATE INDEX IF NOT EXISTS `idx_customer_addresses_customer` ON `customer_addresses` (`customer_id`);
CREATE INDEX IF NOT EXISTS `idx_customer_sessions_customer` ON `customer_sessions` (`customer_id`);

-- Ensure unique constraints (Doc 01 §34.1)
-- store_owner.user_id unique - already in 0000
-- store_products.slug unique - already in 0000
-- stock_variants.sku unique - already in 0001
-- customers.email unique - already in 0002
-- orders.order_number unique - already in 0002
-- returns.return_number unique - already in 0002
-- customer_sessions.token_hash unique - already in 0002

-- Soft delete support (Doc 01 §3.44) - add deleted_at to key entities
ALTER TABLE `store_products` ADD COLUMN `deleted_at` text;
ALTER TABLE `customers` ADD COLUMN `deleted_at` text;
ALTER TABLE `orders` ADD COLUMN `deleted_at` text;

-- Inventory check constraints (Doc 01 §3.43, §3.45)
-- stock_variants on_hand check - already in 0001
-- stock_reservation status check - already in 0001
