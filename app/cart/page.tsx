import type {Metadata} from 'next';
import CartView from '@/components/cart-view';
export const metadata:Metadata={title:'Your bag'};
export default function Cart(){return <div className="container"><div className="page-heading"><p className="eyebrow">GOOD CHOICES, ALL TOGETHER</p><h1>Your bag.</h1></div><CartView/></div>;}
