import {getDb} from '@/server/customer-data';
import {getAdminContext} from '@/server/store-data';
import {StoreError, object, textValue} from '@/lib/operations';
import {listAllOrders, updateOrderStatus} from '@/server/customer-data';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const {db} = await getAdminContext(request);
    const orders = await listAllOrders(db);
    return Response.json({orders}, {headers: {'Cache-Control': 'private, no-store'}});
  } catch (error) {
    if (error instanceof StoreError) return Response.json({error: error.message}, {status: error.status, headers: {'Cache-Control': 'no-store'}});
    return Response.json({error: 'Failed to load orders.'}, {status: 500, headers: {'Cache-Control': 'no-store'}});
  }
}
export async function PATCH(request: Request) {
  try {
    const {db} = await getAdminContext(request);
    const body = await request.json();
    const p = object(body);
    const orderId = textValue(p.orderId, 'Order ID', 80);
    const status = textValue(p.status, 'Status', 50);
    const result = await updateOrderStatus(db, orderId, status);
    return Response.json({order: result, message: 'Order status updated.'}, {headers: {'Cache-Control': 'no-store'}});
  } catch (error) {
    if (error instanceof StoreError) return Response.json({error: error.message}, {status: error.status, headers: {'Cache-Control': 'no-store'}});
    return Response.json({error: 'Failed to update order.'}, {status: 500, headers: {'Cache-Control': 'no-store'}});
  }
}