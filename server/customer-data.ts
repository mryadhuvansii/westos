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
  customerEmail?: string;
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
    db.prepare(`INSERT INTO orders (id, order_number, customer_id, customer_email, status, subtotal, tax, shipping, total, currency, shipping_address_id, billing_address_id, created_at, updated_at) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, 'INR', ?, ?, ?, ?)`)
      .bind(orderId, orderNumber, input.customerId, input.customerEmail ?? null, subtotal, tax, shipping, total, input.shippingAddressId ?? null, input.billingAddressId ?? null, now, now),
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
  const rows = await db.prepare(`SELECT o.id, o.order_number, o.customer_id, o.customer_email, o.status, o.subtotal, o.tax, o.shipping, o.total, o.currency, o.payment_status, o.created_at, o.updated_at FROM orders o ORDER BY o.created_at DESC`).all();
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

export async function getDashboardStats(db: D1Database) {
  const [orderStats, returnStats, stockStats] = await Promise.all([
    db.prepare(`SELECT COUNT(*) AS total_orders, COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total ELSE 0 END), 0) AS total_revenue, COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_orders FROM orders`).first<{total_orders: number; total_revenue: number; pending_orders: number}>(),
    db.prepare(`SELECT COUNT(*) AS total_returns, COUNT(CASE WHEN status = 'requested' THEN 1 END) AS pending_returns FROM returns`).first<{total_returns: number; pending_returns: number}>(),
    db.prepare(`SELECT COALESCE(SUM(CASE WHEN active = 1 THEN on_hand ELSE 0 END), 0) AS available, COALESCE(SUM(CASE WHEN active = 1 THEN reserved ELSE 0 END), 0) AS reserved FROM stock_variants`).first<{available: number; reserved: number}>(),
  ]);
  const totalOrders = orderStats.total_orders || 0;
  const totalReturns = returnStats.total_returns || 0;
  return {
    sales: {
      totalOrders,
      totalRevenue: orderStats.total_revenue || 0,
      pendingOrders: orderStats.pending_orders || 0,
    },
    returns: {
      totalReturns,
      pendingReturns: returnStats.pending_returns || 0,
      returnRate: totalOrders > 0 ? Math.round((totalReturns / totalOrders) * 100) : 0,
    },
    stock: {
      available: stockStats.available || 0,
      reserved: stockStats.reserved || 0,
    },
  };
}

export async function getTopSelling(db: D1Database, limit = 10) {
  const rows = await db.prepare(`SELECT oi.product_name, oi.color_name, oi.size, SUM(oi.quantity) AS total_qty, SUM(oi.total_price) AS total_revenue FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.status != 'cancelled' GROUP BY oi.product_name, oi.color_name, oi.size ORDER BY total_qty DESC LIMIT ?`).bind(limit).all();
  return rows.results;
}

export async function getTopSizes(db: D1Database, limit = 10) {
  const rows = await db.prepare(`SELECT oi.size, SUM(oi.quantity) AS total_qty FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.status != 'cancelled' GROUP BY oi.size ORDER BY total_qty DESC LIMIT ?`).bind(limit).all();
  return rows.results;
}

export async function getTopColors(db: D1Database, limit = 10) {
  const rows = await db.prepare(`SELECT oi.color_name, SUM(oi.quantity) AS total_qty FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.status != 'cancelled' GROUP BY oi.color_name ORDER BY total_qty DESC LIMIT ?`).bind(limit).all();
  return rows.results;
}

export async function getStockMovements(db: D1Database, limit = 50) {
  const rows = await db.prepare(`SELECT sm.id, sm.variant_id, sm.type, sm.quantity, sm.reason, sm.reference, sm.created_at, sv.sku, sv.size, sv.color_id FROM stock_movements sm JOIN stock_variants sv ON sv.id = sm.variant_id ORDER BY sm.created_at DESC LIMIT ?`).bind(limit).all();
  return rows.results;
}

export async function getOrderDetail(db: D1Database, orderId: string) {
  const order = await db.prepare(`SELECT o.id, o.order_number, o.customer_id, o.customer_email, o.status, o.subtotal, o.tax, o.shipping, o.total, o.currency, o.payment_status, o.payment_provider, o.payment_reference, o.created_at, o.updated_at FROM orders o WHERE o.id = ?`).bind(orderId).first();
  if (!order) return null;
  const items = await db.prepare(`SELECT oi.id, oi.variant_id, oi.sku, oi.product_name, oi.color_name, oi.size, oi.quantity, oi.unit_price, oi.total_price FROM order_items oi WHERE oi.order_id = ?`).bind(orderId).all();
  return {...order, items: items.results};
}

export async function recordStockMovement(db: D1Database, variantId: string, type: 'in' | 'out' | 'adjust' | 'return', quantity: number, reason: string, reference?: string) {
  const id = generateId('mov');
  const now = new Date().toISOString();
  await db.prepare(`INSERT INTO stock_movements (id, variant_id, type, quantity, reason, reference, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(id, variantId, type, quantity, reason, reference ?? null, now).run();
  return {id, variantId, type, quantity, reason, createdAt: now};
}

export async function createPaymentTransaction(db: D1Database, input: {
  orderId: string;
  amount: number;
  currency?: string;
}) {
  const id = generateId('pay');
  const now = new Date().toISOString();
  await db.prepare(`INSERT INTO payment_transactions (id, order_id, amount, currency, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'PENDING', ?, ?)`)
    .bind(id, input.orderId, input.amount, input.currency ?? 'INR', now, now).run();
  return {id, orderId: input.orderId, amount: input.amount, currency: input.currency ?? 'INR', status: 'PENDING', createdAt: now};
}

export async function getPaymentTransactionByOrderId(db: D1Database, orderId: string) {
  return db.prepare(`SELECT id, order_id, phonepe_transaction_id, amount, currency, status, phonepe_response, created_at, updated_at FROM payment_transactions WHERE order_id = ?`).bind(orderId).first();
}

export async function updatePaymentTransaction(db: D1Database, paymentId: string, updates: {
  phonepeTransactionId?: string;
  status?: string;
  phonepeResponse?: string;
}) {
  const now = new Date().toISOString();
  const fields: string[] = [];
  const values: unknown[] = [];
  if (updates.phonepeTransactionId !== undefined) { fields.push('phonepe_transaction_id = ?'); values.push(updates.phonepeTransactionId); }
  if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
  if (updates.phonepeResponse !== undefined) { fields.push('phonepe_response = ?'); values.push(updates.phonepeResponse); }
  fields.push('updated_at = ?'); values.push(now);
  values.push(paymentId);
  const result = await db.prepare(`UPDATE payment_transactions SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
  if (result.meta.changes === 0) throw new StoreError(404, 'Payment transaction not found.');
  return {id: paymentId, ...updates, updatedAt: now};
}

export async function getPaymentStatus(db: D1Database, orderId: string) {
  const row = await db.prepare(`SELECT status, phonepe_transaction_id, amount, updated_at FROM payment_transactions WHERE order_id = ? ORDER BY created_at DESC LIMIT 1`).bind(orderId).first();
  if (!row) return null;
  return {orderId, status: row.status, phonepeTransactionId: row.phonepe_transaction_id, amount: row.amount, updatedAt: row.updated_at};
}