'use client';
import {createContext, useContext, useEffect, useRef, useState} from 'react';
import {products} from '@/lib/catalog';
import {addItem, changeQuantity, normalizeCart, type CartItem} from '@/lib/cart';
type Store = { cart:CartItem[]; wishlist:string[]; ready:boolean; add:(id:string,size:number)=>boolean; update:(id:string,size:number,delta:number)=>void; toggleWish:(id:string)=>void; toast:(message:string)=>void };
const Context = createContext<Store | null>(null);
const CART = 'westos.bag.v1', WISH = 'westos.saved.v1';
function validWishlist(value: unknown): string[] { return Array.isArray(value) ? [...new Set(value.filter((id):id is string => typeof id === 'string' && products.some(p=>p.id===id)))]:[]; }
export function StoreProvider({children}:{children:React.ReactNode}) {
  const [cart,setCart]=useState<CartItem[]>([]), [wishlist,setWishlist]=useState<string[]>([]), [ready,setReady]=useState(false), [message,setMessage]=useState('');
  const timer=useRef<ReturnType<typeof setTimeout> | null>(null);
  function toast(text:string) { setMessage(text); if(timer.current)clearTimeout(timer.current); timer.current=setTimeout(()=>setMessage(''),4000); }
  useEffect(()=>{
    try { setCart(normalizeCart(JSON.parse(localStorage.getItem(CART)||'[]'))); } catch { setMessage('Your saved bag could not be loaded. You can start a new one.'); }
    try { setWishlist(validWishlist(JSON.parse(localStorage.getItem(WISH)||'[]'))); } catch { setMessage('Your saved pieces could not be loaded. Your bag is still available.'); }
    setReady(true);
    return ()=>{if(timer.current)clearTimeout(timer.current);};
  },[]);
  // ponytail: browser-only demo persistence; move cart and wishlist to authenticated APIs before live commerce.
  useEffect(()=>{if(ready)try {localStorage.setItem(CART,JSON.stringify(cart));localStorage.setItem(WISH,JSON.stringify(wishlist));}catch{setMessage('Storage is unavailable. Your bag will last for this visit only.');}},[cart,wishlist,ready]);
  function add(id:string,size:number) {
    if(!products.some(p=>p.id===id&&p.sizes.includes(size))) {toast('Choose an available size first.');return false;}
    if((cart.find(i=>i.productId===id&&i.size===size)?.quantity||0)>=5){toast('The sample bag allows up to 5 of each size.');return false;}
    setCart(current=>addItem(current,id,size));toast('Added to your bag. A good choice.');return true;
  }
  function toggleWish(id:string) { if(!products.some(p=>p.id===id))return;setWishlist(current=>current.includes(id)?current.filter(x=>x!==id):[...current,id]);toast(wishlist.includes(id)?'Removed from your saved pieces.':'Saved for another day.'); }
  return <Context.Provider value={{cart,wishlist,ready,add,update:(id,size,delta)=>setCart(current=>changeQuantity(current,id,size,delta)),toggleWish,toast}}>{children}<div className={`toast ${message?'visible':''}`} role="status" aria-live="polite">{message}</div></Context.Provider>;
}
export function useStore(){const store=useContext(Context);if(!store)throw new Error('StoreProvider is required');return store;}
