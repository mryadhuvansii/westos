import assert from 'node:assert/strict';
import { PaymentLedger, type PaymentDelivery } from '../server/payment-ledger.ts';

assert.throws(() => new PaymentLedger(''), /explicit.*filename/);
const ledger = new PaymentLedger(':memory:');
const expiry = Date.now() + 60_000;
const approved = { orderId: 'WESTOS-1', amountPaise: 189900, expiresAt: expiry };
const session = ledger.register(approved);
const event: PaymentDelivery = { deliveryId: 'delivery-1', orderId: approved.orderId, paymentId: 'payment-1', amountPaise: approved.amountPaise, status: 'pending' };

try {
  assert.match(session.accessToken, /^[A-Za-z0-9_-]{43}$/);
  assert.deepEqual(ledger.get(session.orderId, session.accessToken), { ...approved, paymentId: null, checkoutUrl: null, status: 'pending' });
  assert.throws(() => ledger.get(session.orderId, 'forged-token'), /Unauthorized/);
  assert.throws(() => ledger.get('unknown-order', session.accessToken), /Unauthorized/);
  assert.throws(() => ledger.get(session.orderId, ''), /Unauthorized/);
  assert.throws(() => ledger.register(approved), /already registered/);
  assert.throws(() => ledger.register({ ...approved, amountPaise: 1 }), /already registered/);
  assert.equal(ledger.getInternal(session.orderId).amountPaise, approved.amountPaise);
  for (const amountPaise of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => ledger.register({ ...approved, orderId: 'bad-amount', amountPaise }), /positive safe integer/);
  }
  assert.throws(() => ledger.register({ ...approved, orderId: 'bad-expiry', expiresAt: 1 }), /future timestamp/);
  assert.equal(ledger.register({ ...approved, orderId: 'W'.repeat(128) }).orderId.length, 128);
  assert.throws(() => ledger.register({ ...approved, orderId: 'W'.repeat(129) }), /Invalid order ID/);

  assert.throws(() => ledger.record(event), /Payment ID does not match/);
  assert.throws(() => ledger.setAttempt(session.orderId, 'payment-1', 'javascript:alert(1)'), /Invalid checkout URL/);
  ledger.setAttempt(session.orderId, 'payment-1', 'https://pay.example.test/checkout/payment-1');
  ledger.setAttempt(session.orderId, 'payment-1', 'https://pay.example.test/checkout/payment-1');
  assert.throws(() => ledger.setAttempt(session.orderId, 'payment-other', 'https://pay.example.test/checkout/payment-other'), /different payment attempt/);
  assert.throws(() => ledger.setAttempt(session.orderId, 'payment-1', 'https://other.example.test/checkout/payment-1'), /different payment attempt/);
  assert.throws(() => ledger.record({ ...event, orderId: 'unknown-order' }), /Order not found/);
  assert.throws(() => ledger.record({ ...event, amountPaise: 1 }), /amount does not match/);
  assert.throws(() => ledger.record({ ...event, paymentId: 'wrong-payment' }), /Payment ID does not match/);
  assert.throws(() => ledger.record({ ...event, status: 'paid' }), /12-digit UTR/);
  assert.throws(() => ledger.record({ ...event, status: 'paid', utr: '123' }), /12-digit UTR/);

  assert.deepEqual(ledger.record(event), { duplicate: false });
  assert.deepEqual(ledger.record(event), { duplicate: true });
  assert.throws(() => ledger.record({ ...event, status: 'review' }), /different event/);
  ledger.record({ ...event, deliveryId: 'review-1', status: 'review' });
  ledger.record({ ...event, deliveryId: 'late-pending-1' });
  assert.equal(ledger.getInternal(session.orderId).status, 'review');
  const reconciled: PaymentDelivery = { ...event, deliveryId: 'reconciled-1', status: 'paid', utr: '123456789012' };
  assert.deepEqual(ledger.record(reconciled), { duplicate: false });
  assert.deepEqual(ledger.record(reconciled), { duplicate: true });
  for (const status of ['pending', 'review', 'failed', 'expired', 'cancelled'] as const) {
    ledger.record({ ...event, deliveryId: `stale-${status}`, status });
    assert.equal(ledger.getInternal(session.orderId).status, 'paid');
  }
  assert.throws(() => ledger.record({ ...reconciled, deliveryId: 'changed-utr', utr: '999999999999' }), /different UTR/);

  const second = ledger.register({ ...approved, orderId: 'WESTOS-2' });
  ledger.setAttempt(second.orderId, 'payment-2', 'https://pay.example.test/checkout/payment-2');
  assert.throws(() => ledger.get(second.orderId, session.accessToken), /Unauthorized/);
  const reused: PaymentDelivery = { ...reconciled, deliveryId: 'reconciled-2', orderId: second.orderId, paymentId: 'payment-2' };
  assert.throws(() => ledger.record(reused), /UTR was already used/);
  assert.equal(ledger.getInternal(second.orderId).status, 'pending');
  // A rejected delivery must not be remembered: correction with the same delivery ID can commit.
  assert.deepEqual(ledger.record({ ...reused, utr: '234567890123' }), { duplicate: false });
  assert.equal(ledger.get(second.orderId, second.accessToken).status, 'paid');
  assert.throws(() => ledger.record({ ...event, orderId: second.orderId, paymentId: 'payment-2' }), /different event/);
  console.log('Payment ledger checks passed.');
} finally {
  ledger.close();
}
