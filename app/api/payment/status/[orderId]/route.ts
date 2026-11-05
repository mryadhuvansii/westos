import {getAdminContext} from '@/server/store-data';
import {getPaymentStatus} from '@/server/customer-data';
import {StoreError} from '@/lib/operations';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, {params}: {params: Promise<{orderId: string}>}) {
  try {
    const {db} = await getAdminContext(request);
    const {orderId} = await params;
    const payment = await getPaymentStatus(db, orderId);
    if (!payment) return Response.json({error: 'Payment not found.'}, {status: 404, headers: {'Cache-Control': 'no-store'}});
    return Response.json({payment}, {headers: {'Cache-Control': 'no-store'}});
  } catch (error) {
    if (error instanceof StoreError) return Response.json({error: error.message}, {status: error.status, headers: {'Cache-Control': 'no-store'}});
    return Response.json({error: 'Failed to load payment status.'}, {status: 500, headers: {'Cache-Control': 'no-store'}});
  }
}