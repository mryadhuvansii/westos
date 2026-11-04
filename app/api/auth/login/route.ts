import {authenticateCustomer, createCustomerSession, getDb} from '@/server/customer-data';
import {object, textValue, StoreError} from '@/lib/operations';
import {signToken} from '@/lib/crypto';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const p = object(body);
    const email = textValue(p.email, 'Email', 200);
    const password = textValue(p.password, 'Password', 128, 1);
    const db = await getDb();
    const customer = await authenticateCustomer(db, email, password);
    const token = await createCustomerSession(db, customer.id);
    return Response.json({customer: {id: customer.id, email: customer.email, name: customer.name}, token, message: 'Logged in successfully.'}, {headers: {'Cache-Control': 'no-store'}});
  } catch (error) {
    if (error instanceof StoreError) return Response.json({error: error.message}, {status: error.status, headers: {'Cache-Control': 'no-store'}});
    return Response.json({error: 'Login failed.'}, {status: 500, headers: {'Cache-Control': 'no-store'}});
  }
}