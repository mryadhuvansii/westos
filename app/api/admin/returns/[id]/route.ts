import {getAdminContext} from '@/server/store-data';
import {updateReturnStatus} from '@/server/customer-data';
import {StoreError, object, textValue} from '@/lib/operations';
export const dynamic = 'force-dynamic';
export async function PATCH(request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const {db} = await getAdminContext(request);
    const {id} = await params;
    const body = await request.json();
    const p = object(body);
    const status = textValue(p.status, 'Status', 50);
    const result = await updateReturnStatus(db, id, status);
    return Response.json({ret: result, message: 'Return status updated.'}, {headers: {'Cache-Control': 'no-store'}});
  } catch (error) {
    if (error instanceof StoreError) return Response.json({error: error.message}, {status: error.status, headers: {'Cache-Control': 'no-store'}});
    return Response.json({error: 'Failed to update return.'}, {status: 500, headers: {'Cache-Control': 'no-store'}});
  }
}