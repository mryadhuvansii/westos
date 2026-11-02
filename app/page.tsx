import Link from 'next/link';
import DenimRoom from '@/components/denim-room';
import {Icon} from '@/components/icon';
import './room.css';

export default function Home(){return <>
  <DenimRoom/>
  <section className="room-notes">
    <div><p className="eyebrow">GOOD DENIM. GREAT STORIES.</p><h2>A little more <em>you.</em></h2><p>Different fits. Different washes. Find a pair for wherever the everyday takes you.</p><Link href="/shop/" className="text-link">Explore the full collection <Icon name="arrow" size={18}/></Link></div>
    <Link href="/buyback/" className="room-buyback"><span className="eyebrow">THE NEXT CHAPTER · COMING SOON</span><h2>Wear. Return.<br/><em>Renew.</em></h2><span>Discover WESTOS jeans buyback <Icon name="arrow" size={20}/></span></Link>
  </section>
</>;}
