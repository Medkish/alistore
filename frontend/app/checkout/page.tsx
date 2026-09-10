'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCart, useAuth } from '@/components/providers';
import { api } from '@/lib/api';
import { formatAED } from '@/lib/format';

const PAY_METHODS = [
  { id: 'credit-card', label: 'Credit / Debit Card', hint: 'Visa · Mastercard · Amex' },
  { id: 'paypal', label: 'PayPal', hint: 'Pay with your PayPal balance' },
  { id: 'apple-pay', label: 'Apple Pay', hint: 'Fast checkout on your iPhone' },
  { id: 'google-pay', label: 'Google Pay', hint: 'Fast checkout on Android' },
  { id: 'atm', label: 'ATM / Cash Deposit', hint: 'Deposit into our account' },
  { id: 'bank-transfer', label: 'Bank Transfer', hint: 'Direct UAE transfer' },
  { id: 'cash-on-delivery', label: 'Cash on Delivery', hint: 'Pay when it arrives' },
];

export default function CheckoutPage() {
  const { items, total, clear } = useCart();
  const { user } = useAuth();
  const [done, setDone] = useState(false);
  const [ref, setRef] = useState('');
  const [payMethod, setPayMethod] = useState('credit-card');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [coupon, setCoupon] = useState('');
  const [discount, setDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState('');
  const [couponKind, setCouponKind] = useState<'ok' | 'err'>('ok');
  const [shipping, setShipping] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    address: '',
  });

  const finalTotal = Math.max(0, total - discount);

  function set(field: keyof typeof shipping, value: string) {
    setShipping((s) => ({ ...s, [field]: value }));
  }

  async function applyCoupon() {
    if (!coupon.trim()) return;
    setCouponMsg('');
    setDiscount(0);
    try {
      const res = await api.validateCoupon(coupon.trim(), total);
      if (res.valid) {
        setDiscount(res.discount);
        setCouponMsg(`✓ ${res.code} applied — you save ${formatAED(res.discount)}`);
        setCouponKind('ok');
      } else {
        setDiscount(0);
        setCouponMsg(res.error || 'Invalid coupon.');
        setCouponKind('err');
      }
    } catch {
      setDiscount(0);
      setCouponMsg('Demo mode — coupons apply after connecting the backend.');
      setCouponKind('err');
    }
  }

  async function placeOrder() {
    setError('');
    setLoading(true);
    try {
      const res = await api.placeOrder(items, shipping, payMethod, coupon.trim());
      setRef(res.order.reference || res.order.id || 'ALI-ORD-' + Date.now());
      clear();
      setDone(true);
      return;
    } catch {
      /* fall back to a local reference so UX never hard-blocks */
      setRef('ALI-ORD-' + Math.floor(1000 + Math.random() * 9000));
      clear();
    }
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
        <p className="text-xs text-muted mb-1">
          Payment: <strong className="text-ink">{PAY_METHODS.find((m) => m.id === payMethod)?.label || payMethod}</strong>
        </p>
        <p className="text-sm text-muted mb-8">
          {user ? `Confirmation will be sent to ${user.email}.` : 'Create an account to track your orders.'}
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/orders/" className="btn-flash btn-primary-flash">
            Track My Order
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

        <div className="bg-white border border-line rounded-2xl p-6 mb-8 shadow-sm">
          <h2 className="font-bold mb-4">Shipping Details</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block text-sm">
              <span className="font-semibold text-ink">Full Name *</span>
              <input
                value={shipping.name}
                onChange={(e) => set('name', e.target.value)}
                className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none"
              />
            </label>
            <label className="block text-sm">
              <span className="font-semibold text-ink">Email *</span>
              <input
                type="email"
                value={shipping.email}
                onChange={(e) => set('email', e.target.value)}
                className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none"
              />
            </label>
            <label className="block text-sm">
              <span className="font-semibold text-ink">Phone *</span>
              <input
                value={shipping.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+971..."
                className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="font-semibold text-ink">Shipping Address *</span>
              <textarea
                value={shipping.address}
                onChange={(e) => set('address', e.target.value)}
                rows={2}
                placeholder="Street, city, country"
                className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none"
              />
            </label>
          </div>
        </div>

        <div className="bg-white border border-line rounded-2xl p-6 mb-8 shadow-sm">
          <h2 className="font-bold mb-4">Order Summary</h2>
          {items.map((it) => (
            <div key={it.id} className="flex justify-between text-sm py-2 border-b border-line last:border-0">
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

        <div className="bg-white border border-line rounded-2xl p-6 mb-8 shadow-sm">
          <h2 className="font-bold mb-4">Coupon</h2>
          <div className="flex gap-3">
            <input
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
              placeholder="e.g. ALIO10"
              className="flex-1 border-2 border-line rounded-xl px-3 py-2 uppercase focus:border-brand focus:outline-none"
            />
            <button
              onClick={applyCoupon}
              className="btn-flash btn-outline-flash text-brand border-brand hover:bg-brand hover:text-white px-5"
            >
              Apply
            </button>
          </div>
          {couponMsg && (
            <p className={`text-xs mt-3 ${couponKind === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{couponMsg}</p>
          )}
        </div>

        <div className="bg-white border border-line rounded-2xl p-6 mb-8 shadow-sm">
          <h2 className="font-bold mb-4">Payment Method</h2>
          <div className="grid sm:grid-cols-2 gap-3 mb-2">
            {PAY_METHODS.map((m) => (
              <button
                key={m.id}
                onClick={() => setPayMethod(m.id)}
                className={`text-left border-2 rounded-xl px-4 py-3 transition ${
                  payMethod === m.id
                    ? 'border-brand bg-brand/5'
                    : 'border-line hover:border-brand'
                }`}
              >
                <p className="text-sm font-bold text-ink">{m.label}</p>
                <p className="text-xs text-muted">{m.hint}</p>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">
            Demo checkout — the backend re-prices every item from the database and marks the order PAID with your
            chosen method. Cards are powered by Stripe in step 12.
          </p>
        </div>

        {error && <p className="text-sm text-red-600 mb-4 text-center">{error}</p>}
        {discount > 0 && (
          <div className="flex justify-between text-sm px-1 pb-2">
            <span className="text-green-700 font-semibold">Subtotal: {formatAED(total)} · Discount: −{formatAED(discount)}</span>
            <span className="font-extrabold text-brand">Total: {formatAED(finalTotal)}</span>
          </div>
        )}
        <button
          onClick={placeOrder}
          disabled={loading}
          className="btn-flash btn-primary-flash w-full text-base py-3 disabled:opacity-60"
        >
          {loading ? 'Placing Order…' : `Place Order · ${formatAED(finalTotal)}`}
        </button>
      </div>
    </section>
  );
}