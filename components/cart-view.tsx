"use client";
import Link from 'next/link';
import Image from 'next/image';
import {formatPrice} from '@/lib/catalog';
import {cartTotal,availableQuantity} from '@/lib/cart';
import {useStore} from './store';
import {Icon} from './icon';

export default function CartView(){
 const {cart,ready,update,products}=useStore();const count=cart.reduce((sum,item)=>sum+item.quantity,0);
 if(!ready)return <div className="loading-page" role="status">Opening your bag…</div>;
 if(!cart.length)return <div className="empty-state"><Icon name="bag" size={44}/><h2>A little room for possibility.</h2><p>Your bag is empty. Let&apos;s find a pair that feels like you.</p><Link href="/shop/" className="button">Find your everyday <Icon name="arrow"/></Link></div>;
 return <div className="bag-layout"><div><p className="eyebrow">{count} {count===1?'GOOD CHOICE':'GOOD CHOICES'}</p>{cart.map(item=>{
   const p=products.find(product=>product.id===item.productId),variant=p?.variants.find(variant=>variant.id===item.variantId),color=p?.colors.find(color=>color.id===variant?.colorId);
   if(!p||!variant||!color)return null;
   const href=`/product/${p.slug}/?color=${encodeURIComponent(color.id)}`,label=`${p.name}, ${color.name}, size ${variant.size}`;
   return <article className="bag-item" key={item.variantId}><Link href={href} className="bag-item-image"><Image src={color.images[0]??p.image} alt={`${p.name} in ${color.name}`} fill sizes="110px"/></Link><div><p>{p.fit.toUpperCase()} FIT</p><h2><Link href={href}>{p.name}</Link></h2><p>{color.name} / Waist {variant.size}</p><p className="variant-reference">SKU {variant.sku}</p><div className="quantity-controls"><div className="quantity-input"><button aria-label={`Decrease quantity of ${label}`} onClick={()=>update(item.variantId,-1)}><Icon name="minus" size={14}/></button><output aria-label={`Quantity of ${label}`}>{item.quantity}</output><button aria-label={`Increase quantity of ${label}`} disabled={item.quantity>=availableQuantity(p,variant.id)} onClick={()=>update(item.variantId,1)}><Icon name="plus" size={14}/></button></div><button className="remove-button" onClick={()=>update(item.variantId,-item.quantity)} aria-label={`Remove ${label}`}>Remove</button></div></div><span className="item-price">{formatPrice(item.quantity*p.price)}</span></article>;
 })}<Link className="text-link bag-continue" href="/shop/">Keep exploring <Icon name="arrow" size={18}/></Link></div><aside className="bag-summary"><h2>Your bag, at a glance.</h2><div className="summary-row"><span>Subtotal</span><span>{formatPrice(cartTotal(cart,products))}</span></div><div className="summary-row"><span>Delivery</span><span>Confirmed at launch</span></div><div className="summary-row"><span>Taxes & offers</span><span>To be configured</span></div><div className="summary-row total"><span>Preview subtotal</span><strong>{formatPrice(cartTotal(cart,products))}</strong></div><Link href="/checkout/" className="button full-width">Preview checkout <Icon name="arrow" size={19}/></Link><p>Your bag does not reserve inventory. Nothing is charged. Final prices, taxes and delivery will be confirmed when live ordering opens.</p></aside></div>;
}
