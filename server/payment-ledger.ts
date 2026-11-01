import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

export type LedgerStatus = 'pending' | 'review' | 'paid' | 'failed' | 'cancelled' | 'expired';
export type LedgerOrder = {
  orderId: string;
  amountPaise: number;
  expiresAt: number;
  paymentId: string | null;
  checkoutUrl: string | null;
  status: LedgerStatus;
};
export type PaymentDelivery = {
  deliveryId: string;
  orderId: string;
  paymentId: string;
  amountPaise: number;
  status: LedgerStatus;
  utr?: string;
};

const statuses: LedgerStatus[] = ['pending', 'review', 'paid', 'failed', 'cancelled', 'expired'];
const orderColumns = 'order_id AS orderId, amount_paise AS amountPaise, expires_at AS expiresAt, payment_id AS paymentId, checkout_url AS checkoutUrl, status';
const validId = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(value);
const validAmount = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;

/** Private server-side approvals and verified payment events; never import into client components. */
export class PaymentLedger {
  private readonly db: DatabaseSync;

  constructor(filename: string) {
    if (typeof filename !== 'string' || !filename.trim()) throw new Error('An explicit payment ledger filename is required.');
    this.db = new DatabaseSync(filename);
    this.db.exec(`
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS checkout_orders (
        order_id TEXT PRIMARY KEY,
        token_hash TEXT NOT NULL,
        amount_paise INTEGER NOT NULL CHECK(amount_paise > 0),
        expires_at INTEGER NOT NULL,
        payment_id TEXT UNIQUE,
        checkout_url TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','review','paid','failed','cancelled','expired')),
        paid_utr TEXT UNIQUE
      );
      CREATE TABLE IF NOT EXISTS payment_receipts (
        delivery_id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES checkout_orders(order_id),
        payment_id TEXT NOT NULL,
        amount_paise INTEGER NOT NULL,
        status TEXT NOT NULL,
        utr TEXT
      );
    `);
  }

  register({ orderId, amountPaise, expiresAt }: { orderId: string; amountPaise: number; expiresAt: number }): { orderId: string; accessToken: string } {
    if (!validId(orderId)) throw new Error('Invalid order ID.');
    if (!validAmount(amountPaise)) throw new Error('Amount must be a positive safe integer in paise.');
    if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) throw new Error('Approval expiry must be a future timestamp.');
    const accessToken = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(accessToken).digest('hex');
    const result = this.db.prepare(`INSERT INTO checkout_orders (order_id, token_hash, amount_paise, expires_at)
      VALUES (?, ?, ?, ?) ON CONFLICT(order_id) DO NOTHING`).run(orderId, tokenHash, amountPaise, expiresAt);
    if (!result.changes) throw new Error('Order already registered.');
    return { orderId, accessToken };
  }

  get(orderId: string, accessToken: string): LedgerOrder {
    if (!validId(orderId) || typeof accessToken !== 'string' || accessToken.length > 512) throw new Error('Unauthorized payment access.');
    const row = this.db.prepare(`SELECT ${orderColumns}, token_hash AS tokenHash FROM checkout_orders WHERE order_id = ?`).get(orderId) as (LedgerOrder & { tokenHash: string }) | undefined;
    const actual = createHash('sha256').update(accessToken).digest();
    const expected = Buffer.from(row?.tokenHash ?? '0'.repeat(64), 'hex');
    if (!timingSafeEqual(actual, expected) || !row) throw new Error('Unauthorized payment access.');
    const { tokenHash: _tokenHash, ...order } = row;
    return order;
  }

  /** For already authenticated server-side webhook handling only. */
  getInternal(orderId: string): LedgerOrder {
    if (!validId(orderId)) throw new Error('Invalid order ID.');
    const row = this.db.prepare(`SELECT ${orderColumns} FROM checkout_orders WHERE order_id = ?`).get(orderId) as LedgerOrder | undefined;
    if (!row) throw new Error('Order not found.');
    return row;
  }

  setAttempt(orderId: string, paymentId: string, checkoutUrl: string): void {
    if (!validId(orderId) || !validId(paymentId)) throw new Error('Invalid order or payment ID.');
    if (typeof checkoutUrl !== 'string' || checkoutUrl.length > 2048) throw new Error('Invalid checkout URL.');
    const url = new URL(checkoutUrl);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid checkout URL.');
    // The HTTP integration must additionally allowlist the configured gateway origin.
    const result = this.db.prepare(`UPDATE checkout_orders SET payment_id = ?, checkout_url = ?
      WHERE order_id = ? AND payment_id IS NULL AND expires_at > ?`).run(paymentId, checkoutUrl, orderId, Date.now());
    if (result.changes) return;
    const order = this.getInternal(orderId);
    if (order.paymentId === paymentId && order.checkoutUrl === checkoutUrl) return;
    // ponytail: one gateway attempt per approval; retrying with a new attempt requires a new order ID.
    if (order.paymentId) throw new Error('Order already has a different payment attempt.');
    throw new Error('Checkout approval has expired.');
  }

  /** Caller verifies the webhook signature before passing its authenticated, normalized event here. */
  record(event: PaymentDelivery): { duplicate: boolean } {
    const { deliveryId, orderId, paymentId, amountPaise, status } = event;
    const utr = event.utr === undefined || event.utr === '' ? null : event.utr;
    if (![deliveryId, orderId, paymentId].every(validId)) throw new Error('Invalid delivery, order or payment ID.');
    if (!validAmount(amountPaise)) throw new Error('Invalid payment amount.');
    if (!statuses.includes(status)) throw new Error('Invalid payment status.');
    if ((status === 'paid' && !utr) || (utr !== null && (typeof utr !== 'string' || !/^\d{12}$/.test(utr)))) throw new Error('A paid event requires a 12-digit UTR.');

    this.db.exec('BEGIN IMMEDIATE');
    try {
      const order = this.getInternal(orderId);
      if (order.paymentId !== paymentId) throw new Error('Payment ID does not match the approved order.');
      if (order.amountPaise !== amountPaise) throw new Error('Payment amount does not match the approved order.');
      const receipt = this.db.prepare('SELECT order_id, payment_id, amount_paise, status, utr FROM payment_receipts WHERE delivery_id = ?').get(deliveryId);
      if (receipt) {
        if (receipt.order_id !== orderId || receipt.payment_id !== paymentId || receipt.amount_paise !== amountPaise || receipt.status !== status || receipt.utr !== utr) throw new Error('Delivery ID was already used for a different event.');
        this.db.exec('COMMIT');
        return { duplicate: true };
      }

      if (status === 'paid') {
        const prior = this.db.prepare('SELECT order_id, paid_utr FROM checkout_orders WHERE paid_utr = ? OR order_id = ?').all(utr, orderId);
        if (prior.some((row) => row.order_id !== orderId)) throw new Error('UTR was already used by another order.');
        if (prior.some((row) => row.paid_utr !== null && row.paid_utr !== utr)) throw new Error('Paid order already has a different UTR.');
      }

      const nextStatus = order.status === 'paid' || (status === 'pending' && order.status !== 'pending') ? order.status : status;
      this.db.prepare(`UPDATE checkout_orders SET status = ?, paid_utr = CASE WHEN ? = 'paid' THEN ? ELSE paid_utr END
        WHERE order_id = ?`).run(nextStatus, status, utr, orderId);
      this.db.prepare(`INSERT INTO payment_receipts (delivery_id, order_id, payment_id, amount_paise, status, utr)
        VALUES (?, ?, ?, ?, ?, ?)`).run(deliveryId, orderId, paymentId, amountPaise, status, utr);
      this.db.exec('COMMIT');
      return { duplicate: false };
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  close(): void {
    this.db.close();
  }
}
