import BuybackVisibility from '@/components/buyback-visibility';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Your Westos' };

export default function AccountPage() {
  return <div className="container account-page">
    <div className="account-heading"><p className="eyebrow">A LITTLE SPACE FOR YOUR DENIM</p><h1>Your Westos.</h1><p>The pairs you love. The stories still to come.</p></div>
    <div className="account-layout"><aside className="account-sidebar"><span className="account-monogram" aria-hidden="true">W.</span><h2>Welcome, denim lover.</h2><p>You’re browsing as a guest.</p><div className="notice">Accounts are coming soon. You can explore the collection and keep a wishlist on this browser today.</div></aside>
      <div className="account-content"><div className="account-link-grid"><Link href="/wishlist" className="account-link-card"><span className="eyebrow">01 / YOUR EDIT</span><h2>Saved for later <span aria-hidden="true">↗</span></h2><p>All those can’t-stop-thinking-about pairs, in one place.</p><span className="text-link">Open your wishlist</span></Link><Link href="/cart" className="account-link-card"><span className="eyebrow">02 / ALMOST YOURS</span><h2>Your shopping bag <span aria-hidden="true">↗</span></h2><p>Take another look at your picks. A good fit is worth it.</p><span className="text-link">View your bag</span></Link></div>
        <section className="account-orders"><div><p className="eyebrow">03 / YOUR DENIM JOURNEY</p><h2>Orders & returns</h2></div><span className="secondary-label">AVAILABLE AT LAUNCH</span><div className="account-empty-order"><span aria-hidden="true">↗</span><h3>Your first chapter is yet to come.</h3><p>Once accounts and ordering are live, find your orders, follow delivery updates and request eligible returns here.</p><Link href="/shop" className="button secondary">Find your first pair</Link></div></section>
        <BuybackVisibility><Link href="/buyback" className="account-buyback"><div><p className="eyebrow">04 / WESTOS JEANS BUYBACK</p><h2>Wear. Return. Renew.</h2><p>A new chapter for your old favourites. Discover the upcoming program.</p></div><span aria-hidden="true">↗</span></Link></BuybackVisibility>
      </div></div>
  </div>;
}
