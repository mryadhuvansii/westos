import {createOrder, getDb, listCustomerOrders} from '@/server/customer-data';
import {validateCustomerSession} from '@/server/customer-data';
import {object, StoreError} from '@/lib/operations';
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
    const orders = await listCustomerOrders(db, identity.customerId);
    return Response.json({orders}, {headers: {'Cache-Control': 'no-store'}});
  } catch (error) {
    if (error instanceof StoreError) return Response.json({error: error.message}, {status: error.status, headers: {'Cache-Control': 'no-store'}});
    return Response.json({error: 'Failed to load orders.'}, {status: 500, headers: {'Cache-Control': 'no-store'}});
  }
}
export async function POST(request: Request) {
  try {
    const token = requireIdentity(request);
    const identity = await validateCustomerSession(await getDb(), token);
    if (!identity) throw new StoreError(401, 'Session expired or invalid. Please log in again.');
    const body = await request.json();
    const p = object(body);
    const items = p.items;
    if (!Array.isArray(items) || !items.length) throw new StoreError(400, 'At least one item is required.');
    const db = await getDb();
    const order = await createOrder(db, {
      customerId: identity.customerId,
      customerEmail: identity.email,
      items: items.map((item: any) => ({
        variantId: item.variantId,
        sku: item.sku,
        productName: item.productName,
        colorName: item.colorName,
        size: item.size,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
      shippingAddressId: p.shippingAddressId ?? undefined,
      billingAddressId: p.billingAddressId ?? undefined,
    });
    return Response.json({order, message: 'Order created successfully.'}, {status: 201, headers: {'Cache-Control': 'no-store'}});
  } catch (error) {
    if (error instanceof StoreError) return Response.json({error: error.message}, {status: error.status, headers: {'Cache-Control': 'no-store'}});
    return Response.json({error: 'Order creation failed.'}, {status: 500, headers: {'Cache-Control': 'no-store'}});
  }
}