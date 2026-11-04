import {comparePassword, generateId, generateReference, hashPassword, type CustomerIdentity} from '../lib/crypto';
import {StoreError} from '../lib/operations';
import type {D1Database} from '@cloudflare/workers-types';

type Runtime = {DB?: D1Database};
async function runtime(): Promise<Runtime> { return (await import('cloudflare:workers')).env as Runtime; }
function requireDatabase(env: Runtime): D1Database {
  if (!env.DB) throw new StoreError(503, 'Store storage is not configured. Please try again later.');
  return env.DB;
}

export async function getDb(): Promise<D1Database> {
  return requireDatabase(await runtime());
}

export async function createCustomer(db: D1Database, input: {email: string; phone?: string; name: string; password?: string}) {
  const existing = await db.prepare('SELECT id FROM customers WHERE email = ?').bind(input.email).first<{id: string}>();
  if (existing) throw new StoreError(409, 'An account with this email already exists.');
  const id = generateId('cust');
  const now = new Date().toISOString();
  const passwordHash = input.password ? hashPassword(input.password) : null;
  await db.prepare(`INSERT INTO customers (id, email, phone, name, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, input.email, input.phone ?? null, input.name, passwordHash, now, now).run();
  return {id, email: input.email, name: input.name};
}

export async function authenticateCustomer(db: D1Database, email: string, password: string): Promise<{id: string; email: string; name: string}> {
  const row = await db.prepare('SELECT id, email, name, password_hash FROM customers WHERE email = ?').bind(email).first<{id: string; email: string; name: string; password_hash: string | null}>();
  if (!row || !row.password_hash) throw new StoreError(401, 'Invalid email or password.');
  if (!comparePassword(password, row.password_hash)) throw new StoreError(401, 'Invalid email or password.');
  return {id: row.id, email: row.email, name: row.name};
}

export async function getCustomerById(db: D1Database, customerId: string) {
  return db.prepare('SELECT id, email, phone, name, email_verified, phone_verified, created_at FROM customers WHERE id = ?').bind(customerId).first();
}

export async function createCustomerSession(db: D1Database, customerId: string): Promise<string> {
  const token = generateReference('tok');
  const {createHash} = await import('node:crypto');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const id = generateId('sess');
  const now = Date.now();
  const expiresAt = now + 7 * 24 * 60 * 60 * 1000;
  await db.prepare(`INSERT INTO customer_sessions (id, customer_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)`)
    .bind(id, customerId, tokenHash, expiresAt, new Date(now).toISOString()).run();
  return token;
}

export async function validateCustomerSession(db: D1Database, token: string): Promise<CustomerIdentity | null> {
  const {createHash} = await import('node:crypto');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const row = await db.prepare(`SELECT c.id, c.email, c.name FROM customer_sessions s JOIN customers c ON c.id = s.customer_id WHERE s.token_hash = ? AND s.expires_at > ?`).bind(tokenHash, Math.floor(Date.now())).first<{id: string; email: string; name: string}>();
  if (!row) return null;
  return {customerId: row.id, email: row.email, name: row.name};
}

export async function listCustomerOrders(db: D1Database, customerId: string) {
  const rows = await db.prepare(`SELECT o.id, o.order_number, o.status, o.subtotal, o.tax, o.shipping, o.total, o.currency, o.payment_status, o.created_at, o.updated_at FROM orders o WHERE o.customer_id = ? ORDER BY o.created_at DESC`).bind(customerId).all();
  return rows.results;
}

export async function getOrderById(db: D1Database, orderId: string, customerId?: string) {
  const query = customerId ? 'SELECT * FROM orders WHERE id = ? AND customer_id = ?' : 'SELECT * FROM orders WHERE id = ?';
  const params = customerId ? [orderId, customerId] : [orderId];
  return db.prepare(query).bind(...params).first();
}

export async function getOrderItems(db: D1Database, orderId: string) {
  const rows = await db.prepare('SELECT * FROM order_items WHERE order_id = ?').bind(orderId).all();
  return rows.results;
}

export async function createOrder(db: D1Database, input: {
  customerId: string;
  items: {variantId: string; sku: string; productName: string; colorName: string; size: number; quantity: number; unitPrice: number; totalPrice: number}[];
  shippingAddressId?: string;
  billingAddressId?: string;
}) {
  const orderId = generateId('order');
  const orderNumber = generateReference('WS');
  const now = new Date().toISOString();
  let subtotal = 0;
  for (const item of input.items) subtotal += item.totalPrice;
  const shipping = 0;
  const tax = 0;
  const total = subtotal + tax + shipping;

  await db.batch([
    db.prepare(`INSERT INTO orders (id, order_number, customer_id, status, subtotal, tax, shipping, total, currency, shipping_address_id, billing_address_id, created_at, updated_at) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, 'INR', ?, ?, ?, ?)`)
      .bind(orderId, orderNumber, input.customerId, subtotal, tax, shipping, total, input.shippingAddressId ?? null, input.billingAddressId ?? null, now, now),
    ...input.items.map(item => db.prepare(`INSERT INTO order_items (id, order_id, variant_id, sku, product_name, color_name, size, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(generateId('oi'), orderId, item.variantId, item.sku, item.productName, item.colorName, item.size, item.quantity, item.unitPrice, item.totalPrice)),
  ]);
  return {id: orderId, orderNumber, status: 'pending', subtotal, tax, shipping, total, currency: 'INR', paymentStatus: 'unpaid', createdAt: now};
}

export async function createReturn(db: D1Database, input: {orderId: string; customerId: string; reason: string; items: {orderItemId: string; quantity: number}[]}) {
  const order = await getOrderById(db, input.orderId, input.customerId);
  if (!order) throw new StoreError(404, 'Order not found.');
  const returnId = generateId('ret');
  const returnNumber = generateReference('RET');
  const now = new Date().toISOString();

  await db.batch([
    db.prepare(`INSERT INTO returns (id, return_number, order_id, customer_id, status, reason, created_at, updated_at) VALUES (?, ?, ?, ?, 'requested', ?, ?, ?)`)
      .bind(returnId, returnNumber, input.orderId, input.customerId, input.reason, now, now),
    ...input.items.map(item => db.prepare(`INSERT INTO return_items (id, return_id, order_item_id, quantity, status) VALUES (?, ?, ?, ?, 'pending')`)
      .bind(generateId('ri'), returnId, item.orderItemId, item.quantity)),
  ]);
  return {id: returnId, returnNumber, status: 'requested', reason: input.reason, createdAt: now};
}

export async function listCustomerReturns(db: D1Database, customerId: string) {
  const rows = await db.prepare(`SELECT r.id, r.return_number, r.status, r.reason, r.created_at, r.updated_at FROM returns r WHERE r.customer_id = ? ORDER BY r.created_at DESC`).bind(customerId).all();
  return rows.results;
}

export async function listAllOrders(db: D1Database) {
  const rows = await db.prepare(`SELECT o.id, o.order_number, o.customer_id, o.status, o.subtotal, o.tax, o.shipping, o.total, o.currency, o.payment_status, o.created_at, o.updated_at FROM orders o ORDER BY o.created_at DESC`).all();
  return rows.results;
}

export async function listAllReturns(db: D1Database) {
  const rows = await db.prepare(`SELECT r.id, r.return_number, r.order_id, r.customer_id, r.status, r.reason, r.created_at, r.updated_at FROM returns r ORDER BY r.created_at DESC`).all();
  return rows.results;
}

export async function updateOrderStatus(db: D1Database, orderId: string, status: string) {
  const valid = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded'];
  if (!valid.includes(status)) throw new StoreError(400, 'Invalid order status.');
  const result = await db.prepare(`UPDATE orders SET status = ?, updated_at = ? WHERE id = ?`).bind(status, new Date().toISOString(), orderId).run();
  if (result.meta.changes === 0) throw new StoreError(404, 'Order not found.');
  return {id: orderId, status};
}

export async function updateReturnStatus(db: D1Database, returnId: string, status: string) {
  const valid = ['requested', 'approved', 'rejected', 'completed'];
  if (!valid.includes(status)) throw new StoreError(400, 'Invalid return status.');
  const result = await db.prepare(`UPDATE returns SET status = ?, updated_at = ? WHERE id = ?`).bind(status, new Date().toISOString(), returnId).run();
  if (result.meta.changes === 0) throw new StoreError(404, 'Return not found.');
  return {id: returnId, status};
}