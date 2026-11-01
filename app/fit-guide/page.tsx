import Link from 'next/link';
import '../editorial.css';

export const metadata = { title: 'Find your fit | WESTOS', description: 'Explore six denim silhouettes and learn how to measure a favourite pair before choosing your fit.' };

const fits = [
  { name: 'Slim', mood: 'A closer line.', description: 'Closer through the thigh, with a leg that narrows toward the ankle. A neat silhouette for streamlined outfits.', note: 'Closer thigh · Narrow opening', shape: 'M45 18H115L126 170H100L80 72L60 170H34Z' },
  { name: 'Straight', mood: 'Always in good shape.', description: 'An even line from the knee to the hem. A balanced silhouette that pairs easily with trainers, boots, or a simple tee.', note: 'Balanced thigh · Straight opening', shape: 'M42 18H118L126 170H91L80 73L69 170H34Z' },
  { name: 'Relaxed', mood: 'Room for your day.', description: 'More ease around the seat and thigh, with a looser line through the leg. A natural starting point when you prefer breathing room.', note: 'Roomy thigh · Easy leg', shape: 'M39 18H121L136 170H91L80 75L69 170H24Z' },
  { name: 'Baggy', mood: 'Go a little bigger.', description: 'Generous volume through the thigh and leg. An expressive silhouette that works with a fitted top or an equally easy layer.', note: 'Generous volume · Wide leg', shape: 'M33 18H127L145 170H88L80 76L72 170H15Z' },
  { name: 'Bootcut', mood: 'A different kind of flare.', description: 'A closer line through the thigh and knee that opens out below. The wider hem makes room for boots and a longer-looking line.', note: 'Shaped knee · Flared opening', shape: 'M44 18H116L114 111L137 170H88L80 73L72 170H23L46 111Z' },
  { name: 'Comfort', mood: 'Ease comes first.', description: 'An easy silhouette centred on room around the waist, seat, and thigh. Check the final product details for the precise cut and fabric stretch.', note: 'Easy waist · Room through thigh', shape: 'M37 18H123L134 85L126 170H92L80 76L68 170H34L26 85Z' },
];

export default function FitGuide() {
  return <div className="editorial fit-guide container">
    <header className="editorial-heading"><p className="eyebrow">THE WESTOS FIT GUIDE</p><h1>Same denim love.<br/><em>Different energy.</em></h1><p>Start with a silhouette. Make it your own. Explore six ways to wear your everyday.</p></header>
    <p className="fit-caption">Silhouette illustrations are a general guide. Actual cut, rise, stretch, and measurements vary by product.</p>
    <section className="editorial-fit-grid" aria-label="Compare denim fits">{fits.map((fit, index) => <article className="editorial-fit-card" key={fit.name}>
      <div className="fit-drawing"><span>0{index + 1} /</span><svg viewBox="0 0 160 190" aria-hidden="true"><path d={fit.shape} fill="#496176" stroke="#233b4c" strokeWidth="1.5"/><path d="M45 30H115M80 19V62M77 19V45Q77 55 84 55M46 35Q48 53 64 54M114 35Q112 53 96 54" fill="none" stroke="#bfad89" strokeWidth="1.4"/><circle cx="84" cy="25" r="2" fill="#bfad89"/></svg><span className="fit-drawing-label">WESTOS / FIT STUDY</span></div>
      <div className="fit-details"><h2>{fit.name}</h2><p className="fit-mood">{fit.mood}</p><p>{fit.description}</p><small>{fit.note}</small><Link className="text-link" href={`/shop/?fit=${fit.name}`}>Explore {fit.name.toLowerCase()} <span aria-hidden="true">↗</span></Link></div>
    </article>)}</section>
    <section className="measurement-guide"><div><p className="eyebrow">A LITTLE MEASURING GOES A LONG WAY</p><h2>Start with a pair<br/><em>you already love.</em></h2><p>Lay your favourite jeans flat without stretching them. Use a flexible tape, keep it straight, and write down your measurements in one unit.</p></div><ol><li><strong>Waist</strong><p>Fasten the waistband and smooth it flat. Measure from one side to the other, then double the number for the garment’s waist circumference.</p></li><li><strong>Hip</strong><p>Measure across the widest part of the seat and double it. Check where a product’s size guide places this measurement before comparing.</p></li><li><strong>Inseam</strong><p>Follow the inside leg seam from the crotch to the bottom of the hem. Think about the shoes you plan to wear with your jeans.</p></li><li><strong>Rise &amp; opening</strong><p>Measure from the crotch seam to the top of the front waistband for rise. Measure straight across the hem for the leg opening.</p></li></ol></section>
    <aside className="notice fit-notice"><strong>A note on sizing</strong><p>Sizes in this preview are sample options. Final WESTOS garment measurements and product-specific size charts have not been supplied. These illustrations describe general shapes, not a guarantee of fit; confirm the final measurements before ordering when the store launches.</p></aside>
    <div className="editorial-end"><h2>Your shape.<br/><em>Your kind of denim.</em></h2><Link href="/shop/" className="button">Explore all denim <span aria-hidden="true">↗</span></Link></div>
  </div>;
}
