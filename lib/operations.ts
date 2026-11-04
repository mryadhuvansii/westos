import {products as sampleProducts, type Product} from './catalog.ts';

export type ProductColor = {id:string; name:string; hex:string; images:string[]};
export type StockVariant = {id:string; colorId:string; size:number; sku:string; onHand:number; reserved:number; available:number; revision:number};
export type ManagedProduct = Product & {colors:ProductColor[]; variants:StockVariant[]; status:'draft'|'published'|'archived'; stock:Record<string,number>; revision:number; updatedAt:string; brand?:string; article_code?:string};
export type StoreSettings = {upiId:string; buybackEnabled:boolean; revision:number};
export type StoreData = {products:ManagedProduct[]; settings:StoreSettings; initialized:boolean};
export type AuditEntry = {id:number; actorEmail:string; action:string; productId:string|null; reason:string; before:unknown; after:unknown; createdAt:string};
export type InventoryReservation = {id:string; reference:string; status:'held'|'committed'|'released'|'expired'; expiresAt:string; createdAt:string; revision:number; lines:{variantId:string; sku:string; productName:string; colorName:string; size:number; quantity:number; returned:number}[]};
export type AdminState = StoreData & {audit:AuditEntry[]; user:{email:string}; needsSetup:boolean; inventoryReady:boolean; reservations:InventoryReservation[]};
export type Identity = {userId:string; email:string};
export const defaultSettings:StoreSettings = {upiId:'vijay@upi',buybackEnabled:false,revision:0};
export const variantId = (productId:string,colorId:string,size:number) => `${productId}:${colorId}:${size}`;

// Keep old display fields as a projection for the existing catalogue surfaces; stock lives in variant rows.
export function compatibilityFields(product:ManagedProduct):ManagedProduct {
  const color=product.colors[0], variants=product.variants.filter(v=>v.colorId===color.id);
  return {...product,color:color.name,colorHex:color.hex,image:color.images[0],sizes:variants.map(v=>v.size).sort((a,b)=>a-b),stock:Object.fromEntries(variants.map(v=>[v.size,v.available]))};
}
export function legacyProduct(product:Product & Partial<ManagedProduct>):ManagedProduct {
  const colors=product.colors?.length?product.colors:[{id:'default',name:product.color,hex:product.colorHex,images:[product.image]}];
  const variants=product.variants?.length?product.variants:product.sizes.map(size=>({id:variantId(product.id,'default',size),colorId:'default',size,sku:`${product.id}-DEFAULT-${size}`.toUpperCase(),onHand:product.stock?.[String(size)]??0,reserved:0,available:product.stock?.[String(size)]??0,revision:0}));
  return compatibilityFields({...product,colors,variants,stock:product.stock??{},status:product.status??'published',revision:product.revision??0,updatedAt:product.updatedAt??''});
}
export function previewProducts():ManagedProduct[] { return sampleProducts.map(product=>legacyProduct(product)); }
export class StoreError extends Error {status:number;constructor(status:number,message:string){super(message);this.status=status;}}
export function object(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))throw new StoreError(400,'A valid JSON object is required.');return value as Record<string,unknown>;}
export function fields(value:Record<string,unknown>,allowed:string[]){if(Object.keys(value).some(key=>!allowed.includes(key)))throw new StoreError(400,'The request contains unsupported fields.');}
export function textValue(value:unknown,label:string,max:number,min=1):string{if(typeof value!=='string'||value.trim().length<min||value.trim().length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))throw new StoreError(400,`${label} must contain ${min}–${max} characters.`);return value.trim();}
export function integer(value:unknown,label:string,max=1000000,min=0):number{if(typeof value!=='number'||!Number.isSafeInteger(value)||value<min||value>max)throw new StoreError(400,`${label} must be a whole number between ${min} and ${max}.`);return value;}
function choice<T extends string>(value:unknown,choices:readonly T[],label:string):T{if(typeof value!=='string'||!choices.includes(value as T))throw new StoreError(400,`Choose a valid ${label}.`);return value as T;}
export function validateSettings(value:Record<string,unknown>):Omit<StoreSettings,'revision'>{const upiId=textValue(value.upiId,'UPI ID',100);if(!/^[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}@[a-zA-Z0-9][a-zA-Z0-9.-]{1,31}$/.test(upiId))throw new StoreError(400,'Enter a UPI ID such as name@bank. This checks its format, not bank ownership.');if(typeof value.buybackEnabled!=='boolean')throw new StoreError(400,'Buyback visibility must be on or off.');return {upiId,buybackEnabled:value.buybackEnabled};}
function identifier(value:unknown,label:string,max:number){const result=textValue(value,label,max);if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result))throw new StoreError(400,`${label} must use lowercase letters, numbers and single hyphens.`);return result;}
function imagePath(value:unknown){const image=textValue(value,'Image path',250);if(!/^\/(?:images\/[a-zA-Z0-9][a-zA-Z0-9_-]*\.(?:webp|png|jpg|jpeg)|api\/media\/[a-zA-Z0-9][a-zA-Z0-9_-]*\.(?:webp|png|jpg|jpeg))$/.test(image))throw new StoreError(400,'Choose an uploaded image or an existing image from /images/.');return image;}
export function validateProduct(value:unknown):ManagedProduct{
  const p=object(value);fields(p,['id','slug','name','fit','category','price','mrp','image','color','colorHex','sizes','description','badge','collection','status','stock','revision','updatedAt','colors','variants','brand','article_code']);
  const id=identifier(p.id,'Product ID',80),slug=identifier(p.slug,'Product address',100),price=integer(p.price,'Price',1000000,1),mrp=integer(p.mrp,'MRP',1000000,price);
  // ponytail: the owner editor is bounded to 12 colours, 6 photos each and 100 variants; introduce paginated bulk catalogue tooling before lifting these request limits.
  if(!Array.isArray(p.colors)||!p.colors.length||p.colors.length>12)throw new StoreError(400,'Choose between 1 and 12 colours.');
  const colors=p.colors.map(value=>{const c=object(value);fields(c,['id','name','hex','images']);const hex=textValue(c.hex,'Colour code',7);if(!/^#[a-fA-F0-9]{6}$/.test(hex))throw new StoreError(400,'Colour must be a six-digit hex code.');if(!Array.isArray(c.images)||!c.images.length||c.images.length>6)throw new StoreError(400,'Each colour needs between 1 and 6 photos.');return {id:identifier(c.id,'Colour ID',40),name:textValue(c.name,'Colour name',60),hex,images:[...new Set(c.images.map(imagePath))]};});
  if(new Set(colors.map(c=>c.id)).size!==colors.length||new Set(colors.map(c=>c.name.toLocaleLowerCase('en-IN'))).size!==colors.length)throw new StoreError(400,'Each colour ID and name must be unique within a product.');
  if(!Array.isArray(p.variants)||!p.variants.length||p.variants.length>100)throw new StoreError(400,'Choose between 1 and 100 colour-size variants.');
  const variants=p.variants.map(value=>{const v=object(value);fields(v,['id','colorId','size','sku','onHand','reserved','available','revision']);const colorId=identifier(v.colorId,'Colour ID',40),size=integer(v.size,'Size',60,20);if(!colors.some(c=>c.id===colorId))throw new StoreError(400,'Every variant must belong to one of the listed colours.');const expectedId=variantId(id,colorId,size);if(v.id!==expectedId)throw new StoreError(400,'The variant identifier does not match its product, colour and size.');const sku=textValue(v.sku,'SKU',120);if(!/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(sku))throw new StoreError(400,'SKUs must use uppercase letters, numbers and single hyphens.');return {id:expectedId,colorId,size,sku,onHand:integer(v.onHand??0,'On-hand stock'),reserved:integer(v.reserved??0,'Reserved stock'),available:integer(v.available??0,'Available stock'),revision:integer(v.revision??0,'Variant revision')};});
  if(new Set(variants.map(v=>v.id)).size!==variants.length||new Set(variants.map(v=>v.sku)).size!==variants.length)throw new StoreError(400,'Each colour-size combination and SKU must appear only once.');
  if(colors.some(c=>!variants.some(v=>v.colorId===c.id)))throw new StoreError(400,'Every colour needs at least one size.');
  return compatibilityFields({id,slug,name:textValue(p.name,'Product name',120),fit:choice(p.fit,['Slim','Straight','Relaxed','Baggy','Bootcut','Comfort'],'fit'),category:choice(p.category,['Men','Women'],'category'),price,mrp,brand:textValue(p.brand??'','Brand',100),article_code:textValue(p.article_code??'','Article code',80),description:textValue(p.description,'Description',2000),...(p.badge?{badge:textValue(p.badge,'Badge',40)}:{}),collection:choice(p.collection,['Everyday','New arrivals','The essentials'],'collection'),status:choice(p.status,['draft','published','archived'],'status'),colors,variants,revision:integer(p.revision,'Revision'),updatedAt:typeof p.updatedAt==='string'?p.updatedAt:'',image:'',color:'',colorHex:'',sizes:[],stock:{}});
}
export function assertOwner(identity:Identity|null,owner:{userId:string}|null,expectedEmail:string):Identity{if(!identity?.userId||!identity.email)throw new StoreError(401,'Sign in with the owner account to open store management.');if(owner?identity.userId!==owner.userId:!expectedEmail||identity.email.toLowerCase()!==expectedEmail.toLowerCase())throw new StoreError(403,'Store management is available only to the owner account.');return identity;}
export function validateProductEdit(next:ManagedProduct,current:ManagedProduct|null,expectedRevision:number){
  if(expectedRevision!==(current?.revision??0))throw new StoreError(409,'This product changed in another tab. Reload the latest version before saving.');
  if(current&&(next.id!==current.id||next.slug!==current.slug))throw new StoreError(400,'Product IDs and addresses cannot change after creation.');
  for(const variant of next.variants){const before=current?.variants.find(v=>v.id===variant.id);if(before&&before.sku!==variant.sku)throw new StoreError(400,'Existing SKUs cannot change. Create a new variant instead.');if(!before&&(variant.onHand||variant.reserved||variant.available))throw new StoreError(400,'New variants start with zero stock. Receive stock through Inventory.');}
  if(current?.variants.some(v=>!next.variants.some(n=>n.id===v.id)&&(v.onHand||v.reserved)))throw new StoreError(400,'A variant with stock or an active reservation cannot be removed.');
}
