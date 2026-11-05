import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync, readdirSync} from 'node:fs';
import {StoreError, previewProducts, variantId, type ManagedProduct} from '../lib/operations.ts';
import {adminContext, mutateStore, readAdmin, readStore} from '../server/store-data.ts';

const sql = new DatabaseSync(':memory:');
sql.exec('PRAGMA foreign_keys = ON');
const migrations = new URL('../drizzle/', import.meta.url);
for (const file of readdirSync(migrations).filter(file => file.endsWith('.sql')).sort()) sql.exec(readFileSync(new URL(file, migrations), 'utf8'));
class Statement {
  query: string;
  values: (string | number | null)[] = [];
  constructor(query: string) { this.query = query; }
  bind(...values: (string | number | null)[]) { this.values = values; return this; }
  async first(column?: string) { const row = sql.prepare(this.query).get(...this.values); return column ? row?.[column] ?? null : row ?? null; }
  async all() { return {results: sql.prepare(this.query).all(...this.values), success: true, meta: {changes: 0}}; }
  async run() { return {results: [], success: true, meta: sql.prepare(this.query).run(...this.values)}; }
}
// Native SQLite transactions model D1 batch atomicity, with asynchronous reads allowing competing requests to interleave.
const db = {
  prepare(query: string) { return new Statement(query); },
  async batch(statements: Statement[]) {
    sql.exec('BEGIN');
    try {
      const results = statements.map(statement => {
        const prepared = sql.prepare(statement.query);
        return prepared.columns().length ? {results: prepared.all(...statement.values), success: true, meta: {changes: 0}} : {results: [], success: true, meta: prepared.run(...statement.values)};
      });
      sql.exec('COMMIT');
      return results;
    } catch (error) { sql.exec('ROLLBACK'); throw error; }
  },
} as unknown as D1Database;
const owner = {userId: 'owner-stable-id', email: 'owner@example.com'};
const other = {userId: 'another-id', email: 'another@example.com'};
const status = (code: number) => (error: unknown) => error instanceof StoreError && error.status === code;
const refusal = (error: unknown) => error instanceof StoreError && [400, 409].includes(error.status);
const request = (identity: typeof owner | null = owner) => new Request('https://store.example/api/admin', {headers: identity ? {'oai-authenticated-user-id': identity.userId, 'oai-authenticated-user-email': identity.email} : {}});
const mutate = (input: Record<string, unknown>) => mutateStore(db, owner, input);
const uuid = () => crypto.randomUUID();
const productById = async (id: string) => (await readAdmin(db, owner)).products.find(product => product.id === id)!;
const variantById = async (id: string) => (await readAdmin(db, owner)).products.flatMap(product => product.variants).find(variant => variant.id === id)!;
const holdByReference = async (reference: string) => (await readAdmin(db, owner)).reservations.find(reservation => reservation.reference === reference)!;
const count = (table: string) => Number((sql.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as {count: number}).count);

assert.equal((await readStore(db)).initialized, false);
await assert.rejects(adminContext(db, request(null), owner.email), status(401));
await assert.rejects(adminContext(db, request(other), owner.email), status(403));
assert.equal((await adminContext(db, request(), owner.email)).initialized, false);
let state = await mutate({action: 'initialize'});
assert.equal(state.initialized, true);
assert.equal(state.inventoryReady, true);
assert.equal(state.products.length, 8);
assert(state.products.every(product => product.variants.every(variant => variant.onHand === 0 && variant.available === 0)));
assert.equal((await adminContext(db, request(), owner.email)).initialized, true);
await assert.rejects(adminContext(db, request({...owner, userId: 'replacement'}), owner.email), status(403));
await assert.rejects(mutateStore(db, other, {action: 'initialize'}), status(403));
await assert.rejects(mutateStore(db, other, {action: 'saveSettings', upiId: 'other@upi', buybackEnabled: true, codEnabled: false, expectedRevision: 1}), status(403));

const sample = previewProducts()[0];
const id = 'inventory-check';
const blueId = variantId(id, 'default', 32), blackId = variantId(id, 'black', 32);
const fixture: ManagedProduct = {...sample, id, slug: id, name: 'Inventory check denim', status: 'draft', colors: [{id: 'default', name: 'Indigo', hex: '#213456', images: [sample.image]}, {id: 'black', name: 'Black', hex: '#111111', images: [sample.image]}], variants: [
  {id: blueId, colorId: 'default', size: 32, sku: 'QA-INDIGO-32', onHand: 0, reserved: 0, available: 0, revision: 0},
  {id: blackId, colorId: 'black', size: 32, sku: 'QA-BLACK-32', onHand: 0, reserved: 0, available: 0, revision: 0},
]};
await mutate({action: 'saveProduct', product: fixture, expectedRevision: 0});
assert.equal((await readStore(db)).products.some(product => product.id === id), false);
let product = await productById(id);
await assert.rejects(mutate({action: 'saveProduct', product: {...product, slug: 'changed-address'}, expectedRevision: product.revision}), status(400));
await assert.rejects(mutate({action: 'saveProduct', product: {...fixture, id: 'sku-conflict', slug: 'sku-conflict', variants: fixture.variants.map(v => ({...v, id: variantId('sku-conflict', v.colorId, v.size)}))}, expectedRevision: 0}), status(409));

const initialBlue = await variantById(blueId);
const stockAction = {action: 'adjustStock', variantId: blueId, quantity: 7, reason: 'Seven received', expectedRevision: initialBlue.revision};
const competingCounts = await Promise.allSettled([mutate(stockAction), mutate({...stockAction, quantity: 9})]);
assert.equal(competingCounts.filter(result => result.status === 'fulfilled').length, 1);
assert.equal(competingCounts.filter(result => result.status === 'rejected' && status(409)(result.reason)).length, 1);
const wonCount = await variantById(blueId);
assert([7, 9].includes(wonCount.onHand));
const countHistory = (await readAdmin(db, owner)).audit.filter(entry => entry.action === 'stock_adjusted');
assert.equal(countHistory.length, 1);
assert.equal(countHistory[0].actorEmail, owner.email);
assert.equal((countHistory[0].before as {onHand: number}).onHand, 0);
assert.equal((countHistory[0].after as {onHand: number}).onHand, wonCount.onHand);
await assert.rejects(mutate(stockAction), status(409));
await assert.rejects(mutate({...stockAction, expectedRevision: wonCount.revision, quantity: -1}), status(400));
await assert.rejects(mutate({...stockAction, expectedRevision: wonCount.revision, quantity: 1.5}), status(400));
await assert.rejects(mutate({...stockAction, expectedRevision: wonCount.revision, reason: ''}), status(400));
if (wonCount.onHand !== 7) await mutate({...stockAction, expectedRevision: wonCount.revision});
await mutate({action: 'adjustStock', variantId: blackId, quantity: 5, reason: 'Five received', expectedRevision: (await variantById(blackId)).revision});

// Product metadata must never overwrite stock received while the editor was open.
await mutate({action: 'saveProduct', product: {...product, name: 'Renamed denim', status: 'published', variants: product.variants.map(v => ({...v, onHand: 999, available: 999}))}, expectedRevision: product.revision});
assert.equal((await variantById(blueId)).onHand, 7);
assert.equal((await variantById(blackId)).onHand, 5);
assert.equal((await readStore(db)).products.some(product => product.id === id), true);
product = await productById(id);
await assert.rejects(mutate({action: 'saveProduct', product: {...product, colors: product.colors.filter(color => color.id !== 'black'), variants: product.variants.filter(v => v.id !== blackId)}, expectedRevision: product.revision}), refusal);
await assert.rejects(mutate({action: 'saveProduct', product: {...product, variants: product.variants.map(v => ({...v, sku: `${v.sku}-NEW`}))}, expectedRevision: product.revision}), status(400));

const reserve = {action: 'reserveStock', reference: 'MULTI-COLOUR', holdMinutes: 15, lines: [{variantId: blueId, quantity: 2}, {variantId: blackId, quantity: 1}], requestId: uuid()};
await Promise.all([mutate(reserve), mutate(reserve)]);
let hold = await holdByReference('MULTI-COLOUR');
assert.equal(hold.lines.length, 2);
assert.equal((await variantById(blueId)).onHand, 7);
assert.equal((await variantById(blueId)).reserved, 2);
assert.equal((await variantById(blueId)).available, 5);
assert.equal((await variantById(blackId)).reserved, 1);
await mutate({...reserve, lines: [...reserve.lines].reverse()});
await assert.rejects(mutate({...reserve, lines: [{variantId: blueId, quantity: 3}, {variantId: blackId, quantity: 1}]}), status(409));
await assert.rejects(mutate({...reserve, requestId: uuid()}), status(409));
await assert.rejects(mutate({...reserve, requestId: uuid(), reference: 'DUPLICATE-LINE', lines: [{variantId: blueId, quantity: 1}, {variantId: blueId, quantity: 1}]}), status(400));
await assert.rejects(mutate({...reserve, requestId: uuid(), reference: 'NEGATIVE', lines: [{variantId: blueId, quantity: -1}]}), status(400));
await assert.rejects(mutate({...reserve, requestId: uuid(), reference: 'EMPTY', lines: []}), status(400));
await assert.rejects(mutate({...reserve, requestId: uuid(), reference: 'BAD-TTL', holdMinutes: 61}), status(400));
await assert.rejects(mutate({...reserve, requestId: uuid(), reference: 'PAYMENT-FORGERY', paid: true}), status(400));
await assert.rejects(mutate({action: 'adjustStock', variantId: blueId, quantity: 1, reason: 'Below active holds', expectedRevision: (await variantById(blueId)).revision}), status(409));
const reservationCount = count('stock_reservations'), requestCount = count('stock_requests');
await assert.rejects(mutate({...reserve, reference: 'NO-PARTIAL-HOLD', requestId: uuid(), lines: [{variantId: blueId, quantity: 1}, {variantId: blackId, quantity: 6}]}), status(409));
assert.equal(count('stock_reservations'), reservationCount);
assert.equal(count('stock_requests'), requestCount);
assert.equal((await variantById(blueId)).reserved, 2);
assert.equal((await variantById(blackId)).reserved, 1);

const release = {action: 'releaseStock', reservationId: hold.id, requestId: uuid(), reason: 'Customer cancelled'};
await Promise.all([mutate(release), mutate(release)]);
assert.equal((await holdByReference('MULTI-COLOUR')).status, 'released');
assert.equal((await variantById(blueId)).available, 7);
assert.equal((await variantById(blackId)).available, 5);
await assert.rejects(mutate({action: 'commitStock', reservationId: hold.id, requestId: uuid()}), status(409));

// Competing requests can both read availability, but only one transaction may take the last units.
const races = await Promise.allSettled(['RACE-A', 'RACE-B'].map(reference => mutate({action: 'reserveStock', reference, holdMinutes: 15, lines: [{variantId: blueId, quantity: 5}], requestId: uuid()})));
assert.equal(races.filter(result => result.status === 'fulfilled').length, 1);
assert.equal(races.filter(result => result.status === 'rejected' && status(409)(result.reason)).length, 1);
state = await readAdmin(db, owner);
const raceHold = state.reservations.find(item => item.reference.startsWith('RACE-'))!;
assert.equal((await variantById(blueId)).reserved, 5);
const commit = {action: 'commitStock', reservationId: raceHold.id, requestId: uuid()};
await Promise.all([mutate(commit), mutate(commit)]);
await mutate(commit);
assert.equal((await variantById(blueId)).onHand, 2);
assert.equal((await variantById(blueId)).reserved, 0);
assert.equal((await holdByReference(raceHold.reference)).status, 'committed');

const returned = {action: 'returnStock', reservationId: raceHold.id, variantId: blueId, quantity: 3, reason: 'Received and inspected', inspected: true, requestId: uuid()};
await assert.rejects(mutate({...returned, inspected: false}), status(400));
await Promise.all([mutate(returned), mutate(returned)]);
assert.equal((await variantById(blueId)).onHand, 5);
assert.equal((await holdByReference(raceHold.reference)).lines[0].returned, 3);
await assert.rejects(mutate({...returned, requestId: uuid(), quantity: 3}), status(409));
await assert.rejects(mutate({...returned, requestId: uuid(), variantId: blackId, quantity: 1}), refusal);
const competingReturns = await Promise.allSettled([1, 2].map(() => mutate({...returned, quantity: 2, requestId: uuid()})));
assert.equal(competingReturns.filter(result => result.status === 'fulfilled').length, 1);
assert.equal(competingReturns.filter(result => result.status === 'rejected' && status(409)(result.reason)).length, 1);
assert.equal((await variantById(blueId)).onHand, 7);
assert.equal((await holdByReference(raceHold.reference)).lines[0].returned, 5);

await mutate({action: 'reserveStock', reference: 'EXPIRED', holdMinutes: 1, lines: [{variantId: blackId, quantity: 4}], requestId: uuid()});
hold = await holdByReference('EXPIRED');
sql.prepare('UPDATE stock_reservations SET expires_at = 0 WHERE id = ?').run(hold.id);
assert.equal((await holdByReference('EXPIRED')).status, 'expired');
assert.equal((await variantById(blackId)).available, 5);
await assert.rejects(mutate({action: 'commitStock', reservationId: hold.id, requestId: uuid()}), status(409));
assert.equal((await variantById(blackId)).onHand, 5);

// Historical SKU identity survives even when a later physical recount reaches zero.
product = await productById(id);
await mutate({action: 'adjustStock', variantId: blueId, quantity: 0, reason: 'Verified empty rack', expectedRevision: (await variantById(blueId)).revision});
await assert.rejects(mutate({action: 'saveProduct', product: {...product, colors: product.colors.filter(color => color.id !== 'default'), variants: product.variants.filter(v => v.id !== blueId)}, expectedRevision: product.revision}), refusal);
assert.equal((await variantById(blueId)).onHand, 0);
await mutate({action: 'saveProduct', product: {...product, status: 'archived'}, expectedRevision: product.revision});
await assert.rejects(mutate({...reserve, reference: 'ARCHIVED', requestId: uuid(), lines: [{variantId: blackId, quantity: 1}]}), status(409));
assert.equal((await readStore(db)).products.some(product => product.id === id), false);

state = await readAdmin(db, owner);
const settingsAction = {action: 'saveSettings', upiId: 'updated@bank', buybackEnabled: true, codEnabled: false, expectedRevision: state.settings.revision};
await mutate(settingsAction);
await assert.rejects(mutate(settingsAction), status(409));
await assert.rejects(mutate({...settingsAction, paymentsEnabled: true}), status(400));
await mutate({action: 'initialize'});
assert.equal((await readStore(db)).settings.upiId, 'updated@bank');
assert.equal((await variantById(blackId)).onHand, 5);

// Upgrade a genuine pre-variant record containing nonzero counts, without resetting subsequent edits on retry.
const {colors: _colors, variants: _variants, ...oldSample} = previewProducts()[1];
const legacy = {...oldSample, id: 'legacy-stock', slug: 'legacy-stock', revision: 4, sizes: [28, 30], stock: {'28': 11, '30': 6}, updatedAt: new Date().toISOString()};
sql.prepare('INSERT INTO store_products (id,slug,data,revision,updated_at,inventory_version) VALUES (?,?,?,?,?,0)').run(legacy.id, legacy.slug, JSON.stringify(legacy), legacy.revision, legacy.updatedAt);
assert.equal((await readAdmin(db, owner)).inventoryReady, false);
await Promise.all([mutate({action: 'upgradeInventory'}), mutate({action: 'upgradeInventory'})]);
const migratedId = variantId(legacy.id, 'default', 28);
assert.equal((await readAdmin(db, owner)).inventoryReady, true);
assert.equal((await variantById(migratedId)).onHand, 11);
assert.equal((await variantById(variantId(legacy.id, 'default', 30))).onHand, 6);
await mutate({action: 'adjustStock', variantId: migratedId, quantity: 13, reason: 'Two more received', expectedRevision: (await variantById(migratedId)).revision});
await mutate({action: 'upgradeInventory'});
assert.equal((await variantById(migratedId)).onHand, 13);
// An older sale must remain accessible for returns after it drops out of the recent-reference list.
await mutate({action:'reserveStock',reference:'OLDER-SALE',holdMinutes:15,lines:[{variantId:migratedId,quantity:1}],requestId:uuid()});
const olderSale=(await readAdmin(db,owner,'OLDER-SALE')).reservations[0];
await mutate({action:'commitStock',reservationId:olderSale.id,requestId:uuid()});
sql.prepare('UPDATE stock_reservations SET created_at=? WHERE id=?').run('2020-01-01T00:00:00.000Z',olderSale.id);
const newerReference=sql.prepare("INSERT INTO stock_reservations(id,reference,status,expires_at,created_at,revision) VALUES(?,?,'released',0,?,1)");
for(let index=0;index<101;index++)newerReference.run(`newer-${index}`,`NEWER-${index}`,new Date().toISOString());
assert.equal((await readAdmin(db,owner)).reservations.some(item=>item.id===olderSale.id),false);
assert.equal((await readAdmin(db,owner,'OLDER-SALE')).reservations[0].lines[0].quantity,1);
assert.equal((await readAdmin(db,owner,'UNKNOWN-REFERENCE')).reservations.length,0);
await mutate({action:'returnStock',reservationId:olderSale.id,variantId:migratedId,quantity:1,reason:'Older sale physically returned and inspected',inspected:true,requestId:uuid()});
assert.equal((await variantById(migratedId)).onHand,13);
assert.equal((await readAdmin(db,owner,'OLDER-SALE')).reservations[0].lines[0].returned,1);
assert.equal(count('stock_reservation_lines'), 5);
for (const [action, expected] of [['stock_reserved', 4], ['stock_released', 1], ['stock_committed', 2], ['stock_returned', 3]] as const) {
  assert.equal(Number((sql.prepare('SELECT COUNT(*) AS count FROM store_audit WHERE action=?').get(action) as {count: number}).count), expected, `${action} must be audited once per successful change`);
}
assert.equal(Number((sql.prepare('SELECT COUNT(*) AS count FROM stock_variants WHERE on_hand < 0').get() as {count: number}).count), 0);
sql.close();
console.log('Inventory: colour-size stock, legacy upgrade, owner access, atomic holds, concurrent oversell prevention, expiry, idempotent sales/returns and catalogue protection passed.');
