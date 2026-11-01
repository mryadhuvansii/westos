import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { request as httpRequest } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createPaymentApi, type PaymentApiConfig } from '../server/payment-api.ts';
import { PaymentLedger } from '../server/payment-ledger.ts';
import type { YoupiStatus } from '../server/youpi.ts';

const config: PaymentApiConfig = {
  enabled: true,
  storefrontOrigin: 'https://westos.example.test',
  apiUrl: 'https://api.pay.example.test',
  checkoutOrigin: 'https://pay.example.test',
  merchantId: '11111111-1111-4111-8111-111111111111',
  merchantKey: 'private-merchant-key',
  internalKey: 'i'.repeat(48),
  webhookSecret: 'w'.repeat(48),
};
const orderId = 'WESTOS-HTTP-1';
const paymentId = '22222222-2222-4222-8222-222222222222';
const checkoutUrl = `${config.checkoutOrigin}/checkout/${paymentId}`;
const amountPaise = 189900;
let providerCalls = 0;
let createCalls = 0;
let lookupStatus: YoupiStatus = 'ACTIVE';
const fakeFetch: typeof fetch = async (input, init) => {
  providerCalls++;
  const url = new URL(String(input));
  assert.equal(url.origin, config.apiUrl);
  const headers = new Headers(init?.headers);
  assert.equal(headers.get('X-Merchant-Id'), config.merchantId);
  assert.equal(headers.get('X-Merchant-Key'), config.merchantKey);
  assert.equal(init?.redirect, 'error');
  if (init?.method === 'POST') {
    createCalls++;
    assert.equal(url.pathname, '/api/v1/payments');
    assert.equal(headers.get('Idempotency-Key'), orderId);
    assert.deepEqual(JSON.parse(String(init.body)), {
      orderId, amount: '1899.00', currency: 'INR', method: 'UPI', returnUrl: `${config.storefrontOrigin}/payment/?return=1`,
    });
    // Hold the mocked provider response so simultaneous requests exercise coalescing.
    await new Promise((resolve) => setTimeout(resolve, 40));
    return Response.json({ orderId, paymentId, amount: '1899.00', amountPaise, currency: 'INR', status: 'INITIATED', checkoutUrl });
  }
  assert.equal(init?.method, 'GET');
  assert.equal(url.pathname, `/api/v1/payments/${paymentId}`);
  const settlementState = lookupStatus === 'RECONCILED' ? 'RECONCILED' : lookupStatus === 'OBSERVED_SUCCESS' ? 'NOT_RECONCILED' : 'NOT_APPLICABLE';
  return Response.json({ orderId, paymentId, amount: '1899.00', amountPaise, currency: 'INR', status: lookupStatus, method: 'UPI', settlementState });
};

async function fixture(settings: PaymentApiConfig) {
  const ledger = new PaymentLedger(':memory:');
  const server = createPaymentApi(settings, ledger, fakeFetch);
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return {
    ledger,
    origin,
    async request(path: string, init: RequestInit = {}) {
      const response = await fetch(`${origin}${path}`, { ...init, signal: AbortSignal.timeout(5000) });
      return { status: response.status, headers: response.headers, body: await response.json() as Record<string, unknown> };
    },
    async close() {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      ledger.close();
    },
  };
}
const post = (body: unknown, token = '', headers: Record<string, string> = {}): RequestInit => ({
  method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, body: JSON.stringify(body),
});
const auth = (token: string): RequestInit => ({ headers: { Authorization: `Bearer ${token}` } });
function notification(event: YoupiStatus, overrides: Record<string, unknown> = {}) {
  const payload = {
    deliveryId: randomUUID(), timestamp: Date.now(), event, orderId, paymentId,
    amount: '1899.00', amountPaise, currency: 'INR', method: 'UPI', utr: '123456789012',
    settlementState: event === 'RECONCILED' ? 'RECONCILED' : 'NOT_RECONCILED', ...overrides,
  };
  const raw = JSON.stringify(payload);
  const signature = createHmac('sha256', config.webhookSecret).update(`${payload.timestamp}.${raw}`).digest('hex');
  return {
    payload,
    init: { method: 'POST', body: raw, headers: {
      'Content-Type': 'application/json', 'X-Gateway-Signature-V2': `sha256=${signature}`,
      'X-Gateway-Timestamp': String(payload.timestamp), 'X-Gateway-Event': String(payload.event), 'X-Gateway-Delivery-Id': String(payload.deliveryId),
    } } satisfies RequestInit,
  };
}

const disabled = await fixture({ ...config, enabled: false, internalKey: '', webhookSecret: '' });
try {
  const status = await disabled.request('/v1/payments/config');
  assert.equal(status.status, 200);
  assert.equal(status.body.enabled, false);
  for (const path of ['/v1/payments/session', '/internal/checkouts', '/v1/payments/webhook']) {
    assert.equal((await disabled.request(path, post({ orderId }))).status, 503);
  }
  assert.equal(providerCalls, 0, 'Disabled payments must not contact the provider');
} finally { await disabled.close(); }

const configLedger = new PaymentLedger(':memory:');
try {
  assert.throws(() => createPaymentApi({ ...config, storefrontOrigin: 'http://public.example.test' }, configLedger), /HTTPS storefront/);
  assert.throws(() => createPaymentApi({ ...config, storefrontOrigin: `${config.storefrontOrigin}/unexpected` }, configLedger), /HTTPS storefront/);
  assert.throws(() => createPaymentApi({ ...config, internalKey: 'short' }, configLedger), /strong server-only/);
} finally { configLedger.close(); }

const api = await fixture(config);
try {
  const malformedStatus = await new Promise<number | undefined>((resolve, reject) => {
    const request = httpRequest(api.origin, { path: 'http://[' }, (response) => { response.resume(); response.on('end', () => resolve(response.statusCode)); });
    request.on('error', reject); request.end();
  });
  assert.equal(malformedStatus, 400, 'Malformed request targets must stay inside the request error boundary');
  const approval = { orderId, amountPaise, expiresAt: Date.now() + 120_000 };
  assert.equal((await api.request('/internal/checkouts', post(approval))).status, 401);
  assert.equal((await api.request('/internal/checkouts', post(approval, 'forged'))).status, 401);
  assert.equal((await api.request('/internal/checkouts', post(approval, config.internalKey, { Origin: config.storefrontOrigin }))).status, 401);
  assert.equal((await api.request('/internal/checkouts', post(approval, config.internalKey, { Origin: 'https://other.example.test' }))).status, 403);
  assert.equal((await api.request('/internal/checkouts', post({ ...approval, clientPrice: 1 }, config.internalKey))).status, 400);
  const registered = await api.request('/internal/checkouts', post(approval, config.internalKey));
  assert.equal(registered.status, 201);
  const token = String(registered.body.accessToken);
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  const handoff = new URL(String(registered.body.handoffUrl));
  assert.equal(handoff.origin, config.storefrontOrigin);
  assert.equal(handoff.search, '');
  assert.equal(new URLSearchParams(handoff.hash.slice(1)).get('token'), token);
  assert.equal((await api.request('/internal/checkouts', post({ ...approval, amountPaise: 1 }, config.internalKey))).status, 400);

  assert.equal((await api.request(`/v1/payments/${orderId}`)).status, 401);
  assert.equal((await api.request(`/v1/payments/${orderId}`, auth('forged'))).status, 401);
  const before = await api.request(`/v1/payments/${orderId}`, auth(token));
  assert.equal(before.status, 200);
  assert.equal(before.body.amountPaise, amountPaise);
  assert.equal(before.body.canPay, true);
  assert.equal(before.headers.get('Cache-Control'), 'no-store');
  assert.equal((await api.request('/v1/payments/session', post({ orderId }))).status, 401);
  assert.equal((await api.request('/v1/payments/session', post({ orderId }, 'forged'))).status, 401);
  assert.equal((await api.request('/v1/payments/session', post({ orderId, amount: 1 }, token))).status, 400);
  assert.equal((await api.request('/v1/payments/session', post({ orderId, amountPaise: 1 }, token))).status, 400);
  assert.equal(providerCalls, 0, 'Invalid requests must not contact the provider');
  const short = api.ledger.register({ orderId: 'WESTOS-SHORT', amountPaise, expiresAt: Date.now() + 5000 });
  assert.equal((await api.request('/v1/payments/session', post({ orderId: short.orderId }, short.accessToken))).status, 409);

  const simultaneous = await Promise.all(Array.from({ length: 3 }, () => api.request('/v1/payments/session', post({ orderId }, token))));
  assert.equal(createCalls, 1, 'Concurrent session requests must share one provider creation');
  for (const response of simultaneous) {
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { checkoutUrl });
  }
  assert.equal(api.ledger.getInternal(orderId).amountPaise, amountPaise);
  assert.equal(api.ledger.getInternal(orderId).paymentId, paymentId);
  assert.equal((await api.request(`/v1/payments/${orderId}`, auth(token))).body.canPay, true, 'An active existing checkout can be resumed');
  await api.request('/v1/payments/session', post({ orderId }, token));
  assert.equal(createCalls, 1, 'Resuming must reuse the bound payment');

  lookupStatus = 'RECONCILED';
  const polled = await api.request(`/v1/payments/${orderId}`, auth(token));
  assert.equal(polled.body.gatewayStatus, 'RECONCILED');
  assert.equal(polled.body.status, 'pending', 'Status lookup alone must never mark an order paid');
  assert.equal(polled.body.canPay, false);
  assert.equal(api.ledger.getInternal(orderId).status, 'pending');
  const observed = notification('OBSERVED_SUCCESS');
  const tampered = { ...observed.init, headers: { ...observed.init.headers, 'X-Gateway-Signature-V2': `sha256=${'0'.repeat(64)}` } };
  assert.equal((await api.request('/v1/payments/webhook', tampered)).status, 400);
  assert.equal((await api.request('/v1/payments/webhook', notification('OBSERVED_SUCCESS', { amount: '1.00', amountPaise: 100 }).init)).status, 400);
  assert.equal((await api.request('/v1/payments/webhook', notification('OBSERVED_SUCCESS', { paymentId: randomUUID() }).init)).status, 400);
  assert.equal((await api.request('/v1/payments/webhook', observed.init)).status, 200);
  assert.equal(api.ledger.getInternal(orderId).status, 'pending');
  assert.equal((await api.request('/v1/payments/webhook', observed.init)).body.duplicate, true);
  lookupStatus = 'OBSERVED_SUCCESS';
  assert.equal((await api.request(`/v1/payments/${orderId}`, auth(token))).body.canPay, false);

  const reconciled = notification('RECONCILED');
  const paid = await api.request('/v1/payments/webhook', reconciled.init);
  assert.equal(paid.status, 200);
  assert.equal(paid.body.duplicate, false);
  assert.equal(api.ledger.getInternal(orderId).status, 'paid');
  assert.equal((await api.request('/v1/payments/webhook', reconciled.init)).body.duplicate, true);
  assert.equal((await api.request('/v1/payments/webhook', notification('OBSERVED_SUCCESS').init)).status, 200);
  assert.equal(api.ledger.getInternal(orderId).status, 'paid');
  const callsBeforePaidRead = providerCalls;
  const confirmed = await api.request(`/v1/payments/${orderId}`, auth(token));
  assert.equal(confirmed.body.status, 'paid');
  assert.equal(confirmed.body.canPay, false);
  assert.equal(providerCalls, callsBeforePaidRead);
  assert.equal((await api.request('/v1/payments/session', post({ orderId }, token))).status, 409);
  assert.ok(!JSON.stringify(confirmed.body).includes(config.merchantKey));
  console.log('Payment API checks passed (loopback HTTP and mocked gateway only).');
} finally { await api.close(); }
