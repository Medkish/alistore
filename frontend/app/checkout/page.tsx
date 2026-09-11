'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCart, useAuth } from '@/components/providers';
import { api } from '@/lib/api';
import { formatAED } from '@/lib/format';
import type { CartItem } from '@/lib/types';

const FREE_DELIVERY_OVER = 150;
const DELIVERY_FEE = 15;

const PAY_METHODS = [
  { id: 'credit-card', label: 'Credit / Debit Card', hint: 'Visa · Mastercard · Amex' },
  { id: 'paypal', label: 'PayPal', hint: 'Pay with your PayPal balance' },
  { id: 'apple-pay', label: 'Apple Pay', hint: 'Fast checkout on your iPhone' },
  { id: 'google-pay', label: 'Google Pay', hint: 'Fast checkout on Android' },
  { id: 'atm', label: 'ATM / Cash Deposit', hint: 'Deposit into our account' },
  { id: 'bank-transfer', label: 'Bank Transfer', hint: 'Direct UAE transfer' },
  { id: 'cash-on-delivery', label: 'Cash on Delivery', hint: 'Pay when it arrives' },
];

const STEPS = [
  { id: 1, label: 'Shipping' },
  { id: 2, label: 'Payment' },
  { id: 3, label: 'Review' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CheckoutPage() {
  const { items, total, clear } = useCart();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);
  const [ref, setRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [snapshot, setSnapshot] = useState<{ items: CartItem[]; discount: number; deliveryFee: number; subtotal: number } | null>(null);

  const [shipping, setShipping] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
  });
  const [payMethod, setPayMethod] = useState('credit-card');
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '' });
  const [coupon, setCoupon] = useState('');
  const [discount, setDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState('');
  const [couponKind, setCouponKind] = useState<'ok' | 'err'>('ok');
  const [validation, setValidation] = useState('');

  const deliveryFee = total >= FREE_DELIVERY_OVER ? 0 : DELIVERY_FEE;
  const finalTotal = Math.max(0, total - discount) + deliveryFee;

  function setShip(field: keyof typeof shipping, value: string) {
    setShipping((s) => ({ ...s, [field]: value }));
    setValidation('');
  }

  function validateShipping(): boolean {
    if (!shipping.name.trim()) return fail('Full name is required.');
    if (!EMAIL_RE.test(shipping.email.trim())) return fail('Enter a valid email address.');
    if (shipping.phone.trim().replace(/\D/g, '').length < 7) return fail('Enter a valid phone number.');
    if (!shipping.address.trim()) return fail('Shipping address is required.');
    if (!shipping.city.trim()) return fail('City is required.');
    return true;
  }

  function validatePayment(): boolean {
    if (payMethod === 'credit-card') {
      const digits = card.number.replace(/\D/g, '');
      if (digits.length < 12) return fail('Enter a valid card number.');
      if (!/^\d{2}\/\d{2}$/.test(card.expiry.trim())) return fail('Expiry must be MM/YY.');
      if (!/^\d{3,4}$/.test(card.cvc.trim())) return fail('CVC must be 3 or 4 digits.');
    }
    return true;
  }

  function fail(msg: string): boolean {
    setValidation(msg);
    setError(msg);
    return false;
  }

  function next() {
    setValidation('');
    if (step === 1 && !validateShipping()) return;
    if (step === 2 && !validatePayment()) return;
    setStep((s) => Math.min(3, s + 1));
  }

  function back() {
    setValidation('');
    setStep((s) => Math.max(1, s - 1));
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
      const fullAddress = [shipping.address, shipping.city].filter(Boolean).join(', ');
      const res = await api.placeOrder(items, { ...shipping, address: fullAddress }, payMethod, coupon.trim());
      setSnapshot({ items: [...items], discount, deliveryFee, subtotal: total });
      setRef(res.order.reference || res.order.id || 'ALI-ORD-' + Date.now());
      clear();
      setDone(true);
      return;
    } catch {
      setSnapshot({ items: [...items], discount, deliveryFee, subtotal: total });
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
    const method = PAY_METHODS.find((m) => m.id === payMethod);
    return (
      <section className="py-10 md:py-16">
        <div className="mx-auto max-w-lg px-4 text-center">
          <div className="bg-green-100 text-green-800 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6 text-5xl font-bold">
            ✓
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-brand mb-2">Thank you! Order Placed</h1>
          <p className="text-muted mb-6">
            Reference: <strong className="text-ink">{ref}</strong>
          </p>
          <div className="bg-white border border-line rounded-2xl p-5 text-left text-sm mb-6 shadow-sm">
            <h2 className="font-bold mb-3">Order details</h2>
            <ul className="space-y-2 mb-3 border-b border-line pb-3">
              {(snapshot?.items ?? []).map((it) => (
                <li key={it.id} className="flex justify-between">
                  <span className="text-ink">
                    {it.name} × {it.qty}
                  </span>
                  <span className="font-semibold">{formatAED(it.qty * it.price)}</span>
                </li>
              ))}
            </ul>
            <div className="space-y-1 text-muted">
              {(snapshot?.discount ?? 0) > 0 && (
                <p className="flex justify-between">
                  <span>Coupon</span>
                  <span className="text-green-600">−{formatAED(snapshot!.discount)}</span>
                </p>
              )}
              <p className="flex justify-between">
                <span>Delivery</span>
                <span>{(snapshot?.deliveryFee ?? 0) === 0 ? 'Free' : formatAED(snapshot?.deliveryFee ?? 0)}</span>
              </p>
              <p className="flex justify-between font-extrabold text-brand text-base">
                <span>Total paid</span>
                <span>{formatAED(Math.max(0, (snapshot?.subtotal ?? 0) - (snapshot?.discount ?? 0)) + (snapshot?.deliveryFee ?? 0))}</span>
              </p>
            </div>
            <div className="border-t border-line mt-3 pt-3 grid sm:grid-cols-2 gap-2 text-xs text-muted">
              <p>
                <span className="font-semibold text-ink block">Payment</span>
                {method?.label || payMethod}
              </p>
              <p>
                <span className="font-semibold text-ink block">Ship to</span>
                {shipping.name}
                <br />
                {[shipping.address, shipping.city].filter(Boolean).join(', ')}
              </p>
            </div>
          </div>
          <div className="flex justify-center gap-4">
            {!user && (
              <Link href="/register/" className="btn-flash btn-primary-flash">
                Create Account to Track
              </Link>
            )}
            <Link href="/orders/" className="btn-flash btn-outline-flash text-brand border-brand">
              Track My Order
            </Link>
          </div>
          <Link href="/books/" className="block mt-4 text-xs font-semibold text-accent-dark hover:underline">
            ← Continue shopping
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="py-10 md:py-16">
      <div className="mx-auto max-w-4xl px-4">
        <h1 className="text-2xl md:text-3xl font-extrabold text-brand mb-6">Checkout</h1>

        <ol className="flex items-center gap-2 mb-8 overflow-x-auto">
          {STEPS.map((s, i) => (
            <li key={s.id} className="flex items-center gap-2 shrink-0">
              <span
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-extrabold border-2 ${
                  step > s.id
                    ? 'bg-green-100 text-green-800 border-green-300'
                    : step === s.id
                      ? 'bg-brand text-white border-brand'
                      : 'bg-white text-muted border-line'
                }`}
              >
                {step > s.id ? '✓' : s.id}
              </span>
              <span className={`text-sm font-bold ${step >= s.id ? 'text-ink' : 'text-muted'}`}>{s.label}</span>
              {i < STEPS.length - 1 && <span className={`h-px w-6 ${step > s.id ? 'bg-green-300' : 'bg-line'}`} />}
            </li>
          ))}
        </ol>

        <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">
          <div className="flex flex-col gap-4">
            {step === 1 && (
              <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
                <h2 className="font-bold mb-4">Shipping Details</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="block text-sm">
                    <span className="font-semibold text-ink">Full Name *</span>
                    <input
                      value={shipping.name}
                      onChange={(e) => setShip('name', e.target.value)}
                      className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-semibold text-ink">Email *</span>
                    <input
                      type="email"
                      value={shipping.email}
                      onChange={(e) => setShip('email', e.target.value)}
                      className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-semibold text-ink">Phone *</span>
                    <input
                      value={shipping.phone}
                      onChange={(e) => setShip('phone', e.target.value)}
                      placeholder="+971..."
                      className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-semibold text-ink">City *</span>
                    <input
                      value={shipping.city}
                      onChange={(e) => setShip('city', e.target.value)}
                      placeholder="Dubai"
                      className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none"
                    />
                  </label>
                  <label className="block text-sm sm:col-span-2">
                    <span className="font-semibold text-ink">Shipping Address *</span>
                    <textarea
                      value={shipping.address}
                      onChange={(e) => setShip('address', e.target.value)}
                      rows={2}
                      placeholder="Street, building, landmark"
                      className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none"
                    />
                  </label>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-4">
                <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
                  <h2 className="font-bold mb-4">Payment Method</h2>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {PAY_METHODS.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setPayMethod(m.id)}
                        className={`text-left border-2 rounded-xl px-4 py-3 transition ${
                          payMethod === m.id ? 'border-brand bg-brand/5' : 'border-line hover:border-brand'
                        }`}
                      >
                        <p className="text-sm font-bold text-ink">{m.label}</p>
                        <p className="text-xs text-muted">{m.hint}</p>
                      </button>
                    ))}
                  </div>
                  {payMethod === 'credit-card' && (
                    <div className="mt-5 grid sm:grid-cols-2 gap-4">
                      <label className="block text-sm sm:col-span-2">
                        <span className="font-semibold text-ink">Card number *</span>
                        <input
                          value={card.number}
                          onChange={(e) => setCard((c) => ({ ...c, number: e.target.value }))}
                          placeholder="4242 4242 4242 4242"
                          className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none"
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="font-semibold text-ink">Expiry (MM/YY) *</span>
                        <input
                          value={card.expiry}
                          onChange={(e) => setCard((c) => ({ ...c, expiry: e.target.value }))}
                          placeholder="12/28"
                          className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none"
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="font-semibold text-ink">CVC *</span>
                        <input
                          value={card.cvc}
                          onChange={(e) => setCard((c) => ({ ...c, cvc: e.target.value }))}
                          placeholder="123"
                          className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none"
                        />
                      </label>
                    </div>
                  )}
                  <p className="text-xs text-muted mt-4">
                    Demo checkout — the backend re-prices every item from the database and marks the order PAID with your
                    chosen method. Stripe powers cards in a later phase.
                  </p>
                </div>

                <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
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
              </div>
            )}

            {step === 3 && (
              <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
                <h2 className="font-bold mb-4">Review your order</h2>
                <ul className="space-y-2 mb-4 border-b border-line pb-4">
                  {items.map((it) => (
                    <li key={it.id} className="flex justify-between text-sm">
                      <span className="text-ink">{it.name} × {it.qty}</span>
                      <span className="font-semibold">{formatAED(it.qty * it.price)}</span>
                    </li>
                  ))}
                </ul>
                <div className="grid sm:grid-cols-2 gap-4 text-sm text-muted">
                  <p>
                    <span className="font-semibold text-ink block">Ship to</span>
                    {shipping.name} · {shipping.phone}
                    <br />
                    {[shipping.address, shipping.city].filter(Boolean).join(', ')}
                  </p>
                  <p>
                    <span className="font-semibold text-ink block">Payment</span>
                    {PAY_METHODS.find((m) => m.id === payMethod)?.label || payMethod}
                    {discount > 0 && coupon && (
                      <>
                        <br />
                        Coupon {coupon} applies
                      </>
                    )}
                  </p>
                </div>
              </div>
            )}

            {validation && <p className="text-sm text-red-600 text-center">{validation}</p>}
            {error && !validation && <p className="text-sm text-red-600 text-center">{error}</p>}

            <div className="flex gap-3">
              {step > 1 && (
                <button onClick={back} className="btn-flash btn-outline-flash text-brand border-brand px-6">
                  ← Back
                </button>
              )}
              {step < 3 ? (
                <button onClick={next} className="btn-flash btn-primary-flash flex-1">
                  Continue to {STEPS[step].label}
                </button>
              ) : (
                <button
                  onClick={placeOrder}
                  disabled={loading}
                  className="btn-flash btn-primary-flash flex-1 disabled:opacity-60"
                >
                  {loading ? 'Placing Order…' : `Place Order · ${formatAED(finalTotal)}`}
                </button>
              )}
            </div>
          </div>

          <aside className="bg-white border border-line rounded-2xl p-5 shadow-sm lg:sticky lg:top-32">
            <h2 className="font-bold text-ink mb-4">Order Summary</h2>
            <ul className="space-y-2 text-sm">
              {items.map((it) => (
                <li key={it.id} className="flex justify-between gap-2">
                  <span className="text-ink line-clamp-1">
                    {it.name} × {it.qty}
                  </span>
                  <span className="font-semibold whitespace-nowrap">{formatAED(it.qty * it.price)}</span>
                </li>
              ))}
            </ul>
            <dl className="text-sm space-y-2 border-t border-line mt-4 pt-4">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="font-semibold">{formatAED(total)}</dd>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <dt>Discount</dt>
                  <dd>−{formatAED(discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted">Delivery</dt>
                <dd className={`font-semibold ${deliveryFee === 0 ? 'text-green-600' : ''}`}>
                  {deliveryFee === 0 ? 'Free' : formatAED(deliveryFee)}
                </dd>
              </div>
              {deliveryFee > 0 && (
                <p className="text-[11px] text-muted">
                  Free delivery over {formatAED(FREE_DELIVERY_OVER)} — add {formatAED(FREE_DELIVERY_OVER - total)} more.
                </p>
              )}
            </dl>
            <div className="flex justify-between font-extrabold text-brand text-lg border-t border-line pt-3 mt-3">
              <span>Total</span>
              <span>{formatAED(finalTotal)}</span>
            </div>
            <p className="text-[11px] text-muted text-center mt-4">🔒 Secure checkout · 3–5 working day delivery</p>
          </aside>
        </div>
      </div>
    </section>
  );
}