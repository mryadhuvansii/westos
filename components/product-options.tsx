"use client";
import {useState} from 'react';
import Link from 'next/link';
import type {ManagedProduct} from '@/lib/operations';
import {availableQuantity} from '@/lib/cart';
import {useStore} from './store';
import {Icon} from './icon';

export default function ProductOptions({product,colorId,onColorChange}:{product:ManagedProduct;colorId?:string;onColorChange?:(id:string)=>void}){
 const {add,wishlist,toggleWish,products,cart}=useStore();
 const [chosenColor,setChosenColor]=useState(product.colors[0]?.id),[size,setSize]=useState<number>(),[addedVariant,setAddedVariant]=useState<string>();
 const p=products.find(item=>item.id===product.id);
 if(!p)return <p role="status">This piece is currently unavailable.</p>;
 const color=p.colors.find(item=>item.id===(colorId??chosenColor))??p.colors[0];
 if(!color)return <p role="status">This piece is currently unavailable.</p>;
 const variants=p.variants.filter(item=>item.colorId===color.id);
 const selected=variants.find(item=>item.size===size),limit=selected?availableQuantity(p,selected.id):0;
 const quantity=cart.find(item=>item.variantId===selected?.id)?.quantity||0;
 const inStock=variants.some(variant=>availableQuantity(p,variant.id)>0);
 function chooseColor(id:string){setChosenColor(id);onColorChange?.(id);setSize(undefined);setAddedVariant(undefined);}
 return <div className="detail-options">
   <fieldset className="color-fieldset"><legend>Wash: <strong>{color.name}</strong></legend><div className="color-options">{p.colors.map(option=><button key={option.id} type="button" aria-pressed={color.id===option.id} onClick={()=>chooseColor(option.id)}><i style={{background:option.hex}} aria-hidden="true"/><span>{option.name}</span></button>)}</div></fieldset>
   <div className="size-label-row"><span>Select waist size</span><Link href="/fit-guide/">Find your fit ↗</Link></div>
   <fieldset className="size-fieldset"><legend className="sr-only">Waist size for {color.name}, in inches</legend><div className="size-options">{variants.map(variant=><button key={variant.id} type="button" disabled={!availableQuantity(p,variant.id)} aria-label={`Size ${variant.size}, ${color.name}${availableQuantity(p,variant.id)?'':' — out of stock'}`} aria-pressed={size===variant.size} className={size===variant.size?'selected':''} onClick={()=>{setSize(variant.size);setAddedVariant(undefined);}}>{variant.size}</button>)}</div></fieldset>
   {!inStock&&<p className="notice">This wash is currently out of stock. {p.colors.length>1?'Try another colour or save this piece.':'Save this piece for later.'}</p>}
   {selected&&<p className="variant-reference">{color.name} / Waist {selected.size} · SKU {selected.sku}</p>}
   <div className="add-row"><button className="button" disabled={!limit||quantity>=limit} onClick={()=>{if(selected&&add(p.id,selected.id))setAddedVariant(selected.id);}}>{!inStock?'Out of stock':!size?'Select a size':!limit?'Size unavailable':quantity>=limit?'Available quantity in bag':addedVariant===selected?.id?'Add another pair':'Add to bag'}<Icon name="bag"/></button><button className="icon-button" aria-label={`${wishlist.includes(p.id)?'Unsave':'Save'} ${p.name}`} aria-pressed={wishlist.includes(p.id)} onClick={()=>toggleWish(p.id)}><Icon name="heart" style={{fill:wishlist.includes(p.id)?'currentColor':'none'}}/></button></div>
   {addedVariant===selected?.id&&quantity>0&&<Link href="/cart/" className="text-link" style={{marginTop:15}}>Your pair is in the bag. View bag <Icon name="arrow" size={18}/></Link>}
 </div>;
}
