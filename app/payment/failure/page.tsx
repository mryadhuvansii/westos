import type { Metadata } from 'next';
import Link from 'next/link';
export const metadata: Metadata = { title: 'Payment Failed' };
export default function PaymentFailure({searchParams}:{searchParams:{orderId?:string;error?:string}}) {
  return <section className="container secondary-empty"><div className="payment-result failure"><div className="result-icon">✕</div><h1>Payment Failed</h1><p>We couldn’t complete your payment. Please try again or choose a different payment method.</p>{searchParams.orderId && <p><strong>Order #:</strong> {searchParams.orderId}</p>}{searchParams.error && <p className="muted">{searchParams.error}</p>}<Link href="/cart/" className="button">Back to Bag</Link><Link href="/checkout/" className="button secondary">Try Again</Link></div></section>;
}