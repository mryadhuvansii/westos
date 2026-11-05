import {getAdminContext} from '@/server/store-data';
import {createPaymentTransaction, getPaymentTransactionByOrderId} from '@/server/customer-data';
import {StoreError, object, textValue} from '@/lib/operations';
import {createHash} from 'node:crypto';
export const dynamic = 'force-dynamic';
function phonepeEnv() {
  const env = process.env;
  return {
    merchantId: env.PHONEPE_MERCHANT_ID ?? '',
    saltKey: env.PHONEPE_SALT_KEY ?? '',
    saltIndex: env.PHONEPE_SALT_INDEX ?? '1',
    environment: (env.PHONEPE_ENVIRONMENT ?? 'SANDBOX') as 'SANDBOX' | 'PRODUCTION',
  };
}
function phonepeBaseUrl(env: {environment: string}) {
  return env.environment === 'PRODUCTION' ? 'https://api.phonepe.com' : 'https://api-preprod.phonepe.com';
}
export async function POST(request: Request) {
  try {
    const {db} = await getAdminContext(request);
    const body = await request.json();
    const p = object(body);
    const orderId = textValue(p.orderId, 'Order ID', 100);
    const amount = Math.round(Number(textValue(p.amount, 'Amount', 20)));
    if (!amount || amount <= 0) throw new StoreError(400, 'Amount must be greater than zero.');
    const existing = await getPaymentTransactionByOrderId(db, orderId);
    if (existing && existing.status === 'SUCCESS') throw new StoreError(400, 'Order already paid.');
    const env = phonepeEnv();
    if (!env.merchantId || !env.saltKey) throw new StoreError(503, 'PhonePe not configured. Please contact store owner.');
    const merchantTransactionId = `WS_${Date.now()}`;
    const payload = {
      merchantId: env.merchantId,
      merchantTransactionId,
      amount: amount * 100,
      currency: 'INR',
      callbackUrl: `${new URL(request.url).origin}/api/payment/callback`,
      redirectUrl: `${new URL(request.url).origin}/payment/success`,
      redirectMode: 'POST',
      mobileNumber: '',
      paymentInstrument: {type: 'PAY_PAGE'},
    };
    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const xVerify = createHash('sha256').update(base64Payload + '/v3/pg/pay' + env.saltKey).digest('hex') + '###' + env.saltIndex;
    const res = await fetch(`${phonepeBaseUrl(env)}/v3/pg/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': xVerify,
        'X-MERCHANT-ID': env.merchantId,
        'accept': 'application/json',
      },
      body: JSON.stringify({request: base64Payload}),
    });
    const phonepeResult = await res.json();
    if (!res.ok) throw new StoreError(502, phonepeResult?.message || 'PhonePe payment request failed.');
    const data = phonepeResult.data?.response ?? phonepeResult.data;
    const redirectUrl = data?.redirectUrl || data?.instrumentResponse?.redirectInfo?.url || data?.redirectInfo?.url;
    if (!redirectUrl) throw new StoreError(502, 'PhonePe did not return a redirect URL.');
    await createPaymentTransaction(db, {orderId, amount, currency: 'INR'});
    return Response.json({paymentId: merchantTransactionId, redirectUrl, status: 'PENDING'}, {headers: {'Cache-Control': 'no-store'}});
  } catch (error) {
    if (error instanceof StoreError) return Response.json({error: error.message}, {status: error.status, headers: {'Cache-Control': 'no-store'}});
    return Response.json({error: 'Payment creation failed.'}, {status: 500, headers: {'Cache-Control': 'no-store'}});
  }
}