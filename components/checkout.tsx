'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/components/store';
import { products, formatPrice } from '@/lib/catalog';
import { cartTotal } from '@/lib/cart';

const steps = ['Address', 'Shipping', 'Payment', 'Review'];
const emptyAddress = { name: '', email: '', phone: '', street: '', city: '', state: '', pincode: '' };

export default function Checkout() {
  const { cart, ready } = useStore();
  const [step, setStep] = useState(0);
  // ponytail: address stays in this mounted preview only; real checkout needs an authenticated server session.
  const [address, setAddress] = useState(emptyAddress);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [step]);

  if (!ready) return <div className="container checkout-loading" role="status">Loading your bag…</div>;
  if (!cart.length) return <section className="container secondary-empty"><p className="eyebrow">A GOOD PLACE TO START</p><h1>Your next favourite pair awaits.</h1><p>Add a pair to your bag to explore the checkout preview.</p><Link href="/shop" className="button">Explore the collection <span aria-hidden="true">↗</span></Link></section>;

  return <div className="container checkout-page">
    <Link href="/cart" className="text-link checkout-back">← Back to your bag</Link>
    <div className="checkout-page-title"><div><p className="eyebrow">THE FINAL DETAILS</p><h1>Make it yours.</h1></div><span className="secondary-label">CHECKOUT PREVIEW</span></div>
    <p className="notice">Explore a sample checkout. Ordering is not available yet. Use sample details; your address is kept only while this page is open.</p>
    <div className="checkout-grid">
      <section className="checkout-flow" aria-label="Checkout details">
        <ol className="checkout-steps" aria-label="Checkout progress">
          {steps.map((name, index) => <li key={name} className={index === step ? 'is-current' : index < step ? 'is-complete' : ''} aria-current={index === step ? 'step' : undefined}><span>{index < step ? '✓' : `0${index + 1}`}</span>{name}</li>)}
        </ol>
        <div className="checkout-step-content">
          <p className="eyebrow">STEP 0{step + 1} OF 04</p>
          <h2 ref={heading} tabIndex={-1}>{['Where should your denim go?', 'A little closer to your doorstep.', 'Payment, with peace of mind.', 'One last look.'][step]}</h2>
          {step === 0 && <form className="checkout-form" onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            setAddress(Object.fromEntries(Object.keys(emptyAddress).map((key) => [key, String(data.get(key) ?? '').trim()])) as typeof emptyAddress);
            setStep(1);
          }}>
            <p className="muted">All fields are required. This preview does not save or submit your personal details.</p>
            <label className="full-field">Full name<input name="name" autoComplete="name" defaultValue={address.name} required minLength={2} maxLength={100} pattern=".*\S.*" placeholder="Your full name" /></label>
            <label>Email address<input name="email" type="email" autoComplete="email" defaultValue={address.email} required maxLength={160} placeholder="you@example.com" /></label>
            <label>Mobile number<span className="checkout-phone"><span>+91</span><input name="phone" type="tel" autoComplete="tel-national" inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} title="Enter a 10-digit Indian mobile number, starting with 6, 7, 8, or 9" defaultValue={address.phone} required placeholder="10-digit mobile number" /></span></label>
            <label className="full-field">Street address<input name="street" autoComplete="street-address" defaultValue={address.street} required minLength={5} maxLength={250} pattern=".*\S.*" placeholder="House, building, street and area" /></label>
            <label>City<input name="city" autoComplete="address-level2" defaultValue={address.city} required minLength={2} maxLength={100} pattern=".*\S.*" placeholder="City" /></label>
            <label>State or union territory<input name="state" autoComplete="address-level1" defaultValue={address.state} required minLength={2} maxLength={100} pattern=".*\S.*" placeholder="State or union territory" /></label>
            <label>PIN code<input name="pincode" autoComplete="postal-code" inputMode="numeric" pattern="[1-9][0-9]{5}" title="Enter a valid 6-digit Indian PIN code" maxLength={6} defaultValue={address.pincode} required placeholder="6-digit PIN code" /></label>
            <div className="full-field checkout-form-actions"><button className="button" type="submit">Continue to shipping <span aria-hidden="true">→</span></button></div>
          </form>}
          {step === 1 && <>
            <p className="muted">Delivery options will be confirmed for your address when the store opens.</p>
            <div className="checkout-detail-box"><span className="secondary-label">DELIVERY ADDRESS</span><strong>{address.name}</strong><p>{address.street}<br />{address.city}, {address.state} — {address.pincode}</p><button type="button" className="text-link" onClick={() => setStep(0)}>Edit address</button></div>
            <div className="checkout-unavailable"><span aria-hidden="true">↗</span><div><h3>Shipping will be confirmed at launch</h3><p>Courier availability, delivery dates and charges are not configured for this preview.</p></div></div>
            <button className="button" type="button" onClick={() => setStep(2)}>Preview payment <span aria-hidden="true">→</span></button>
          </>}
          {step === 2 && <>
            <p className="muted">UPI payments will open with YouPI-PG once the store is live.</p>
            <div className="checkout-payment-preview"><span className="secondary-label">UPI WITH YOUPI-PG</span><h3>Your UPI. Your next pair.</h3><p>YouPI-PG is selected for checkout. Merchant setup is still pending, so no payment details are requested and no money is charged in this preview.</p></div>
            <div className="checkout-form-actions"><button className="text-link" type="button" onClick={() => setStep(1)}>← Shipping</button><button className="button" type="button" onClick={() => setStep(3)}>Review details <span aria-hidden="true">→</span></button></div>
          </>}
          {step === 3 && <>
            <p className="muted">Your sample checkout is ready to review. No order has been created.</p>
            <div className="checkout-review">
              <div><h3>Contact & delivery</h3><button className="text-link" type="button" onClick={() => setStep(0)}>Edit</button><p>{address.name}<br />{address.email}<br />+91 {address.phone}</p><p>{address.street}<br />{address.city}, {address.state} — {address.pincode}</p></div>
              <div><h3>Shipping & payment</h3><p>Available after launch. Final delivery charges, taxes and the payable total will be confirmed before payment.</p></div>
            </div>
            <button className="button checkout-place-order" type="button" disabled aria-describedby="order-unavailable">Place order — coming soon</button>
            <p id="order-unavailable" className="checkout-smallprint">Ordering opens when payment, shipping and tax settings are ready.</p>
            <button className="text-link" type="button" onClick={() => { setAddress(emptyAddress); setStep(0); }}>Clear sample address</button>
          </>}
        </div>
      </section>
      <aside className="checkout-summary" aria-label="Order summary"><div className="checkout-summary-heading"><h2>In your bag</h2><Link href="/cart" className="text-link">Edit</Link></div>
        <div className="checkout-items">{cart.map((item) => { const product = products.find((entry) => entry.id === item.productId); return product && <div className="checkout-item" key={`${item.productId}-${item.size}`}><div className="checkout-item-image"><Image src={product.image} alt={product.name} fill sizes="72px" /></div><div><h3>{product.name}</h3><p>{product.color} · Size {item.size}</p><p>Qty {item.quantity}</p></div><strong>{formatPrice(product.price * item.quantity)}</strong></div>; })}</div>
        <dl className="checkout-totals"><div><dt>Products subtotal</dt><dd>{formatPrice(cartTotal(cart))}</dd></div><div><dt>Shipping</dt><dd>To be confirmed</dd></div><div><dt>Tax calculation</dt><dd>To be confirmed</dd></div><div className="checkout-total-pending"><dt>Final total</dt><dd>Available at launch</dd></div></dl>
        <p className="checkout-smallprint">Sample catalogue pricing. No reservation or purchase is made during the preview.</p>
        <div className="checkout-buyback-note"><p className="eyebrow">A NEW CHAPTER FOR YOUR DENIM</p><p>Your next pair could start with your old one.</p><Link href="/buyback" className="text-link">Explore Westos Buyback ↗</Link></div>
      </aside>
    </div>
  </div>;
}
