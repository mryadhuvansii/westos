import { createHmac, timingSafeEqual } from 'node:crypto';

export type YoupiConfig = { apiUrl: string; checkoutOrigin: string; merchantId: string; merchantKey: string };
export type YoupiStatus = 'INITIATED' | 'QUEUED' | 'ACTIVE' | 'PROCESSING' | 'OBSERVED_SUCCESS' | 'MANUAL_REVIEW' | 'RECONCILED' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'EXPIRED';
export type YoupiOrderState = 'pending' | 'review' | 'paid' | 'failed' | 'cancelled' | 'expired';
export type YoupiPaymentMethod = 'UPI' | 'COD' | 'CASH_COUNTER' | 'CARD_COUNTER';
export type YoupiSettlementState = 'NOT_APPLICABLE' | 'NOT_RECONCILED' | 'MANUAL_REVIEW' | 'RECONCILED' | 'NOT_BANK_SETTLEMENT';
export type ExpectedYoupiPayment = { paymentId: string; orderId: string; amountPaise: number };
export type CreateYoupiPaymentInput = { orderId: string; amountPaise: number; returnUrl: string };
export type CreatedYoupiPayment = ExpectedYoupiPayment & { amount: string; currency: 'INR'; status: YoupiStatus; checkoutUrl: string };
export type YoupiPayment = Omit<CreatedYoupiPayment, 'checkoutUrl'> & { method: YoupiPaymentMethod; settlementState: YoupiSettlementState };
export type YoupiWebhook = Omit<YoupiPayment, 'status'> & { event: YoupiStatus; deliveryId: string; timestamp: number; utr: string };

const states: YoupiStatus[] = ['INITIATED', 'QUEUED', 'ACTIVE', 'PROCESSING', 'OBSERVED_SUCCESS', 'MANUAL_REVIEW', 'RECONCILED', 'SUCCESS', 'FAILED', 'CANCELLED', 'EXPIRED'];
const terminalStates = new Set<YoupiStatus>(['OBSERVED_SUCCESS', 'MANUAL_REVIEW', 'RECONCILED', 'SUCCESS', 'FAILED', 'CANCELLED', 'EXPIRED']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`YouPI: ${message}`);
}

function object(value: unknown): Record<string, unknown> {
  requireValue(value !== null && typeof value === 'object' && !Array.isArray(value), 'invalid response object.');
  return value as Record<string, unknown>;
}

function checkedUrl(value: string, originOnly = false): URL {
  requireValue(typeof value === 'string' && value.length <= 2048 && value === value.trim(), 'invalid URL.');
  const url = new URL(value);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  requireValue(url.protocol === 'https:' || (url.protocol === 'http:' && local), 'HTTPS is required except on localhost.');
  requireValue(!url.username && !url.password && !url.hash, 'URL credentials and fragments are forbidden.');
  if (originOnly) requireValue(url.pathname === '/' && !url.search, 'configure a bare service origin.');
  return url;
}

function amount(value: unknown): number {
  requireValue(typeof value === 'number' || (typeof value === 'string' && /^[1-9]\d{0,15}$/.test(value)), 'invalid amount in paise.');
  const number = Number(value);
  requireValue(Number.isSafeInteger(number) && number > 0, 'amount must be a positive safe integer in paise.');
  return number;
}

function rupees(paise: number): string {
  return `${Math.floor(paise / 100)}.${String(paise % 100).padStart(2, '0')}`;
}

function orderId(value: unknown): asserts value is string {
  requireValue(typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value), 'invalid order ID.');
}

function paymentId(value: unknown): asserts value is string {
  requireValue(typeof value === 'string' && uuid.test(value), 'invalid payment ID.');
}

function settlementFor(status: YoupiStatus): YoupiSettlementState {
  if (status === 'RECONCILED' || status === 'MANUAL_REVIEW') return status;
  if (status === 'OBSERVED_SUCCESS') return 'NOT_RECONCILED';
  return status === 'SUCCESS' ? 'NOT_BANK_SETTLEMENT' : 'NOT_APPLICABLE';
}

function paymentFields(value: unknown, webhook = false): YoupiPayment {
  const data = object(value);
  paymentId(data.paymentId);
  orderId(data.orderId);
  const amountPaise = amount(data.amountPaise);
  requireValue(data.amount === rupees(amountPaise) && data.currency === 'INR', 'amount or currency is inconsistent.');
  const status = webhook ? data.event : data.status;
  requireValue(typeof status === 'string' && states.includes(status as YoupiStatus), 'unknown payment status.');
  requireValue(!webhook || terminalStates.has(status as YoupiStatus), 'unknown webhook event.');
  requireValue(typeof data.method === 'string' && ['UPI', 'COD', 'CASH_COUNTER', 'CARD_COUNTER'].includes(data.method), 'unknown payment method.');
  requireValue(data.settlementState === settlementFor(status as YoupiStatus), 'inconsistent settlement state.');
  return { paymentId: data.paymentId, orderId: data.orderId, amountPaise, amount: data.amount as string,
    currency: 'INR', status: status as YoupiStatus, method: data.method as YoupiPaymentMethod,
    settlementState: data.settlementState as YoupiSettlementState };
}

async function request(config: YoupiConfig, path: string, init: RequestInit, fetchImpl: typeof fetch): Promise<unknown> {
  const api = checkedUrl(config.apiUrl, true);
  checkedUrl(config.checkoutOrigin, true);
  // YouPI's seeded merchant uses 00000000-0000-0000-0000-000000000001.
  requireValue(typeof config.merchantId === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(config.merchantId), 'configure a merchant UUID.');
  requireValue(typeof config.merchantKey === 'string' && config.merchantKey.trim() === config.merchantKey &&
    config.merchantKey.length > 0 && config.merchantKey.length <= 512 && !/[\r\n]/.test(config.merchantKey), 'configure a valid merchant key.');
  const response = await fetchImpl(new URL(path, api), {
    ...init, redirect: 'error', signal: AbortSignal.timeout(15000),
    headers: { 'Content-Type': 'application/json', 'X-Merchant-Id': config.merchantId,
      'X-Merchant-Key': config.merchantKey, ...init.headers },
  });
  requireValue(response.ok, `gateway request failed with HTTP ${response.status}.`);
  const text = await response.text();
  requireValue(text.length <= 65536, 'gateway response is too large.');
  return JSON.parse(text) as unknown;
}

export async function createYoupiPayment(config: YoupiConfig, input: CreateYoupiPaymentInput, fetchImpl: typeof fetch = fetch): Promise<CreatedYoupiPayment> {
  orderId(input.orderId);
  requireValue(typeof input.amountPaise === 'number', 'server amount must be integer paise.');
  const amountPaise = amount(input.amountPaise);
  const returnUrl = checkedUrl(input.returnUrl).href;
  const data = object(await request(config, '/api/v1/payments', {
    method: 'POST', headers: { 'Idempotency-Key': input.orderId },
    body: JSON.stringify({ orderId: input.orderId, amount: rupees(amountPaise), currency: 'INR', method: 'UPI', returnUrl }),
  }, fetchImpl));
  paymentId(data.paymentId);
  requireValue(data.orderId === input.orderId && amount(data.amountPaise) === amountPaise &&
    data.amount === rupees(amountPaise) && data.currency === 'INR', 'created payment does not match the order.');
  requireValue(typeof data.status === 'string' && states.includes(data.status as YoupiStatus), 'unknown payment status.');
  requireValue(typeof data.checkoutUrl === 'string', 'missing checkout URL.');
  const checkout = checkedUrl(data.checkoutUrl);
  requireValue(checkout.origin === checkedUrl(config.checkoutOrigin, true).origin &&
    checkout.pathname === `/checkout/${data.paymentId}` && !checkout.search, 'checkout URL is not the configured payment checkout.');
  return { paymentId: data.paymentId, orderId: input.orderId, amountPaise, amount: rupees(amountPaise),
    currency: 'INR', status: data.status as YoupiStatus, checkoutUrl: checkout.href };
}

export async function getYoupiPayment(config: YoupiConfig, id: string, fetchImpl: typeof fetch = fetch): Promise<YoupiPayment> {
  paymentId(id);
  const payment = paymentFields(await request(config, `/api/v1/payments/${id}`, { method: 'GET' }, fetchImpl));
  requireValue(payment.paymentId === id, 'returned payment ID does not match.');
  return payment;
}

export function verifyYoupiWebhook(rawBody: Buffer, headers: Record<string, string | undefined>, secret: string, now = Date.now()): YoupiWebhook {
  requireValue(Buffer.isBuffer(rawBody) && rawBody.length > 0 && rawBody.length <= 65536, 'invalid webhook body.');
  requireValue(typeof secret === 'string' && secret.length >= 32, 'configure a strong webhook secret.');
  const header = (name: string) => {
    const matching = Object.entries(headers).filter(([key]) => key.toLowerCase() === name);
    requireValue(matching.length === 1 && typeof matching[0][1] === 'string', `missing or duplicate ${name}.`);
    return matching[0][1] as string;
  };
  const signature = header('x-gateway-signature-v2');
  const timestampHeader = header('x-gateway-timestamp');
  const deliveryId = header('x-gateway-delivery-id');
  const event = header('x-gateway-event');
  requireValue(/^sha256=[0-9a-f]{64}$/.test(signature), 'invalid webhook signature format.');
  requireValue(/^[1-9]\d{12,15}$/.test(timestampHeader), 'invalid webhook timestamp.');
  const timestamp = Number(timestampHeader);
  requireValue(Number.isSafeInteger(timestamp) && Number.isSafeInteger(now) && now - timestamp <= 7200000 && timestamp - now <= 60000, 'webhook timestamp is outside the retry window.');
  requireValue(uuid.test(deliveryId), 'invalid webhook delivery ID.');
  const expected = createHmac('sha256', secret).update(`${timestampHeader}.`).update(rawBody).digest();
  requireValue(timingSafeEqual(Buffer.from(signature.slice(7), 'hex'), expected), 'invalid webhook signature.');
  const data = object(JSON.parse(rawBody.toString('utf8')) as unknown);
  requireValue(data.deliveryId === deliveryId && data.timestamp === timestamp && data.event === event, 'signed webhook fields do not match headers.');
  const { status, ...payment } = paymentFields(data, true);
  requireValue(typeof data.utr === 'string' && (data.utr === '' || /^\d{12}$/.test(data.utr)), 'invalid bank reference.');
  // The order ledger must persist deliveryId to deduplicate valid retries across restarts.
  return { ...payment, event: status, deliveryId, timestamp, utr: data.utr };
}

export function classifyYoupiPayment(event: YoupiPayment | YoupiWebhook, expected: ExpectedYoupiPayment): YoupiOrderState {
  paymentId(expected.paymentId);
  orderId(expected.orderId);
  const data = object(event);
  const payment = paymentFields(data, 'event' in data);
  requireValue(payment.paymentId === expected.paymentId && payment.orderId === expected.orderId &&
    payment.amountPaise === amount(expected.amountPaise), 'payment does not match the expected order.');
  // Counter/COD confirmations represent a different collection process, never a paid UPI order.
  if (payment.method !== 'UPI') return 'review';
  if (payment.status === 'RECONCILED') return 'paid';
  if (payment.status === 'MANUAL_REVIEW' || payment.status === 'SUCCESS') return 'review';
  if (payment.status === 'FAILED') return 'failed';
  if (payment.status === 'CANCELLED') return 'cancelled';
  if (payment.status === 'EXPIRED') return 'expired';
  return 'pending';
}
