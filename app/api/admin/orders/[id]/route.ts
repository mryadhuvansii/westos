import {getAdminContext} from '@/server/store-data';
import {getOrderDetail} from '@/server/customer-data';
import {StoreError} from '@/lib/operations';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const {db} = await getAdminContext(request);
    const {id} = await params;
    const order = await getOrderDetail(db, id);
    if (!order) throw new StoreError(404, 'Order not found.');
    return Response.json({order}, {headers: {'Cache-Control': 'no-store'}});
  } catch (error) {
    if (error instanceof StoreError) return Response.json({error: error.message}, {status: error.status, headers: {'Cache-Control': 'no-store'}});
    return Response.json({error: 'Failed to load order.'}, {status: 500, headers: {'Cache-Control': 'no-store'}});
  }
}