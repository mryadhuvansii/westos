import {assertInternalInventory, inventoryMutation} from '@/server/inventory';
import {apiError, readMutation} from '@/server/store-data';
import {StoreError} from '@/lib/operations';

export const dynamic = 'force-dynamic';

export async function POST(request:Request) {
  try {
    const env=(await import('cloudflare:workers')).env as Cloudflare.Env;
    assertInternalInventory(request,env.WESTOS_INVENTORY_INTERNAL_KEY);
    if(!env.DB)throw new StoreError(503,'Store storage is not configured.');
    const initialized=await env.DB.prepare('SELECT 1 FROM store_settings WHERE id=1').first();
    if(!initialized)throw new StoreError(503,'Initialize inventory in store management first.');
    const reservationId=await inventoryMutation(env.DB,{userId:'inventory-service',email:'trusted-order-server'},await readMutation(request,true));
    return Response.json({reservationId},{headers:{'Cache-Control':'private, no-store'}});
  } catch(error) {return apiError(error);}
}
