import BuybackVisibility from '@/components/buyback-visibility';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import BuybackChecker from '@/components/buyback-checker';

export const metadata: Metadata = { title: 'Wear. Return. Renew. — Buyback', description: 'Discover Westos Jeans Buyback: give your old Westos jeans a new chapter and save on your next pair. Program coming soon.' };

export default function BuybackPage() {
  return <BuybackVisibility fallback={<section className="container secondary-empty"><p className="eyebrow">WESTOS JEANS BUYBACK</p><h1>Buyback is currently unavailable.</h1><p>The program information and eligibility checker are paused. No claims or credits are being accepted.</p><Link href="/shop/" className="button">Explore the collection ↗</Link></section>}>
    <section className="buyback-hero"><div className="buyback-hero-copy"><p className="eyebrow">WESTOS JEANS BUYBACK · COMING SOON</p><h1>Wear.<br />Return.<br /><em>Renew.</em></h1><p>Good denim has more than one chapter.<br />Let your old pair help you find your next.</p><a href="#eligibility" className="button">Explore your eligibility <span aria-hidden="true">↗</span></a><span className="buyback-hero-caption">SAME WESTOS SPIRIT. A NEW BEGINNING.</span></div><div className="buyback-hero-image"><Image src="/images/buyback.webp" alt="A stack of worn blue jeans, ready for their next chapter" fill sizes="(max-width: 700px) 100vw, 55vw" priority /></div></section>
    <div className="container">
      <section className="buyback-intro"><p className="eyebrow">KEEP THE STORY GOING</p><h2>Your favourites deserve<br />a thoughtful next chapter.</h2><p>We’re building a way to return your eligible Westos jeans when your next pair arrives. A simple exchange, a little off your new pair, and more possibilities for the denim you’ve loved.</p></section>
      <section className="buyback-benefits" aria-label="Buyback benefits"><div><span className="eyebrow">THE EVERYDAY BENEFIT</span><strong>₹150 <small>OFF</small></strong><p>Default buyback benefit on your next eligible jeans purchase.</p></div><div><span className="eyebrow">WHEN A PROMOTION IS LIVE</span><strong>₹200 <small>OFF</small></strong><p>Promotional benefit on new jeans priced ₹999 or more.</p></div><div><span className="eyebrow">YOUR WINDOW TO RENEW</span><strong>180 <small>DAYS</small></strong><p>From the original purchase of the Westos pair you return.</p></div></section>
      <section className="buyback-how"><div className="section-heading"><div><p className="eyebrow">A SIMPLE EXCHANGE</p><h2>From lived-in to what’s next.</h2></div><span className="muted">HOW IT WILL WORK</span></div><div className="buyback-how-grid">{[
        ['01', 'Find your next pair.', 'Choose new Westos jeans and check your original pair against the buyback conditions.'],
        ['02', 'Link your old favourites.', 'Your account, original order and unique jeans serial code establish the connection. Each pair can be used once.'],
        ['03', 'Handover. Hello, new denim.', 'Have your old pair ready when the new one arrives. The delivery handover completes the physical verification.'],
      ].map(([number, title, description]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{description}</p></article>)}</div></section>
      <BuybackChecker />
      <section className="buyback-faq"><div><p className="eyebrow">THE FINER DETAILS</p><h2>A little more<br />to know.</h2></div><div>{[
        ['Can I return jeans from another brand?', 'The program is for genuine Westos jeans only. Each pair needs its original, readable serial code and a purchase linked to your account and order.'],
        ['How much will I save?', 'The default benefit is ₹150 off. A promotional ₹200 benefit may be available on new jeans priced at ₹999 or more when a qualifying promotion is active. The program is not live yet.'],
        ['When do I hand over my old jeans?', 'The old pair must be physically available for handover and verification when your new order is delivered. A checklist result alone does not approve the buyback.'],
        ['Can I use the same pair more than once?', 'No. The unique serial code can be used for one buyback only. Your original purchase must also fall within the 180-day eligibility window.'],
        ['Is buyback available right now?', 'Not yet. Westos Jeans Buyback is coming after the store launches. This page lets you explore the program and its requirements; no claims or credit can be issued here.'],
      ].map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>
      <section className="buyback-final"><p className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</p><h2>Find a pair worth living in.</h2><Link href="/shop" className="button">Explore the collection <span aria-hidden="true">↗</span></Link></section>
    </div>
  </BuybackVisibility>;
}
