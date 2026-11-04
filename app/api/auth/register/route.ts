import {createCustomer, getDb} from '@/server/customer-data';
import {object, textValue, StoreError} from '@/lib/operations';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const p = object(body);
    const email = textValue(p.email, 'Email', 200);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new StoreError(400, 'Enter a valid email address.');
    const name = textValue(p.name, 'Name', 100);
    const phone = p.phone ? textValue(p.phone, 'Phone', 20) : undefined;
    const password = p.password ? textValue(p.password, 'Password', 128, 8) : undefined;
    if (!password) throw new StoreError(400, 'Password is required.');
    const db = await getDb();
    const customer = await createCustomer(db, {email, phone, name, password});
    return Response.json({customer, message: 'Account created successfully.'}, {status: 201});
  } catch (error) {
    if (error instanceof StoreError) return Response.json({error: error.message}, {status: error.status, headers: {'Cache-Control': 'no-store'}});
    return Response.json({error: 'Registration failed.'}, {status: 500, headers: {'Cache-Control': 'no-store'}});
  }
}