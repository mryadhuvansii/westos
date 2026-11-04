'use client';
import {createContext, useContext, useEffect, useRef, useState} from 'react';
import type {ManagedProduct,StoreData} from '@/lib/operations';
import {addItem, availableQuantity, changeQuantity, normalizeCart, type CartItem} from '@/lib/cart';
type Store = StoreData & { cart:CartItem[]; wishlist:string[]; ready:boolean; add:(id:string,variantId:string)=>boolean; update:(variantId:string,delta:number)=>void; toggleWish:(id:string)=>void; toast:(message:string)=>void };
const Context = createContext<Store | null>(null);
const CART = 'westos.bag.v2', LEGACY_CART = 'westos.bag.v1', WISH = 'westos.saved.v1';
function validWishlist(value: unknown,products:ManagedProduct[]): string[] { return Array.isArray(value) ? [...new Set(value.filter((id):id is string => typeof id === 'string' && products.some(p=>p.id===id)))]:[]; }
export function StoreProvider({children,initialData}:{children:React.ReactNode;initialData:StoreData}) {
  const [data,setData]=useState(initialData), [cart,setCart]=useState<CartItem[]>([]), [wishlist,setWishlist]=useState<string[]>([]), [ready,setReady]=useState(false), [message,setMessage]=useState('');
  const {products}=data;
  const timer=useRef<ReturnType<typeof setTimeout> | null>(null);
  function toast(text:string) { setMessage(text); if(timer.current)clearTimeout(timer.current); timer.current=setTimeout(()=>setMessage(''),4000); }
  useEffect(()=>{
    setData(initialData);
    try { setCart(normalizeCart(JSON.parse(localStorage.getItem(CART)??localStorage.getItem(LEGACY_CART)??'[]'),initialData.products)); } catch { setMessage('Your saved bag could not be loaded. You can start a new one.'); }
    try { setWishlist(validWishlist(JSON.parse(localStorage.getItem(WISH)||'[]'),initialData.products)); } catch { setMessage('Your saved pieces could not be loaded. Your bag is still available.'); }
    setReady(true);
    return ()=>{if(timer.current)clearTimeout(timer.current);};
  },[initialData]);
  useEffect(()=>{
    let stopped=false,pending=false;
    const controller=new AbortController();
    async function refresh(){
      if(pending||document.visibilityState==='hidden')return;
      pending=true;
      try{
        const response=await fetch('/api/store',{cache:'no-store',signal:controller.signal});
        if(!response.ok)throw new Error('Catalogue unavailable');
        const next:StoreData=await response.json();
        if(!stopped){setData(next);setCart(current=>normalizeCart(current,next.products));setWishlist(current=>validWishlist(current,next.products));}
      }catch{/* Preserve the last verified catalogue and bag when refresh fails. */}
      finally{pending=false;}
    }
    window.addEventListener('focus',refresh);
    window.addEventListener('westos:store-updated',refresh);
    document.addEventListener('visibilitychange',refresh);
    const interval=setInterval(refresh,30000);
    return()=>{stopped=true;controller.abort();clearInterval(interval);window.removeEventListener('focus',refresh);window.removeEventListener('westos:store-updated',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[]);
  // ponytail: this browser bag does not reserve stock; live checkout must reserve against the server inventory.
  useEffect(()=>{if(ready)try {localStorage.setItem(CART,JSON.stringify(cart));localStorage.setItem(WISH,JSON.stringify(wishlist));}catch{setMessage('Storage is unavailable. Your bag will last for this visit only.');}},[cart,wishlist,ready]);
  function add(id:string,variantId:string) {
    const product=products.find(p=>p.id===id),limit=product?availableQuantity(product,variantId):0;
    if(!limit){toast('This size is currently unavailable.');return false;}
    if((cart.find(i=>i.productId===id&&i.variantId===variantId)?.quantity||0)>=limit){toast('Your bag has the available quantity for this size (up to 5).');return false;}
    setCart(current=>addItem(current,id,variantId,products));toast('Added to your bag.');return true;
  }
  function toggleWish(id:string) { if(!products.some(p=>p.id===id))return;setWishlist(current=>current.includes(id)?current.filter(x=>x!==id):[...current,id]);toast(wishlist.includes(id)?'Removed from your saved pieces.':'Saved for another day.'); }
  return <Context.Provider value={{...data,cart,wishlist,ready,add,update:(variantId,delta)=>setCart(current=>changeQuantity(current,variantId,delta,products)),toggleWish,toast}}>{children}<div className={`toast ${message?'visible':''}`} role="status" aria-live="polite">{message}</div></Context.Provider>;
}
export function useStore(){const store=useContext(Context);if(!store)throw new Error('StoreProvider is required');return store;}
