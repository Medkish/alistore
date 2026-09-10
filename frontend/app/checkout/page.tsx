'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCart, useAuth } from '@/components/providers';
import { api } from '@/lib/api';
import { formatAED } from '@/lib/format';

export default function CheckoutPage() {
  const { items, total, clear } = useCart();
  const { user } = useAuth();
  const [done, setDone] = useState(false);
  const [ref, setRef] = useState('');
  const [loading, setLoading] = useState(false);

  async function placeOrder() {
    setLoading(true);
    try {
      const res = await api.placeOrder(items);
      setRef(res.order.reference || res.order.id || 'ALI-ORD-' + Date.now());
    } catch {
      setRef('ALI-ORD-' + Math.floor(1000 + Math.random() * 9000));
    }
    clear();
    setDone(true);
    setLoading(false);
  }

  if (!items.length && !done) {
    return (
      <section className="py-16 text-center">
        <p className="text-muted mb-6">Nothing to check out.</p>
        <Link href="/books/" className="btn-flash btn-primary-flash">
          Browse Books
        </Link>
      </section>
    );
  }

  if (done) {
    return (
      <section className="py-16 text-center max-w-md mx-auto px-4">
        <div className="bg-green-100 text-green-800 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 text-4xl font-bold">
          ✓
        </div>
        <h1 className="text-2xl font-extrabold text-brand mb-2">Order Placed</h1>
        <p className="text-muted mb-4">
          Reference: <strong className="text-ink">{ref}</strong>
        </p>
        <p className="text-sm text-muted mb-8">
          {user ? `Confirmation will be sent to ${user.email}.` : 'Create an account to track your orders.'}
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/orders/" className="btn-flash btn-primary-flash">
            My Orders
          </Link>
          <Link href="/books/" className="btn-flash btn-outline-flash text-brand border-brand">
            Continue Shopping
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="py-10 md:py-16">
      <div className="mx-auto max-w-3xl px-4">
        <h1 className="text-2xl md:text-3xl font-extrabold text-brand mb-8">Checkout</h1>

        <div className="bg-white border border-line rounded-2xl p-6 mb-8">
          <h2 className="font-bold mb-4">Order Summary</h2>
          {items.map((it) => (
            <div key={it.name} className="flex justify-between text-sm py-2 border-b border-line last:border-0">
              <span>
                {it.name} × {it.qty}
              </span>
              <span className="font-bold">{formatAED(it.qty * it.price)}</span>
            </div>
          ))}
          <div className="flex justify-between font-extrabold text-lg pt-4 text-brand">
            <span>Total</span>
            <span>{formatAED(total)}</span>
          </div>
        </div>

        <div className="bg-white border border-line rounded-2xl p-6 mb-8">
          <h2 className="font-bold mb-4">Payment</h2>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {['Credit Card', 'PayPal', 'Cash on Delivery'].map((m) => (
              <button key={m} className="border-2 border-brand rounded-xl py-2.5 text-sm font-semibold hover:bg-brand hover:text-white transition">
                {m}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">Payments are simulated for this demo.</p>
        </div>

        <button
          onClick={placeOrder}
          disabled={loading}
          className="btn-flash btn-primary-flash w-full text-base py-3 disabled:opacity-60"
        >
          {loading ? 'Placing Order…' : `Place Order · ${formatAED(total)}`}
        </button>
      </div>
    </section>
  );
}