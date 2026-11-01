import Link from 'next/link';
import '../editorial.css';

export const metadata = { title: 'Help & information | WESTOS', description: 'Answers about the WESTOS storefront preview, fit, checkout, saved pieces, and the planned jeans buyback program.' };

const questions = [
  ['Can I place an order?', <>This is a storefront preview with a sample catalog. You can explore the collection and try the shopping journey, but live ordering and payments are not available. Visit <Link href="/checkout/">checkout</Link> to see the preview.</>],
  ['Are the products and prices final?', <>Product names, prices, available sizes, and imagery demonstrate the store experience. They do not confirm real stock or final product specifications. Final catalog details will need to be confirmed before live ordering begins.</>],
  ['How do I choose my fit and size?', <>Our <Link href="/fit-guide/">fit guide</Link> compares six silhouettes and explains how to measure a favourite pair. The sample size options are not a verified size chart. Product-specific measurements will be needed before you can make a final sizing decision.</>],
  ['Where do you deliver, and what does shipping cost?', <>Delivery locations, courier partners, shipping prices, and estimated delivery times are still to be confirmed. Any delivery step in the checkout preview is illustrative and does not reserve a shipment.</>],
  ['What is the returns and exchange policy?', <>The final return window, eligibility conditions, exchange process, and any related charges have not been confirmed. A published policy must be available before the store accepts live orders.</>],
  ['How does jeans buyback work?', <>WESTOS is planning a buyback program for eligible jeans. Explore the <Link href="/buyback/">buyback page</Link> for the concept and an illustrative eligibility check. Final terms and benefits must be confirmed before launch; the preview does not submit a real buyback request.</>],
  ['Where can I find my saved pieces?', <>Open your <Link href="/wishlist/">saved pieces</Link> to revisit styles you like. This preview stores shopping selections in your current browser; they are not connected to a live customer account.</>],
  ['Can I track an order or sign in?', <>The <Link href="/account/">account page</Link> previews the customer experience. Live sign-in, order history, and shipment tracking require the store’s customer and order services to be connected.</>],
  ['How can I contact WESTOS?', <>Verified customer support contact details have not yet been supplied. An official support email or phone number will be added before launch. This preview does not accept support messages.</>],
];

export default function Help() {
  return <div className="editorial help-page container">
    <header className="editorial-heading"><p className="eyebrow">A LITTLE GUIDANCE</p><h1>Good questions.<br/><em>Clear answers.</em></h1><p>Everything to know while exploring WESTOS.</p></header>
    <div className="help-layout"><aside className="help-sidebar"><h2>Find your way.</h2><nav aria-label="Helpful pages"><Link href="/fit-guide/">Find your fit <span aria-hidden="true">↗</span></Link><Link href="/checkout/">Checkout preview <span aria-hidden="true">↗</span></Link><Link href="/account/">Your account <span aria-hidden="true">↗</span></Link><Link href="/buyback/">Jeans buyback <span aria-hidden="true">↗</span></Link><Link href="/wishlist/">Saved pieces <span aria-hidden="true">↗</span></Link></nav><div className="help-preview-note"><span className="eyebrow">YOU’RE EXPLORING A PREVIEW</span><p>Sample collection. No live orders or payments. More details will be added before launch.</p></div></aside><section className="help-faq" aria-label="Frequently asked questions">{questions.map(([question, answer], index) => <details key={index}><summary>{question}<span aria-hidden="true">+</span></summary><div>{answer}</div></details>)}</section></div>
    <section className="editorial-end"><p className="eyebrow">BACK TO THE GOOD STUFF</p><h2>A little more denim.<br/><em>A little more you.</em></h2><Link href="/shop/" className="button">Explore the collection <span aria-hidden="true">↗</span></Link></section>
  </div>;
}
