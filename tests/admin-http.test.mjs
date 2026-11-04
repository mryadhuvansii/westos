// Optional integration check: run against the local dev server only.
// Creates an archived QA product and an image in the local preview database/bucket.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const origin = new URL(process.argv[2] || 'http://127.0.0.1:3100').origin;
assert.equal(new URL(origin).hostname, '127.0.0.1', 'This check must never target a hosted store.');
const url = path => new URL(path, origin);
const signIn = await fetch(url('/signin-with-chatgpt?return_to=%2Fadmin%2F'), {redirect:'manual'});
const cookie = signIn.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
assert(cookie, 'Start the portable dev server with its local sign-in first.');
async function read(path, signed = true) {
  return fetch(url(path), {headers:signed ? {cookie} : {}, redirect:'manual'});
}
async function change(payload, expected = 200, requestOrigin = origin) {
  const response = await fetch(url('/api/admin'), {method:'POST', headers:{cookie, Origin:requestOrigin, 'Content-Type':'application/json'}, body:JSON.stringify(payload)});
  const responseText = await response.text();
  let result; try { result = JSON.parse(responseText); } catch { result = {error:responseText}; }
  assert.equal(response.status, expected, result.error);
  return result;
}
assert.equal((await read('/api/admin',false)).status,401);
const forged = await fetch(url('/api/admin'), {headers:{'oai-authenticated-user-id':'local_seedy','oai-authenticated-user-email':'seedy@sites.test'}});
assert.equal(forged.status,401, 'Local middleware must remove forged identity headers.');
const internal = await fetch(url('/api/internal/inventory'), {method:'POST', headers:{cookie,'Content-Type':'application/json'},body:'{"action":"reserveStock"}'});
assert.equal(internal.status,503, 'Private inventory access must stay disabled without its server key.');
let state = await (await read('/api/admin')).json();
if(state.needsSetup) state = await change({action:'initialize'});
if(!state.inventoryReady) state = await change({action:'upgradeInventory'});
await change({action:'initialize'},403,'https://another.example');
const originalSettings = state.settings;
const id = `qa-${crypto.randomUUID()}`;
const blueId=`${id}:blue:32`,blackId=`${id}:black:32`;
let product = {...state.products[0], id, slug:id, name:'QA Denim', sizes:[32], stock:{32:0}, revision:0, status:'draft', price:1999, mrp:2399,
  colors:[{id:'blue',name:'Blue',hex:'#354e69',images:['/images/product-1.webp','/images/product-2.webp']},{id:'black',name:'Black',hex:'#303030',images:['/images/product-4.webp']}],
  variants:['blue','black'].map(colorId=>({id:`${id}:${colorId}:32`,colorId,size:32,sku:`${id}-${colorId}-32`.toUpperCase(),onHand:0,reserved:0,available:0,revision:0})),
};
const savedVariant=(variantId)=>state.products.find(value=>value.id===id).variants.find(value=>value.id===variantId);
let created = false;
try {
  state = await change({action:'saveProduct',product,expectedRevision:0});
  created = true;
  product = state.products.find(value => value.id === id);
  assert(!(await (await read('/api/store',false)).json()).products.some(value => value.id === id));
  const firstRevision=savedVariant(blueId).revision;
  state = await change({action:'adjustStock',variantId:blueId,quantity:7,reason:'Local integration check',expectedRevision:firstRevision});
  await change({action:'adjustStock',variantId:blueId,quantity:9,reason:'Stale change',expectedRevision:firstRevision},409);
  state = await change({action:'adjustStock',variantId:blackId,quantity:5,reason:'Local integration check',expectedRevision:savedVariant(blackId).revision});
  product = state.products.find(value => value.id === id);
  assert.equal(product.stock['32'],7);
  state = await change({action:'saveProduct',product:{...product,status:'published'},expectedRevision:product.revision});
  product = state.products.find(value => value.id === id);
  assert((await (await read('/api/store',false)).json()).products.some(value => value.id === id));
  const page = await read(`/product/${id}/`,false);
  assert.equal(page.status,200);
  assert((await page.text()).includes('QA Denim'), 'A new product must render without a rebuild.');
  const reserve={action:'reserveStock',reference:`${id}-release`,lines:[{variantId:blueId,quantity:2},{variantId:blackId,quantity:1}],holdMinutes:15,requestId:crypto.randomUUID()};
  state=await change(reserve);
  const held=state.reservations.find(value=>value.reference===reserve.reference);
  assert(held);
  assert.equal(savedVariant(blueId).onHand,7);
  assert.equal(savedVariant(blueId).reserved,2);
  assert.equal(savedVariant(blueId).available,5);
  state=await change(reserve);
  assert.equal(savedVariant(blueId).reserved,2,'Repeating a request cannot duplicate a hold.');
  await change({...reserve,holdMinutes:30},409);
  await change({action:'adjustStock',variantId:blueId,quantity:1,reason:'Cannot count below held',expectedRevision:savedVariant(blueId).revision},409);
  await change({...reserve,reference:`${id}-insufficient`,requestId:crypto.randomUUID(),lines:[{variantId:blueId,quantity:6},{variantId:blackId,quantity:1}]},409);
  const release={action:'releaseStock',reservationId:held.id,requestId:crypto.randomUUID(),reason:'Local cancellation test'};
  state=await change(release);
  state=await change(release);
  assert.equal(savedVariant(blueId).available,7);
  const competing=[1,2].map(number=>({...reserve,reference:`${id}-race-${number}`,requestId:crypto.randomUUID(),lines:[{variantId:blueId,quantity:4},{variantId:blackId,quantity:1}]}));
  const race=await Promise.all(competing.map(payload=>fetch(url('/api/admin'),{method:'POST',headers:{cookie,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(payload)})));
  assert.deepEqual(race.map(response=>response.status).sort(),[200,409],'Concurrent holds cannot oversell.');
  state=await (await read('/api/admin')).json();
  assert.equal(savedVariant(blueId).reserved,4);
  assert.equal(savedVariant(blackId).reserved,1,'A rejected multi-SKU hold must not leave a partial reservation.');
  const winner=state.reservations.find(value=>competing.some(payload=>payload.reference===value.reference));
  assert(winner);
  state=await change({action:'releaseStock',reservationId:winner.id,requestId:crypto.randomUUID(),reason:'Concurrent test completed'});
  const sale={...reserve,reference:`${id}-sale`,requestId:crypto.randomUUID(),lines:[{variantId:blueId,quantity:3},{variantId:blackId,quantity:2}]};
  state=await change(sale);
  const saleHold=state.reservations.find(value=>value.reference===sale.reference);
  const commit={action:'commitStock',reservationId:saleHold.id,requestId:crypto.randomUUID()};
  state=await change(commit);
  state=await change(commit);
  assert.equal((await (await read(`/api/admin?reference=${encodeURIComponent(sale.reference)}`)).json()).reservations[0]?.status,'committed','An exact reference search must find a saved sale.');
  assert.equal((await (await read(`/api/admin?reference=${encodeURIComponent(`${id}-missing`)}`)).json()).reservations.length,0,'An unknown exact reference must show no records.');
  assert.equal(savedVariant(blueId).onHand,4);
  assert.equal(savedVariant(blackId).onHand,3);
  assert.equal(savedVariant(blueId).reserved,0);
  const returned={action:'returnStock',reservationId:saleHold.id,variantId:blueId,quantity:1,reason:'Inspected local test return',requestId:crypto.randomUUID(),inspected:true};
  state=await change(returned);
  state=await change(returned);
  assert.equal(savedVariant(blueId).onHand,5,'A repeated return must only restock once.');
  await change({...returned,requestId:crypto.randomUUID(),quantity:3},409);
  const latestProduct=state.products.find(value=>value.id===id);
  state=await change({action:'saveProduct',product:{...latestProduct,description:'Updated details with stale stock projection',variants:product.variants},expectedRevision:latestProduct.revision});
  assert.equal(savedVariant(blueId).onHand,5,'A product detail save cannot overwrite inventory counts.');
  const photo = await readFile(new URL('../public/images/product-1.webp',import.meta.url));
  const upload = await fetch(url('/api/admin/media'),{method:'POST',headers:{cookie,Origin:origin,'Content-Type':'image/webp'},body:photo});
  assert.equal(upload.status,201,await upload.clone().text());
  const {url:photoUrl} = await upload.json();
  const storedPhoto = await read(photoUrl,false);
  assert.equal(storedPhoto.status,200);
  assert.equal(storedPhoto.headers.get('content-type'),'image/webp');
  assert.deepEqual(Buffer.from(await storedPhoto.arrayBuffer()),photo);
  state = await change({action:'saveSettings',upiId:'qa@upi',buybackEnabled:true,expectedRevision:state.settings.revision});
  assert.equal((await (await read('/api/store',false)).json()).settings.upiId,'qa@upi');
  assert((await (await read('/buyback/',false)).text()).includes('id="eligibility"'));
  state = await change({action:'saveSettings',upiId:'qa@upi',buybackEnabled:false,expectedRevision:state.settings.revision});
  const paused = await (await read('/buyback/',false)).text();
  assert(paused.includes('Buyback is currently unavailable.'));
  assert(!paused.includes('<section class="buyback-checker"'), 'The paused checker must not render.');
} finally {
  state = await (await read('/api/admin')).json();
  if(created) {
    const current = state.products.find(value => value.id === id);
    if(current) state = await change({action:'saveProduct',product:{...current,status:'archived'},expectedRevision:current.revision});
  }
  await change({action:'saveSettings',upiId:originalSettings.upiId,buybackEnabled:originalSettings.buybackEnabled,expectedRevision:state.settings.revision});
}
assert.equal((await read(`/product/${id}/`,false)).status,404);
console.log('Local admin HTTP checks passed: owner access, colour-size stock, holds, cancellation, stock sale, bounded returns, retries, new product page, image upload and settings. Original settings restored.');
