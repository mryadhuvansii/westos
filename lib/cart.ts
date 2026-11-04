import type {ManagedProduct} from './operations.ts';

export type CartItem = {productId:string; variantId:string; size:number; quantity:number};

export function availableQuantity(product:ManagedProduct, variantId:string):number {
  if(product.status!=='published')return 0;
  const variant=product.variants.find(item=>item.id===variantId);
  if(!variant||!product.colors.some(color=>color.id===variant.colorId))return 0;
  return Number.isInteger(variant.available)&&variant.available>0?Math.min(5,variant.available):0;
}

export function normalizeCart(value:unknown,catalog:readonly ManagedProduct[]):CartItem[]{
  if(!Array.isArray(value))return [];
  const items=new Map<string,CartItem>();
  for(const item of value){
    if(!item||typeof item!=='object')continue;
    const {productId,variantId,size,quantity}=item as Record<string,unknown>;
    const product=catalog.find(entry=>entry.id===productId);
    if(!product||typeof quantity!=='number'||!Number.isFinite(quantity)||quantity<1)continue;
    // Old bags only identify a size. Map them to the original colour, never an arbitrary new colour.
    const variant=typeof variantId==='string'?product.variants.find(entry=>entry.id===variantId)
      :variantId===undefined&&typeof size==='number'?product.variants.find(entry=>entry.colorId==='default'&&entry.size===size):undefined;
    if(!variant||(size!==undefined&&size!==variant.size))continue;
    const limit=availableQuantity(product,variant.id);
    if(!limit)continue;
    const count=Math.min(limit,Math.trunc(quantity));
    items.set(variant.id,{productId:product.id,variantId:variant.id,size:variant.size,quantity:Math.min(limit,(items.get(variant.id)?.quantity??0)+count)});
  }
  return [...items.values()];
}

export function changeQuantity(cart:readonly CartItem[],variantId:string,delta:number,catalog:readonly ManagedProduct[]):CartItem[]{
  const items=normalizeCart(cart,catalog);
  if(!Number.isInteger(delta))return items;
  return items.map(item=>item.variantId===variantId?{...item,quantity:Math.min(availableQuantity(catalog.find(product=>product.id===item.productId)!,variantId),item.quantity+delta)}:item).filter(item=>item.quantity>0);
}

export function addItem(cart:readonly CartItem[],productId:string,variantId:string,catalog:readonly ManagedProduct[]):CartItem[]{
  return normalizeCart([...cart,{productId,variantId,quantity:1}],catalog);
}

export function cartTotal(cart:readonly CartItem[],catalog:readonly ManagedProduct[]):number{
  return normalizeCart(cart,catalog).reduce((total,item)=>total+catalog.find(product=>product.id===item.productId)!.price*item.quantity,0);
}
