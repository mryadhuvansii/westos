'use client';
import Link from 'next/link';
import ProductCard from './product-card';
import {useStore} from './store';
import {Icon} from './icon';
export default function WishlistView(){const {wishlist,ready,products}=useStore();if(!ready)return <div className="loading-page">Finding your saved pieces…</div>;return wishlist.length?<><p className="muted">{wishlist.length} {wishlist.length===1?'piece':'pieces'} saved on this browser.</p><div className="product-grid">{products.filter(p=>wishlist.includes(p.id)).map(p=><ProductCard key={p.id} product={p}/>)}</div></>:<div className="empty-state"><Icon name="heart" size={44}/><h2>For the ones you come back to.</h2><p>Tap the heart on a piece you love. We&apos;ll keep it here for another day, on this browser.</p><Link href="/shop/" className="button">Explore the collection <Icon name="arrow"/></Link></div>;}
