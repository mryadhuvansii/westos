import Image from 'next/image';
import Link from 'next/link';
import '../editorial.css';

export const metadata = { title: 'Our story | WESTOS', description: 'The WESTOS point of view: everyday denim, individual expression, and the possibility of another chapter.' };

export default function Story() {
  return <div className="editorial story-page">
    <section className="story-opening container">
      <div><p className="eyebrow">THIS IS WESTOS</p><h1>Life happens.<br/><em>Wear your story.</em></h1></div>
      <p>The first coffee. A familiar street. The long way home. We believe the everyday deserves a good pair of jeans.</p>
    </section>
    <div className="story-campaign"><Image src="/images/hero.webp" alt="Relaxed blue denim in the warmth of an afternoon by sandstone architecture" fill priority sizes="100vw"/><span>YOUR LIFE. YOUR FIT. YOUR WESTOS.</span></div>
    <section className="story-manifesto container"><p className="eyebrow">A POINT OF VIEW, WORN EVERY DAY.</p><h2>Good denim doesn’t need<br/>an occasion. <em>Just you.</em></h2><div className="story-paragraphs"><p>WESTOS starts with something simple: a wardrobe should feel like your own. A straight leg you return to. A relaxed fit for unhurried days. A bigger silhouette when you feel like taking up a little more space.</p><p>Our direction is everyday denim with room for individuality. Familiar washes, different silhouettes, and the freedom to wear them your way. You bring the plans. You bring the personality. The denim comes along.</p></div></section>
    <section className="story-values container" aria-label="The WESTOS philosophy">{[
      ['01', 'Find your own rhythm.', 'There is no single right silhouette. Explore the shape that works with your movement, your wardrobe, and your day.'],
      ['02', 'Make the familiar yours.', 'An indigo wash. A white tee. Your favourite shoes. The most personal combinations can start with the simplest pieces.'],
      ['03', 'Think beyond today.', 'The story of a pair can keep evolving. Our planned buyback program explores what the next chapter could look like.'],
    ].map(([number, title, copy]) => <article key={number}><span>{number} /</span><h3>{title}</h3><p>{copy}</p></article>)}</section>
    <section className="story-next container"><div className="story-next-image"><Image src="/images/buyback.webp" alt="A stack of textured blue denim in three washes" fill sizes="(max-width: 760px) 100vw, 45vw"/></div><div><p className="eyebrow">ANOTHER CHAPTER</p><h2>Wear. Return.<br/><em>Renew.</em></h2><p>We’re planning a buyback program for eligible WESTOS jeans. A considered next step, with the program details and conditions to be confirmed before launch.</p><Link href="/buyback/" className="text-link">Explore the buyback concept <span aria-hidden="true">↗</span></Link></div></section>
    <section className="editorial-end container"><p className="eyebrow">YOUR EVERYDAY STARTS HERE</p><h2>Find a pair.<br/><em>Make it your own.</em></h2><Link href="/shop/" className="button">Explore the collection <span aria-hidden="true">↗</span></Link></section>
  </div>;
}
