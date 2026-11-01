import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createYoupiPayment, getYoupiPayment, verifyYoupiWebhook, classifyYoupiPayment, type YoupiConfig, type YoupiWebhook } from '../server/youpi.ts';

const config: YoupiConfig = { apiUrl: 'https://api.youpi.example', checkoutOrigin: 'https://pay.youpi.example',
  merchantId: '11111111-1111-4111-8111-111111111111', merchantKey: 'mk_live_test_key' };
const paymentId = '22222222-2222-4222-8222-222222222222';
const expected = { paymentId, orderId: 'WESTOS-123', amountPaise: 189900 };
const input = { orderId: expected.orderId, amountPaise: expected.amountPaise, returnUrl: 'https://westos.example/checkout/complete/' };
const created = { paymentId, orderId: expected.orderId, amount: '1899.00', amountPaise: '189900', currency: 'INR', status: 'INITIATED', checkoutUrl: `${config.checkoutOrigin}/checkout/${paymentId}` };
const response = (value: unknown, status = 200): typeof fetch => async () => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
let calls = 0;
const createFetch: typeof fetch = async (url, init) => {
  calls++;
  assert.equal(String(url), `${config.apiUrl}/api/v1/payments`);
  assert.equal(init?.method, 'POST');
  assert.equal(init?.redirect, 'error');
  const headers = new Headers(init?.headers);
  assert.equal(headers.get('X-Merchant-Id'), config.merchantId);
  assert.equal(headers.get('X-Merchant-Key'), config.merchantKey);
  assert.equal(headers.get('Idempotency-Key'), input.orderId);
  assert.deepEqual(JSON.parse(String(init?.body)), { orderId: input.orderId, amount: '1899.00', currency: 'INR', method: 'UPI', returnUrl: input.returnUrl });
  return new Response(JSON.stringify(created), { status: 201 });
};
const payment = await createYoupiPayment(config, input, createFetch);
assert.equal(calls, 1);
assert.equal(payment.amountPaise, 189900);
assert.equal(payment.checkoutUrl, created.checkoutUrl);
assert.equal((await createYoupiPayment({ ...config, merchantId: '00000000-0000-0000-0000-000000000001' }, input, response(created))).paymentId, paymentId);
await assert.rejects(createYoupiPayment(config, { ...input, amountPaise: 1.5 }, createFetch));
assert.equal(calls, 1, 'Invalid server amounts must never reach the gateway');
for (const bad of [
  { ...created, orderId: 'CHANGED' }, { ...created, amountPaise: '1' }, { ...created, currency: 'USD' },
  { ...created, checkoutUrl: `https://evil.example/checkout/${paymentId}` },
  { ...created, checkoutUrl: `${config.checkoutOrigin}/checkout/${paymentId}?next=evil` },
  { ...created, checkoutUrl: `${config.checkoutOrigin}/checkout/other` },
  { ...created, status: 'FORCE_SUCCESS' },
]) await assert.rejects(createYoupiPayment(config, input, response(bad)));
await assert.rejects(createYoupiPayment({ ...config, apiUrl: 'http://public.example' }, input, response(created)));
await assert.rejects(createYoupiPayment({ ...config, apiUrl: 'https://secret@api.example' }, input, response(created)));
await assert.rejects(createYoupiPayment({ ...config, checkoutOrigin: 'https://pay.example/another-path' }, input, response(created)));
await assert.rejects(createYoupiPayment(config, input, response({ error: 'offline' }, 503)));
assert.equal((await createYoupiPayment({ ...config, apiUrl: 'http://localhost:6100', checkoutOrigin: 'http://localhost:7000' },
  { ...input, returnUrl: 'http://localhost:3000/complete/' }, response({ ...created, checkoutUrl: `http://localhost:7000/checkout/${paymentId}` }))).paymentId, paymentId);

// Current GET shape: status (not event), string paise, and no UTR.
const statusResponse = { paymentId, orderId: expected.orderId, amount: '1899.00', amountPaise: '189900', currency: 'INR',
  status: 'OBSERVED_SUCCESS', settlementState: 'NOT_RECONCILED', method: 'UPI', completedAt: null,
  internalStatus: 'OBSERVED_SUCCESS', metadata: { ignored: true } };
const getFetch: typeof fetch = async (url, init) => {
  assert.equal(String(url), `${config.apiUrl}/api/v1/payments/${paymentId}`);
  assert.equal(new Headers(init?.headers).get('X-Merchant-Key'), config.merchantKey);
  assert.equal(init?.method, 'GET');
  return new Response(JSON.stringify(statusResponse));
};
const observed = await getYoupiPayment(config, paymentId, getFetch);
assert.equal(classifyYoupiPayment(observed, expected), 'pending');
await assert.rejects(getYoupiPayment(config, paymentId, response({ ...statusResponse, paymentId: config.merchantId })));
await assert.rejects(getYoupiPayment(config, paymentId, response({ ...statusResponse, amountPaise: '1.00' })));
assert.throws(() => classifyYoupiPayment({ ...observed, status: 'FORCE_SUCCESS' } as unknown as typeof observed, expected));
assert.throws(() => classifyYoupiPayment({ ...observed, orderId: 'OTHER' }, expected));
assert.throws(() => classifyYoupiPayment(observed, { ...expected, amountPaise: 190000 }));
assert.throws(() => classifyYoupiPayment({ ...observed, currency: 'USD' } as unknown as typeof observed, expected));
assert.equal(classifyYoupiPayment({ ...observed, status: 'SUCCESS', settlementState: 'NOT_BANK_SETTLEMENT', method: 'COD' }, expected), 'review');
assert.equal(classifyYoupiPayment({ ...observed, status: 'RECONCILED', settlementState: 'RECONCILED' }, expected), 'paid');
assert.equal(classifyYoupiPayment({ ...observed, status: 'RECONCILED', settlementState: 'RECONCILED', method: 'COD' }, expected), 'review');
for (const status of ['FAILED', 'CANCELLED', 'EXPIRED'] as const) assert.equal(classifyYoupiPayment({ ...observed, status, settlementState: 'NOT_APPLICABLE' }, expected), status.toLowerCase());
assert.throws(() => classifyYoupiPayment({ ...observed, status: 'RECONCILED' }, expected), 'A status without reconciled settlement is not paid');
assert.throws(() => classifyYoupiPayment({ status: 'SUCCESS', order_id: expected.orderId, amount_received: 1899 } as unknown as typeof observed, expected), 'Browser callbacks cannot supply an authenticated server-status/webhook contract');

const secret = '0123456789abcdef'.repeat(4);
const now = 1793059200000;
const deliveryId = '33333333-3333-4333-8333-333333333333';
const payload = { ...expected, amount: '1899.00', currency: 'INR', event: 'RECONCILED',
  settlementState: 'RECONCILED', method: 'UPI', deliveryId, timestamp: now, utr: '123456789012' };
function signed(value: unknown, timestamp = now) {
  const raw = Buffer.from(JSON.stringify(value));
  const headers = { 'x-gateway-event': (value as {event: string}).event, 'x-gateway-timestamp': String(timestamp),
    'x-gateway-delivery-id': deliveryId, 'x-gateway-signature-v2': `sha256=${createHmac('sha256', secret).update(`${timestamp}.`).update(raw).digest('hex')}` };
  return { raw, headers };
}
const signedPayment = signed(payload);
const verified = verifyYoupiWebhook(signedPayment.raw, signedPayment.headers, secret, now);
assert.equal(classifyYoupiPayment(verified, expected), 'paid');
assert.deepEqual(verifyYoupiWebhook(signedPayment.raw, signedPayment.headers, secret, now + 600000), verified, 'Retries keep their original signed timestamp and delivery ID');
assert.throws(() => verifyYoupiWebhook(Buffer.from(signedPayment.raw.toString().replace('189900', '189901')), signedPayment.headers, secret, now));
assert.throws(() => verifyYoupiWebhook(signedPayment.raw, { ...signedPayment.headers, 'x-gateway-signature-v2': 'sha256=' + '0'.repeat(64) }, secret, now));
assert.throws(() => verifyYoupiWebhook(signedPayment.raw, { ...signedPayment.headers, 'x-gateway-signature-v2': undefined }, secret, now));
assert.throws(() => verifyYoupiWebhook(signedPayment.raw, { ...signedPayment.headers, 'x-gateway-delivery-id': config.merchantId }, secret, now));
assert.throws(() => verifyYoupiWebhook(signedPayment.raw, { ...signedPayment.headers, 'x-gateway-event': 'SUCCESS' }, secret, now));
assert.throws(() => verifyYoupiWebhook(signedPayment.raw, signedPayment.headers, secret, now + 7200001));
assert.throws(() => verifyYoupiWebhook(signedPayment.raw, signedPayment.headers, secret, now - 60001));
const differentSignedTimestamp = signed({ ...payload, timestamp: now - 1 });
assert.throws(() => verifyYoupiWebhook(differentSignedTimestamp.raw, differentSignedTimestamp.headers, secret, now));
for (const bad of [{ ...payload, event: 'UNKNOWN' }, { ...payload, currency: 'USD' }, { ...payload, method: 'MAGIC' }, { ...payload, amount: '0.01' }]) {
  const { raw, headers } = signed(bad);
  assert.throws(() => verifyYoupiWebhook(raw, headers, secret, now));
}
const signedObserved = signed({ ...payload, event: 'OBSERVED_SUCCESS', settlementState: 'NOT_RECONCILED' });
assert.equal(classifyYoupiPayment(verifyYoupiWebhook(signedObserved.raw, signedObserved.headers, secret, now), expected), 'pending');
assert.throws(() => classifyYoupiPayment({ ...verified, amountPaise: 100, amount: '1.00' } as YoupiWebhook, expected));
console.log('YouPI adapter checks passed.');
