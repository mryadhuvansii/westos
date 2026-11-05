import {
  assertOwner, compatibilityFields, defaultSettings, fields, integer, legacyProduct, object, previewProducts, StoreError,
  textValue, validateProduct, validateProductEdit, validateSettings,
  type AdminState, type Identity, type ManagedProduct, type StoreData, type StoreSettings,
} from '../lib/operations.ts';
import {heldQuantity, inventoryMutation, inventoryReady, readReservations, readVariants} from './inventory.ts';

type ProductRow = {id: string; slug: string; data: string; revision: number; updated_at: string; inventory_version: number};
type SettingsRow = {data: string; revision: number};
type OwnerRow = {user_id: string; email: string};
type Runtime = {DB?: D1Database; WESTOS_OWNER_EMAIL?: string};
type AuditRow = {id: number; actor_email: string; action: string; product_id: string | null; reason: string; before_json: string | null; after_json: string; created_at: string};

async function runtime(): Promise<Runtime> { return (await import('cloudflare:workers')).env as Runtime; }
function requireDatabase(env: Runtime): D1Database {
  if (!env.DB) throw new StoreError(503, 'Store storage is not configured. Please try again later.');
  return env.DB;
}
function productFromRow(row: ProductRow, variants: Awaited<ReturnType<typeof readVariants>>): ManagedProduct {
  const product = legacyProduct({...JSON.parse(row.data), id: row.id, slug: row.slug, revision: row.revision, updatedAt: row.updated_at});
  return row.inventory_version ? compatibilityFields({...product, variants: variants.filter(variant=>variant.productId===row.id).map(({productId,...variant})=>variant)}) : product;
}
async function ownerRecord(db: D1Database) { return db.prepare('SELECT user_id, email FROM store_owner WHERE id = 1').first<OwnerRow>(); }
async function settingsRecord(db: D1Database) { return db.prepare('SELECT data, revision FROM store_settings WHERE id = 1').first<SettingsRow>(); }
async function productRecord(db: D1Database, id: string) {
  const row = await db.prepare('SELECT * FROM store_products WHERE id = ?').bind(id).first<ProductRow>();
  return row ? productFromRow(row, await readVariants(db)) : null;
}
export async function readStore(db: D1Database, all = false): Promise<StoreData> {
  const settings = await settingsRecord(db);
  if (!settings) return {products: previewProducts(), settings: {...defaultSettings}, initialized: false};
  const rows = await db.prepare('SELECT * FROM store_products ORDER BY rowid').all<ProductRow>();
  const variants = await readVariants(db);
  return {
    products: rows.results.map(row=>productFromRow(row,variants)).filter(product => all || product.status === 'published'),
    settings: {...JSON.parse(settings.data), revision: settings.revision}, initialized: true,
  };
}
export async function getStoreData(): Promise<StoreData> { return readStore(requireDatabase(await runtime())); }

export async function adminContext(db: D1Database, request: Request, expectedEmail: string) {
  const owner = await ownerRecord(db);
  const userId = request.headers.get('oai-authenticated-user-id');
  const email = request.headers.get('oai-authenticated-user-email');
  const identity = assertOwner(userId && email ? {userId, email} : null, owner ? {userId: owner.user_id} : null, expectedEmail);
  const initialized = Boolean(owner && await settingsRecord(db));
  return {db, identity, initialized};
}
export async function getAdminContext(request: Request) {
  const env = await runtime();
  // The preview account is accepted only by the development build; production uses the configured owner.
  const expectedEmail = import.meta.env.DEV ? 'seedy@sites.test' : env.WESTOS_OWNER_EMAIL ?? '';
  return adminContext(requireDatabase(env), request, expectedEmail);
}
export async function readAdmin(db: D1Database, identity: Identity, reference?:string): Promise<AdminState> {
  const state = await readStore(db, true);
  const rows = await db.prepare('SELECT id, actor_email, action, product_id, reason, before_json, after_json, created_at FROM store_audit ORDER BY id DESC LIMIT 100').all<AuditRow>();
  return {
    ...state, needsSetup: !state.initialized, user: {email: identity.email}, inventoryReady: await inventoryReady(db), reservations: await readReservations(db,reference),
    audit: rows.results.map(row => ({id: row.id, actorEmail: row.actor_email, action: row.action, productId: row.product_id,
      reason: row.reason, before: row.before_json ? JSON.parse(row.before_json) : null,
      after: JSON.parse(row.after_json), createdAt: row.created_at})),
  };
}

export function assertSameOrigin(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin || request.headers.get('sec-fetch-site') === 'cross-site') throw new StoreError(403, 'Open store management on this website before saving changes.');
}
export async function readMutation(request: Request, service = false): Promise<Record<string, unknown>> {
  if (!service) assertSameOrigin(request);
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new StoreError(415, 'Send the change as JSON.');
  if (!request.body) throw new StoreError(400, 'A change is required.');
  const limit = 128 * 1024;
  const reader = request.body.getReader(), chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) { await reader.cancel(); throw new StoreError(413, 'This change is too large.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  try { return object(JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(body))); }
  catch (error) { if (error instanceof StoreError) throw error; throw new StoreError(400, 'The change is not valid JSON.'); }
}

async function initialize(db: D1Database, identity: Identity) {
  const now = new Date().toISOString();
  const statements = [db.prepare('INSERT INTO store_owner (id,user_id,email) VALUES (1,?,?) ON CONFLICT(id) DO NOTHING').bind(identity.userId, identity.email)];
  const gate='EXISTS (SELECT 1 FROM store_owner WHERE id=1 AND user_id=?) AND NOT EXISTS(SELECT 1 FROM store_settings WHERE id=1)';
  for (const product of previewProducts()) {
    const next = {...product, revision: 1, updatedAt: now};
    statements.push(db.prepare(`INSERT INTO store_products (id,slug,data,revision,updated_at,inventory_version) SELECT ?,?,?,1,?,1 WHERE ${gate} ON CONFLICT(id) DO NOTHING`)
      .bind(next.id, next.slug, JSON.stringify(next), now, identity.userId));
    for(const variant of next.variants) statements.push(db.prepare(`INSERT INTO stock_variants(id,product_id,color_id,size,sku,on_hand,revision,active) SELECT ?,?,?,?,?,0,1,1 WHERE ${gate} AND EXISTS(SELECT 1 FROM store_products WHERE id=? AND inventory_version=1) ON CONFLICT(id) DO NOTHING`).bind(variant.id,next.id,variant.colorId,variant.size,variant.sku,identity.userId,next.id));
  }
  statements.push(db.prepare(`INSERT INTO store_audit (actor_id,actor_email,action,product_id,reason,before_json,after_json,created_at) SELECT ?,?,'initialize',NULL,'Store management initialized',NULL,?,? WHERE ${gate}`)
    .bind(identity.userId, identity.email, JSON.stringify({products: previewProducts().length, upiId: defaultSettings.upiId, buybackEnabled: false}), now, identity.userId));
  statements.push(db.prepare('INSERT INTO store_settings (id,data,revision,updated_at) SELECT 1,?,1,? WHERE EXISTS (SELECT 1 FROM store_owner WHERE id=1 AND user_id=?) ON CONFLICT(id) DO NOTHING')
    .bind(JSON.stringify({...defaultSettings, revision: 1}), now, identity.userId));
  await db.batch(statements);
  const owner = await ownerRecord(db);
  assertOwner(identity, owner ? {userId: owner.user_id} : null, '');
}
function stale(label: string): never { throw new StoreError(409, `${label} changed in another tab. Reload the latest version before saving.`); }
async function upgradeInventory(db:D1Database,identity:Identity) {
  const rows=await db.prepare('SELECT * FROM store_products WHERE inventory_version=0 ORDER BY id').all<ProductRow>();
  for(const row of rows.results) {
    const product=legacyProduct({...JSON.parse(row.data),id:row.id,slug:row.slug,revision:row.revision,updatedAt:row.updated_at}),now=new Date().toISOString();
    const gate='EXISTS(SELECT 1 FROM store_products WHERE id=? AND revision=? AND inventory_version=0)';
    const statements=product.variants.map(variant=>db.prepare(`INSERT INTO stock_variants(id,product_id,color_id,size,sku,on_hand,revision,active) SELECT ?,?,?,?,?,?,1,1 WHERE ${gate}`).bind(variant.id,row.id,variant.colorId,variant.size,variant.sku,integer(variant.onHand,'Existing stock'),row.id,row.revision));
    statements.push(db.prepare(`INSERT INTO store_audit(actor_id,actor_email,action,product_id,reason,before_json,after_json,created_at) SELECT ?,?,'inventory_upgraded',?,'Existing stock preserved in colour-size records',?,?,? WHERE ${gate}`).bind(identity.userId,identity.email,row.id,row.data,JSON.stringify(product),now,row.id,row.revision));
    statements.push(db.prepare('UPDATE store_products SET data=?,revision=revision+1,updated_at=?,inventory_version=1 WHERE id=? AND revision=? AND inventory_version=0').bind(JSON.stringify(product),now,row.id,row.revision));
    try {await db.batch(statements);}catch(error){if(String(error).includes('UNIQUE constraint'))throw new StoreError(409,'An existing SKU conflicts with this upgrade. Existing stock was preserved; resolve the duplicate SKU before retrying.');throw error;}
    const updated=await db.prepare('SELECT inventory_version FROM store_products WHERE id=?').bind(row.id).first<{inventory_version:number}>();
    if(!updated?.inventory_version)stale('This product');
  }
}
async function saveProduct(db: D1Database, identity: Identity, next: ManagedProduct, current: ManagedProduct | null, action: string, reason: string) {
  const now = new Date().toISOString(), revision = (current?.revision ?? 0) + 1;
  // Embedded counts are compatibility snapshots only. The variant table always supplies live stock.
  const saved = compatibilityFields({...next,variants:next.variants.map(variant=>({...variant,onHand:0,reserved:0,available:0,revision:0})),revision,updatedAt:now}), data = JSON.stringify(saved);
  const before = current ? JSON.stringify(current) : null;
  const audit = [identity.userId, identity.email, action, next.id, reason, before, data, now];
  if (!current) {
    try {
      await db.batch([
        db.prepare('INSERT INTO store_products (id,slug,data,revision,updated_at,inventory_version) VALUES (?,?,?,?,?,1)').bind(next.id, next.slug, data, revision, now),
        ...next.variants.map(variant=>db.prepare('INSERT INTO stock_variants(id,product_id,color_id,size,sku,on_hand,revision,active) VALUES(?,?,?,?,?,0,1,1)').bind(variant.id,next.id,variant.colorId,variant.size,variant.sku)),
        db.prepare('INSERT INTO store_audit (actor_id,actor_email,action,product_id,reason,before_json,after_json,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(...audit),
      ]);
    } catch (error) {
      if (String(error).includes('UNIQUE constraint')) throw new StoreError(409, 'That product ID, address or SKU already exists. Choose a different one.');
      throw error;
    }
    return;
  }
  const existing=await db.prepare('SELECT id,active FROM stock_variants WHERE product_id=?').bind(current.id).all<{id:string;active:number}>();
  if(next.variants.some(variant=>existing.results.some(old=>old.id===variant.id&&!old.active)))throw new StoreError(409,'A retired colour-size identifier cannot be reused. Create a different colour identifier instead.');
  const ids=JSON.stringify(next.variants.map(variant=>variant.id));
  // Recheck removal safety inside the same batch as the metadata update; a new hold cannot slip between them.
  const gate=`EXISTS(SELECT 1 FROM store_products WHERE id=? AND revision=?) AND NOT EXISTS(SELECT 1 FROM stock_variants v WHERE v.product_id=? AND v.active=1 AND v.id NOT IN(SELECT value FROM json_each(?)) AND (v.on_hand>0 OR EXISTS(SELECT 1 FROM stock_reservation_lines l WHERE l.variant_id=v.id)))`;
  const guard=[current.id,current.revision,current.id,ids];
  const statements=[db.prepare(`INSERT INTO store_audit(actor_id,actor_email,action,product_id,reason,before_json,after_json,created_at) SELECT ?,?,?,?,?,?,?,? WHERE ${gate}`).bind(...audit,...guard)];
  for(const variant of next.variants.filter(variant=>!current.variants.some(old=>old.id===variant.id)))statements.push(db.prepare(`INSERT INTO stock_variants(id,product_id,color_id,size,sku,on_hand,revision,active) SELECT ?,?,?,?,?,0,1,1 WHERE ${gate}`).bind(variant.id,current.id,variant.colorId,variant.size,variant.sku,...guard));
  statements.push(db.prepare(`UPDATE stock_variants SET active=0,revision=revision+1 WHERE product_id=? AND active=1 AND id NOT IN(SELECT value FROM json_each(?)) AND ${gate}`).bind(current.id,ids,...guard));
  statements.push(db.prepare(`UPDATE store_products SET data=?,revision=?,updated_at=? WHERE ${gate} AND id=?`).bind(data,revision,now,...guard,current.id));
  try {const results=await db.batch(statements);if(results.at(-1)?.meta.changes!==1)throw new StoreError(409,'This product changed, or a removed variant has stock or reservation history. Reload before saving.');}
  catch(error){if(String(error).includes('UNIQUE constraint'))throw new StoreError(409,'That SKU is already used by another variant.');throw error;}
}

async function adjustStock(db:D1Database,identity:Identity,input:Record<string,unknown>) {
  fields(input,['action','variantId','quantity','reason','expectedRevision']);
  const id=textValue(input.variantId,'Variant',150),quantity=integer(input.quantity,'Stock'),revision=integer(input.expectedRevision,'Revision'),reason=textValue(input.reason,'Adjustment reason',300,3),now=new Date().toISOString();
  const condition=`v.id=? AND v.active=1 AND v.revision=? AND ?>=${heldQuantity()}`;
  const results=await db.batch([
    db.prepare(`INSERT INTO store_audit(actor_id,actor_email,action,product_id,reason,before_json,after_json,created_at) SELECT ?,?,'stock_adjusted',v.product_id,?,json_object('variantId',v.id,'sku',v.sku,'onHand',v.on_hand),json_object('variantId',v.id,'sku',v.sku,'onHand',?),? FROM stock_variants v WHERE ${condition}`).bind(identity.userId,identity.email,reason,quantity,now,id,revision,quantity),
    db.prepare(`UPDATE stock_variants AS v SET on_hand=?,revision=revision+1 WHERE ${condition}`).bind(quantity,id,revision,quantity),
  ]);
  if(results[1].meta.changes!==1)throw new StoreError(409,'Stock changed, this variant was retired, or the count is below reserved stock. Reload before saving.');
}
async function saveSettings(db: D1Database, identity: Identity, value: Omit<StoreSettings, 'revision'>, expectedRevision: number) {
  const row = await settingsRecord(db);
  if (!row || row.revision !== expectedRevision) stale('Store settings');
  const now = new Date().toISOString(), data = JSON.stringify(value);
  const results = await db.batch([
    db.prepare("INSERT INTO store_audit (actor_id,actor_email,action,product_id,reason,before_json,after_json,created_at) SELECT ?,?,'settings',NULL,'Store settings updated',?,?,? WHERE EXISTS (SELECT 1 FROM store_settings WHERE id=1 AND revision=?)")
      .bind(identity.userId, identity.email, row.data, data, now, expectedRevision),
    db.prepare('UPDATE store_settings SET data=?,revision=revision+1,updated_at=? WHERE id=1 AND revision=?').bind(data, now, expectedRevision),
  ]);
  if (results[1].meta.changes !== 1) stale('Store settings');
}

export async function mutateStore(db: D1Database, identity: Identity, input: Record<string, unknown>): Promise<AdminState> {
  if (input.action === 'initialize') {
    fields(input, ['action']);
    await initialize(db, identity);
    return readAdmin(db, identity);
  }
  const owner = await ownerRecord(db);
  assertOwner(identity, owner ? {userId: owner.user_id} : null, '');
  if (!await settingsRecord(db)) throw new StoreError(409, 'Initialize store management before making changes.');
  if(input.action==='upgradeInventory') {
    fields(input,['action']);await upgradeInventory(db,identity);
  } else if (input.action === 'saveProduct') {
    if(!await inventoryReady(db))throw new StoreError(409,'Upgrade inventory before editing products.');
    fields(input, ['action','product','expectedRevision']);
    const product = validateProduct(input.product), current = await productRecord(db, product.id);
    const revision = integer(input.expectedRevision, 'Revision');
    validateProductEdit(product, current, revision);
    await saveProduct(db, identity, product, current, current ? 'product_updated' : 'product_created', current ? 'Product details updated' : 'Product created with zero stock');
  } else if (input.action === 'adjustStock') {
    if(!await inventoryReady(db))throw new StoreError(409,'Upgrade inventory before changing stock.');
    await adjustStock(db,identity,input);
  } else if(['reserveStock','commitStock','releaseStock','returnStock'].includes(String(input.action))) {
    await inventoryMutation(db,identity,input);
  } else if (input.action === 'saveSettings') {
    fields(input, ['action','upiId','buybackEnabled','codEnabled','expectedRevision']);
    await saveSettings(db, identity, validateSettings(input), integer(input.expectedRevision, 'Revision'));
  } else throw new StoreError(400, 'Choose a supported store action.');
  return readAdmin(db, identity);
}

export function apiError(error: unknown): Response {
  if (error instanceof StoreError) return Response.json({error: error.message}, {status: error.status, headers: {'Cache-Control': 'no-store'}});
  console.error('Store operation failed.');
  return Response.json({error: 'Store storage could not complete this request. Your changes have not been confirmed. Please reload and try again.'}, {status: 503, headers: {'Cache-Control': 'no-store'}});
}
