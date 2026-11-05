import {getAdminContext} from '@/server/store-data';
import {getPaymentTransactionByOrderId, updateOrderStatus, updatePaymentTransaction} from '@/server/customer-data';
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
export async function POST(request: Request) {
  try {
    const {db} = await getAdminContext(request);
    const body = await request.json();
    const p = object(body);
    const response = textValue(p.response, 'Response', 5000);
    const env = phonepeEnv();
    const base64Decoded = Buffer.from(response, 'base64').toString('utf-8');
    const decoded = JSON.parse(base64Decoded);
    const merchantTransactionId = decoded.merchantTransactionId;
    const status = decoded.paymentStatus; // PAYMENT_SUCCESS / PAYMENT_FAILED
    const phonepeTransactionId = decoded.transactionId;
    const amount = decoded.amount ? decoded.amount / 100 : 0;
    const xVerifyInput = `/v3/pg/pay/status/${env.merchantId}/${merchantTransactionId}` + env.saltKey;
    const xVerify = createHash('sha256').update(xVerifyInput).digest('hex') + '###' + env.saltIndex;
    // Verify with PhonePe status API
    const statusRes = await fetch(`https://api-preprod.phonepe.com/v3/pg/pay/status/${env.merchantId}/${merchantTransactionId}`, {
      headers: {'Content-Type': 'application/json', 'X-VERIFY': xVerify, 'X-MERCHANT-ID': env.merchantId},
    });
    const statusResult = await statusRes.json();
    const success = statusResult?.code === 'PAYMENT_SUCCESS' || status === 'PAYMENT_SUCCESS';
    const payment = await getPaymentTransactionByOrderId(db, merchantTransactionId.replace('WS_', '')) || await getPaymentTransactionByOrderId(db, merchantTransactionId);
    if (payment) {
      await updatePaymentTransaction(db, payment.id, {
        phonepeTransactionId,
        status: success ? 'SUCCESS' : 'FAILED',
        phonepeResponse: JSON.stringify(decoded),
      });
      if (success) {
        await updateOrderStatus(db, payment.id.startsWith('WS_') ? payment.id : merchantTransactionId.replace('WS_', ''), 'confirmed');
      }
    }
    return Response.redirect(`${new URL(request.url).origin}/payment/${success ? 'success' : 'failure'}?orderId=${payment?.order_id || 'unknown'}`);
  } catch (error) {
    return Response.redirect(`${new URL(request.url).origin}/payment/failure?error=${encodeURIComponent(error instanceof Error ? error.message : 'Callback failed')}`);
  }
}
export async function GET(request: Request) {
  const url = new URL(request.url);
  return Response.redirect(`${url.origin}/payment/failure?error=callback_not_supported_via_get`);
}