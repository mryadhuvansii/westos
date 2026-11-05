import {getAdminContext} from '@/server/store-data';
import {getStockMovements} from '@/server/customer-data';
import {StoreError} from '@/lib/operations';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const {db} = await getAdminContext(request);
    const url = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50', 10)));
    const movements = await getStockMovements(db, limit);
    return Response.json({movements}, {headers: {'Cache-Control': 'no-store'}});
  } catch (error) {
    if (error instanceof StoreError) return Response.json({error: error.message}, {status: error.status, headers: {'Cache-Control': 'no-store'}});
    return Response.json({error: 'Failed to load stock movements.'}, {status: 500, headers: {'Cache-Control': 'no-store'}});
  }
}