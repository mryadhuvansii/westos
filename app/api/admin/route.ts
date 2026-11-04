import {apiError, getAdminContext, mutateStore, readAdmin, readMutation} from '@/server/store-data';
import {textValue} from '@/lib/operations';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const {db, identity} = await getAdminContext(request);
    const query=new URL(request.url).searchParams.get('reference');
    const reference=query===null?undefined:textValue(query,'Order reference',100);
    return Response.json(await readAdmin(db, identity,reference), {headers: {'Cache-Control': 'private, no-store'}});
  } catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try {
    const {db, identity} = await getAdminContext(request);
    const input = await readMutation(request);
    return Response.json(await mutateStore(db, identity, input), {headers: {'Cache-Control': 'private, no-store'}});
  } catch (error) { return apiError(error); }
}
