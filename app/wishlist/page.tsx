import type {Metadata} from 'next';
import WishlistView from '@/components/wishlist-view';
export const metadata:Metadata={title:'Your saved pieces'};
export default function Wishlist(){return <div className="container wishlist-page"><div className="page-heading"><p className="eyebrow">LOVE IT. SAVE IT. MAKE IT YOURS.</p><h1>Your saved pieces.</h1></div><WishlistView/></div>;}
