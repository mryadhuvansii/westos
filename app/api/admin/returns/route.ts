import {getAdminContext} from '@/server/store-data';
import {StoreError, object, textValue} from '@/lib/operations';
import {listAllReturns, updateReturnStatus} from '@/server/customer-data';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const {db} = await getAdminContext(request);
    const returns = await listAllReturns(db);
    return Response.json({returns}, {headers: {'Cache-Control': 'private, no-store'}});
  } catch (error) {
    if (error instanceof StoreError) return Response.json({error: error.message}, {status: error.status, headers: {'Cache-Control': 'no-store'}});
    return Response.json({error: 'Failed to load returns.'}, {status: 500, headers: {'Cache-Control': 'no-store'}});
  }
}
export async function PATCH(request: Request) {
  try {
    const {db} = await getAdminContext(request);
    const body = await request.json();
    const p = object(body);
    const returnId = textValue(p.returnId, 'Return ID', 80);
    const status = textValue(p.status, 'Status', 50);
    const result = await updateReturnStatus(db, returnId, status);
    return Response.json({ret: result, message: 'Return status updated.'}, {headers: {'Cache-Control': 'no-store'}});
  } catch (error) {
    if (error instanceof StoreError) return Response.json({error: error.message}, {status: error.status, headers: {'Cache-Control': 'no-store'}});
    return Response.json({error: 'Failed to update return.'}, {status: 500, headers: {'Cache-Control': 'no-store'}});
  }
}