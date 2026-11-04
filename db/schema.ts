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

export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  name: text('name').notNull(),
  passwordHash: text('password_hash'),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  phoneVerified: integer('phone_verified', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, table => [
  index('customers_email_idx').on(table.email),
]);

export const customerAddresses = sqliteTable('customer_addresses', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => customers.id),
  label: text('label').notNull().default('Home'),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  street: text('street').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  pincode: text('pincode').notNull(),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
}, table => [
  index('customer_addresses_customer_idx').on(table.customerId),
]);

export const customerSessions = sqliteTable('customer_sessions', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => customers.id),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: integer('expires_at').notNull(),
  createdAt: text('created_at').notNull(),
}, table => [
  index('customer_sessions_customer_idx').on(table.customerId),
]);

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  customerId: text('customer_id').notNull().references(() => customers.id),
  status: text('status').notNull().default('pending'),
  subtotal: integer('subtotal').notNull(),
  tax: integer('tax').notNull().default(0),
  shipping: integer('shipping').notNull().default(0),
  total: integer('total').notNull(),
  currency: text('currency').notNull().default('INR'),
  paymentStatus: text('payment_status').notNull().default('unpaid'),
  paymentProvider: text('payment_provider'),
  paymentReference: text('payment_reference'),
  shippingAddressId: text('shipping_address_id'),
  billingAddressId: text('billing_address_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, table => [
  index('orders_customer_idx').on(table.customerId),
  index('orders_status_idx').on(table.status),
  index('orders_order_number_idx').on(table.orderNumber),
]);

export const orderItems = sqliteTable('order_items', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id),
  variantId: text('variant_id').notNull().references(() => stockVariants.id),
  sku: text('sku').notNull(),
  productName: text('product_name').notNull(),
  colorName: text('color_name').notNull(),
  size: integer('size').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unit_price').notNull(),
  totalPrice: integer('total_price').notNull(),
}, table => [
  index('order_items_order_idx').on(table.orderId),
  index('order_items_variant_idx').on(table.variantId),
]);

export const returns = sqliteTable('returns', {
  id: text('id').primaryKey(),
  returnNumber: text('return_number').notNull().unique(),
  orderId: text('order_id').notNull().references(() => orders.id),
  customerId: text('customer_id').notNull().references(() => customers.id),
  status: text('status').notNull().default('requested'),
  reason: text('reason').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, table => [
  index('returns_customer_idx').on(table.customerId),
  index('returns_order_idx').on(table.orderId),
  index('returns_status_idx').on(table.status),
]);

export const returnItems = sqliteTable('return_items', {
  id: text('id').primaryKey(),
  returnId: text('return_id').notNull().references(() => returns.id),
  orderItemId: text('order_item_id').notNull().references(() => orderItems.id),
  quantity: integer('quantity').notNull(),
  status: text('status').notNull().default('pending'),
}, table => [
  index('return_items_return_idx').on(table.returnId),
  index('return_items_order_item_idx').on(table.orderItemId),
]);
