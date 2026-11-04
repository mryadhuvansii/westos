import {timingSafeEqual} from 'node:crypto';
import {fields, integer, object, StoreError, textValue, type Identity, type InventoryReservation, type StockVariant} from '../lib/operations.ts';

// The database clock decides hold eligibility, including concurrent requests from different workers.
export const databaseNow = "CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)";
export const heldQuantity = (variant = 'v.id') => `(SELECT COALESCE(SUM(l.quantity),0) FROM stock_reservation_lines l JOIN stock_reservations r ON r.id=l.reservation_id WHERE l.variant_id=${variant} AND r.status='held' AND r.expires_at>${databaseNow})`;
type VariantRow = {id:string; product_id:string; color_id:string; size:number; sku:string; on_hand:number; reserved:number; revision:number};
type ReservationRow = {id:string; reference:string; status:InventoryReservation['status']; expires_at:number; created_at:string; revision:number};
type LineRow = {reservation_id:string; variant_id:string; sku:string; product_name:string; color_name:string; size:number; quantity:number; returned:number};
type RequestRow = {fingerprint:string; reservation_id:string; operation_token:string};

export async function inventoryReady(db:D1Database) {
  return !(await db.prepare('SELECT 1 AS legacy FROM store_products WHERE inventory_version=0 LIMIT 1').first());
}
export async function readVariants(db:D1Database):Promise<(StockVariant & {productId:string})[]> {
  const rows=await db.prepare(`SELECT v.*,${heldQuantity()} AS reserved FROM stock_variants v WHERE v.active=1 ORDER BY v.product_id,v.color_id,v.size`).all<VariantRow>();
  return rows.results.map(v=>({id:v.id,productId:v.product_id,colorId:v.color_id,size:v.size,sku:v.sku,onHand:v.on_hand,reserved:v.reserved,available:v.on_hand-v.reserved,revision:v.revision}));
}
export async function readReservations(db:D1Database,reference?:string):Promise<InventoryReservation[]> {
  // ponytail: the owner desk shows 100 recent references plus exact lookup; add pagination for bulk history browsing.
  const query=`SELECT id,reference,CASE WHEN status='held' AND expires_at<=${databaseNow} THEN 'expired' ELSE status END AS status,expires_at,created_at,revision FROM stock_reservations ${reference?'WHERE reference=?':''} ORDER BY created_at DESC,id DESC LIMIT 100`;
  const rows=await (reference?db.prepare(query).bind(reference):db.prepare(query)).all<ReservationRow>();
  if(!rows.results.length)return [];
  const ids=JSON.stringify(rows.results.map(row=>row.id));
  const lines=await db.prepare('SELECT * FROM stock_reservation_lines WHERE reservation_id IN (SELECT value FROM json_each(?)) ORDER BY variant_id').bind(ids).all<LineRow>();
  return rows.results.map(row=>({id:row.id,reference:row.reference,status:row.status,expiresAt:new Date(row.expires_at).toISOString(),createdAt:row.created_at,revision:row.revision,lines:lines.results.filter(line=>line.reservation_id===row.id).map(line=>({variantId:line.variant_id,sku:line.sku,productName:line.product_name,colorName:line.color_name,size:line.size,quantity:line.quantity,returned:line.returned}))}));
}

function requestId(value:unknown) {
  const id=textValue(value,'Retry key',100,8);
  if(!/^[A-Za-z0-9_-]+$/.test(id))throw new StoreError(400,'Use letters, numbers, underscores or hyphens for the retry key.');
  return id;
}
export function assertInternalInventory(request:Request,key:string|undefined) {
  if(!key||key.length<32)throw new StoreError(503,'The private inventory connection is not configured.');
  if(request.headers.has('origin')||request.headers.get('sec-fetch-site'))throw new StoreError(403,'Inventory service access is available only to the trusted order server.');
  const supplied=/^Bearer ([^\s]+)$/i.exec(request.headers.get('authorization')??'')?.[1]??'';
  const actual=new TextEncoder().encode(supplied),expected=new TextEncoder().encode(key);
  if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw new StoreError(401,'Invalid inventory service credentials.');
}

export async function inventoryMutation(db:D1Database,identity:Identity,input:Record<string,unknown>):Promise<string> {
  if(!await inventoryReady(db))throw new StoreError(409,'Upgrade inventory before reserving or selling stock.');
  const action=input.action,id=requestId(input.requestId);
  let payload:Record<string,unknown>,reservationId:string,reason:string,condition:string,conditionValues:(string|number)[];
  let lines:{variantId:string;quantity:number}[]=[];
  if(action==='reserveStock') {
    fields(input,['action','reference','lines','holdMinutes','requestId']);
    const reference=textValue(input.reference,'Order reference',100),holdMinutes=integer(input.holdMinutes,'Hold duration',60,1);
    if(!Array.isArray(input.lines)||!input.lines.length||input.lines.length>20)throw new StoreError(400,'Reserve between 1 and 20 different SKUs per reference.');
    lines=input.lines.map(value=>{const line=object(value);fields(line,['variantId','quantity']);return {variantId:textValue(line.variantId,'Variant',150),quantity:integer(line.quantity,'Quantity',1000000,1)};}).sort((a,b)=>a.variantId.localeCompare(b.variantId));
    if(new Set(lines.map(line=>line.variantId)).size!==lines.length)throw new StoreError(400,'List each SKU only once in a reservation.');
    payload={action,reference,holdMinutes,lines};reservationId=crypto.randomUUID();reason=`Stock reserved for ${reference}`;
    condition=`NOT EXISTS(SELECT 1 FROM stock_reservations WHERE reference=?) AND (SELECT COUNT(*) FROM json_each(?) wanted JOIN stock_variants v ON v.id=json_extract(wanted.value,'$.variantId') JOIN store_products p ON p.id=v.product_id WHERE v.active=1 AND p.inventory_version=1 AND json_extract(p.data,'$.status')='published' AND v.on_hand-${heldQuantity()}>=json_extract(wanted.value,'$.quantity'))=?`;
    conditionValues=[reference,JSON.stringify(lines),lines.length];
  } else if(action==='commitStock'||action==='releaseStock'||action==='returnStock') {
    fields(input,action==='commitStock'?['action','reservationId','requestId']:action==='releaseStock'?['action','reservationId','requestId','reason']:['action','reservationId','requestId','variantId','quantity','reason','inspected']);
    reservationId=textValue(input.reservationId,'Reservation',100);
    reason=action==='commitStock'?'Stock sale recorded; payment verification is separate':textValue(input.reason,'Reason',300,3);
    payload={action,reservationId,...(action==='commitStock'?{}:{reason})};
    if(action==='returnStock') {
      if(input.inspected!==true)throw new StoreError(400,'Physically receive and inspect the returned pieces before adding sellable stock.');
      const variantId=textValue(input.variantId,'Variant',150),quantity=integer(input.quantity,'Return quantity',1000000,1);
      payload={...payload,variantId,quantity,inspected:true};
      condition="EXISTS(SELECT 1 FROM stock_reservations r JOIN stock_reservation_lines l ON l.reservation_id=r.id JOIN stock_variants v ON v.id=l.variant_id WHERE r.id=? AND r.status='committed' AND l.variant_id=? AND l.returned+?<=l.quantity AND v.active=1 AND v.on_hand+?<=1000000)";
      conditionValues=[reservationId,variantId,quantity,quantity];
    } else if(action==='commitStock') {
      condition=`EXISTS(SELECT 1 FROM stock_reservations WHERE id=? AND status='held' AND expires_at>${databaseNow}) AND EXISTS(SELECT 1 FROM stock_reservation_lines WHERE reservation_id=?) AND NOT EXISTS(SELECT 1 FROM stock_reservation_lines l JOIN stock_variants v ON v.id=l.variant_id WHERE l.reservation_id=? AND v.on_hand<l.quantity)`;
      conditionValues=[reservationId,reservationId,reservationId];
    } else {condition="EXISTS(SELECT 1 FROM stock_reservations WHERE id=? AND status='held')";conditionValues=[reservationId];}
  } else throw new StoreError(400,'Choose a supported inventory action.');

  const fingerprint=JSON.stringify(payload),token=crypto.randomUUID(),now=new Date().toISOString();
  const previous=await db.prepare('SELECT fingerprint,reservation_id,operation_token FROM stock_requests WHERE request_id=?').bind(id).first<RequestRow>();
  if(previous){if(previous.fingerprint!==fingerprint)throw new StoreError(409,'This retry key was already used for a different change.');return previous.reservation_id;}
  // Only this attempt's token may perform the child writes. A racing retry with the same key is a no-op.
  const gate='EXISTS(SELECT 1 FROM stock_requests WHERE request_id=? AND operation_token=?)';
  const statements=[db.prepare(`INSERT INTO stock_requests(request_id,fingerprint,operation_token,reservation_id,created_at) SELECT ?,?,?,?,? WHERE ${condition} ON CONFLICT(request_id) DO NOTHING`).bind(id,fingerprint,token,reservationId,now,...conditionValues)];
  if(action==='reserveStock') {
    statements.push(db.prepare(`INSERT INTO stock_reservations(id,reference,status,expires_at,created_at,revision) SELECT ?,?,'held',${databaseNow}+?, ?,1 WHERE ${gate}`).bind(reservationId,payload.reference as string,(payload.holdMinutes as number)*60000,now,id,token));
    statements.push(db.prepare(`INSERT INTO stock_reservation_lines(reservation_id,variant_id,quantity,returned,sku,product_name,color_name,size) SELECT ?,v.id,json_extract(wanted.value,'$.quantity'),0,v.sku,json_extract(p.data,'$.name'),(SELECT json_extract(value,'$.name') FROM json_each(p.data,'$.colors') WHERE json_extract(value,'$.id')=v.color_id),v.size FROM json_each(?) wanted JOIN stock_variants v ON v.id=json_extract(wanted.value,'$.variantId') JOIN store_products p ON p.id=v.product_id WHERE ${gate}`).bind(reservationId,JSON.stringify(lines),id,token));
  } else if(action==='commitStock') {
    statements.push(db.prepare(`UPDATE stock_variants SET on_hand=on_hand-(SELECT l.quantity FROM stock_reservation_lines l WHERE l.reservation_id=? AND l.variant_id=stock_variants.id),revision=revision+1 WHERE id IN(SELECT variant_id FROM stock_reservation_lines WHERE reservation_id=?) AND ${gate}`).bind(reservationId,reservationId,id,token));
    statements.push(db.prepare(`UPDATE stock_reservations SET status='committed',revision=revision+1 WHERE id=? AND ${gate}`).bind(reservationId,id,token));
  } else if(action==='releaseStock') {
    statements.push(db.prepare(`UPDATE stock_reservations SET status='released',revision=revision+1 WHERE id=? AND ${gate}`).bind(reservationId,id,token));
  } else {
    statements.push(db.prepare(`UPDATE stock_variants SET on_hand=on_hand+?,revision=revision+1 WHERE id=? AND ${gate}`).bind(payload.quantity as number,payload.variantId as string,id,token));
    statements.push(db.prepare(`UPDATE stock_reservation_lines SET returned=returned+? WHERE reservation_id=? AND variant_id=? AND ${gate}`).bind(payload.quantity as number,reservationId,payload.variantId as string,id,token));
    statements.push(db.prepare(`UPDATE stock_reservations SET revision=revision+1 WHERE id=? AND ${gate}`).bind(reservationId,id,token));
  }
  const auditAction={reserveStock:'stock_reserved',commitStock:'stock_committed',releaseStock:'stock_released',returnStock:'stock_returned'}[action];
  statements.push(db.prepare(`INSERT INTO store_audit(actor_id,actor_email,action,product_id,reason,before_json,after_json,created_at) SELECT ?,?,?,NULL,?,NULL,?,? WHERE ${gate}`).bind(identity.userId,identity.email,auditAction,reason,JSON.stringify({...payload,reservationId}),now,id,token));
  await db.batch(statements);
  const completed=await db.prepare('SELECT fingerprint,reservation_id,operation_token FROM stock_requests WHERE request_id=?').bind(id).first<RequestRow>();
  if(!completed)throw new StoreError(409,action==='reserveStock'?'Stock is no longer available, or this reference already exists. Reload stock and use a new reference if needed.':action==='returnStock'?'Return exceeds the sold quantity, or this stock is no longer returnable.':'This hold has expired or changed. Reload its latest status before continuing.');
  if(completed.fingerprint!==fingerprint)throw new StoreError(409,'This retry key was already used for a different change.');
  return completed.reservation_id;
}
