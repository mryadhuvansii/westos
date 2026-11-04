import {createReturn, getDb, listCustomerReturns} from '@/server/customer-data';
import {validateCustomerSession} from '@/server/customer-data';
import {object, StoreError, textValue} from '@/lib/operations';
export const dynamic = 'force-dynamic';
function requireIdentity(request: Request) {
  const auth = request.headers.get('authorization');
  if (!auth) throw new StoreError(401, 'Authentication required.');
  const match = /^Bearer (.+)$/i.exec(auth);
  if (!match) throw new StoreError(401, 'Invalid authorization header.');
  return match[1];
}
export async function GET(request: Request) {
  try {
    const token = requireIdentity(request);
    const db = await getDb();
    const identity = await validateCustomerSession(db, token);
    if (!identity) throw new StoreError(401, 'Session expired or invalid. Please log in again.');
    const returns = await listCustomerReturns(db, identity.customerId);
    return Response.json({returns}, {headers: {'Cache-Control': 'no-store'}});
  } catch (error) {
    if (error instanceof StoreError) return Response.json({error: error.message}, {status: error.status, headers: {'Cache-Control': 'no-store'}});
    return Response.json({error: 'Failed to load returns.'}, {status: 500, headers: {'Cache-Control': 'no-store'}});
  }
}
export async function POST(request: Request) {
  try {
    const token = requireIdentity(request);
    const db = await getDb();
    const identity = await validateCustomerSession(db, token);
    if (!identity) throw new StoreError(401, 'Session expired or invalid. Please log in again.');
    const body = await request.json();
    const p = object(body);
    const orderId = textValue(p.orderId, 'Order ID', 80);
    const reason = textValue(p.reason, 'Reason', 500);
    const items = p.items;
    if (!Array.isArray(items) || !items.length) throw new StoreError(400, 'At least one item is required.');
    const ret = await createReturn(db, {
      orderId,
      customerId: identity.customerId,
      reason,
      items: items.map((item: any) => ({orderItemId: item.orderItemId, quantity: item.quantity})),
    });
    return Response.json({ret, message: 'Return request submitted.'}, {status: 201, headers: {'Cache-Control': 'no-store'}});
  } catch (error) {
    if (error instanceof StoreError) return Response.json({error: error.message}, {status: error.status, headers: {'Cache-Control': 'no-store'}});
    return Response.json({error: 'Return request failed.'}, {status: 500, headers: {'Cache-Control': 'no-store'}});
  }
}