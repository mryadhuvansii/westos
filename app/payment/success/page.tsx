import type { Metadata } from 'next';
import Link from 'next/link';
export const metadata: Metadata = { title: 'Payment Successful' };
export default function PaymentSuccess({searchParams}:{searchParams:{orderId?:string}}) {
  return <section className="container secondary-empty"><div className="payment-result success"><div className="result-icon">✓</div><h1>Payment Successful</h1><p>Your order has been placed and payment confirmed.</p>{searchParams.orderId && <p><strong>Order #:</strong> {searchParams.orderId}</p>}<p>You’ll receive a confirmation email shortly. Track your order in the account section.</p><Link href="/account/" className="button">Go to My Account</Link><Link href="/" className="button secondary">Continue Shopping</Link></div></section>;
}