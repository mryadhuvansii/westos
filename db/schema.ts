import {check, index, integer, primaryKey, sqliteTable, text} from 'drizzle-orm/sqlite-core';
import {sql} from 'drizzle-orm';

export const storeOwner = sqliteTable('store_owner', {
  id: integer('id').primaryKey(),
  userId: text('user_id').notNull().unique(),
  email: text('email').notNull(),
});
export const storeProducts = sqliteTable('store_products', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  data: text('data').notNull(),
  revision: integer('revision').notNull(),
  updatedAt: text('updated_at').notNull(),
  inventoryVersion: integer('inventory_version').notNull().default(0),
});
export const storeSettings = sqliteTable('store_settings', {
  id: integer('id').primaryKey(),
  data: text('data').notNull(),
  revision: integer('revision').notNull(),
  updatedAt: text('updated_at').notNull(),
});
export const storeAudit = sqliteTable('store_audit', {
  id: integer('id').primaryKey({autoIncrement: true}),
  actorId: text('actor_id').notNull(),
  actorEmail: text('actor_email').notNull(),
  action: text('action').notNull(),
  productId: text('product_id'),
  reason: text('reason').notNull(),
  beforeJson: text('before_json'),
  afterJson: text('after_json').notNull(),
  createdAt: text('created_at').notNull(),
});

export const stockVariants = sqliteTable('stock_variants', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => storeProducts.id),
  colorId: text('color_id').notNull(),
  size: integer('size').notNull(),
  sku: text('sku').notNull().unique(),
  onHand: integer('on_hand').notNull().default(0),
  revision: integer('revision').notNull().default(1),
  active: integer('active').notNull().default(1),
}, table => [
  index('stock_variants_product_idx').on(table.productId),
  check('stock_on_hand_nonnegative', sql`${table.onHand} >= 0 AND ${table.onHand} <= 1000000`),
  check('stock_variant_active', sql`${table.active} IN (0,1)`),
]);
export const stockReservations = sqliteTable('stock_reservations', {
  id: text('id').primaryKey(), reference: text('reference').notNull().unique(),
  status: text('status').notNull(), expiresAt: integer('expires_at').notNull(),
  createdAt: text('created_at').notNull(), revision: integer('revision').notNull().default(1),
}, table => [
  index('stock_reservations_expiry_idx').on(table.status, table.expiresAt),
  check('stock_reservation_status', sql`${table.status} IN ('held','committed','released')`),
]);
export const stockReservationLines = sqliteTable('stock_reservation_lines', {
  reservationId: text('reservation_id').notNull().references(() => stockReservations.id),
  variantId: text('variant_id').notNull().references(() => stockVariants.id),
  quantity: integer('quantity').notNull(), returned: integer('returned').notNull().default(0),
  sku: text('sku').notNull(), productName: text('product_name').notNull(), colorName: text('color_name').notNull(), size: integer('size').notNull(),
}, table => [
  primaryKey({columns:[table.reservationId,table.variantId]}),
  index('stock_lines_variant_idx').on(table.variantId),
  check('stock_line_quantity', sql`${table.quantity} > 0 AND ${table.quantity} <= 1000000 AND ${table.returned} >= 0 AND ${table.returned} <= ${table.quantity}`),
]);
export const stockRequests = sqliteTable('stock_requests', {
  requestId: text('request_id').primaryKey(), fingerprint: text('fingerprint').notNull(),
  operationToken: text('operation_token').notNull(), reservationId: text('reservation_id').notNull(),
  createdAt: text('created_at').notNull(),
});
