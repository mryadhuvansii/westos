import {getAdminContext} from '@/server/store-data';
import {getDashboardStats} from '@/server/customer-data';
import {StoreError} from '@/lib/operations';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const {db} = await getAdminContext(request);
    const stats = await getDashboardStats(db);
    return Response.json(stats, {headers: {'Cache-Control': 'no-store'}});
  } catch (error) {
    if (error instanceof StoreError) return Response.json({error: error.message}, {status: error.status, headers: {'Cache-Control': 'no-store'}});
    return Response.json({error: 'Failed to load dashboard stats.'}, {status: 500, headers: {'Cache-Control': 'no-store'}});
  }
}