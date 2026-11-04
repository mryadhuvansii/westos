import {getDb} from '@/server/customer-data';
import {getCustomerById, validateCustomerSession} from '@/server/customer-data';
import {StoreError} from '@/lib/operations';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const auth = request.headers.get('authorization');
    if (!auth) throw new StoreError(401, 'Authentication required.');
    const match = /^Bearer (.+)$/i.exec(auth);
    if (!match) throw new StoreError(401, 'Invalid authorization header.');
    const db = await getDb();
    const identity = await validateCustomerSession(db, match[1]);
    if (!identity) throw new StoreError(401, 'Session expired or invalid. Please log in again.');
    const customer = await getCustomerById(db, identity.customerId);
    if (!customer) throw new StoreError(404, 'Customer not found.');
    const {passwordHash, ...rest} = customer;
    return Response.json({customer: rest}, {headers: {'Cache-Control': 'no-store'}});
  } catch (error) {
    if (error instanceof StoreError) return Response.json({error: error.message}, {status: error.status, headers: {'Cache-Control': 'no-store'}});
    return Response.json({error: 'Failed to load account.'}, {status: 500, headers: {'Cache-Control': 'no-store'}});
  }
}