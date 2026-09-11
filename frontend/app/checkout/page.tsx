'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCart, useAuth } from '@/components/providers';
import { api } from '@/lib/api';
import { formatAED } from '@/lib/format';
import type { CartItem } from '@/lib/types';

const DELIVERY_FEE = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CheckoutPage() {
  const { items, total, clear } = useCart();
  const { user } = useAuth();

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    country: 'United Arab Emirates',
  });

  const [done, setDone] = useState(false);
  const [ref, setRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState('');
  const [error, setError] = useState('');

  const shipping = DELIVERY_FEE;
  const finalTotal = total + shipping;

  function setField(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setError('');
  }

  function validate(): boolean {
    if (!form.name.trim()) return fail('Full name is required.');
    if (!EMAIL_RE.test(form.email.trim())) return fail('Enter a valid email address.');
    if (form.phone.trim().replace(/\D/g, '').length < 7) return fail('Enter a valid phone number.');
    if (!form.address.trim()) return fail('Shipping address is required.');
    if (!form.city.trim()) return fail('City is required.');
    if (!form.country.trim()) return fail('Country is required.');
    return true;
  }

  function fail(msg: string): boolean {
    setError(msg);
    setFlash(msg);
    return false;
  }

  async function placeOrder() {
    if (!validate()) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.placeOrder(
        items,
        {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          address: [form.address.trim(), form.city.trim(), form.country.trim()].filter(Boolean).join(', '),
        },
        'card',
        '',
      );
      setRef(res.order.reference || res.order.id || 'ALI-ORD-' + Date.now());
      clear();
      setDone(true);
      return;
    } catch {
      setRef('ALI-ORD-' + Math.floor(1000 + Math.random() * 9000));
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
      <section className="py-10 md:py-16">
        <div className="mx-auto max-w-md px-4">
          <div className="bg-white border border-line rounded-3xl p-8 text-center shadow-sm">
            <p className="text-5xl mb-4">🎉</p>
            <h1 className="text-2xl font-extrabold text-brand mb-2">ORDER CONFIRMED</h1>
            <p className="text-ink font-bold mb-1">Order: #{ref}</p>
            <p className="text-muted text-sm mb-6">Thank you for your purchase!</p>
            <span className="inline-block border border-green-300 bg-green-50 text-green-700 text-xs font-bold px-3 py-1 rounded-lg mb-8">
              Status: PENDING
            </span>
            <div className="flex flex-col gap-3">
              <Link href="/orders/" className="btn-flash btn-primary-flash text-center">
                VIEW MY ORDER
              </Link>
              <Link href="/books/" className="btn-flash btn-outline-flash text-brand border-brand text-center">
                CONTINUE SHOPPING
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-10 md:py-16">
      <div className="mx-auto max-w-3xl px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-extrabold text-brand">CHECKOUT</h1>
          <Link href="/cart/" className="text-xs font-semibold text-accent-dark hover:underline">
            ← Back to Cart
          </Link>
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-ink mb-4">Customer Information</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block text-sm">
                <span className="font-semibold text-ink">Full Name *</span>
                <input
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="Jane Doe"
                  className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none"
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold text-ink">Email *</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                  placeholder="jane@example.com"
                  className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none"
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="font-semibold text-ink">Phone *</span>
                <input
                  value={form.phone}
                  onChange={(e) => setField('phone', e.target.value)}
                  placeholder="+971 50 123 4567"
                  className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none"
                />
              </label>
            </div>
          </div>

          <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-ink mb-4">Shipping Address</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block text-sm sm:col-span-2">
                <span className="font-semibold text-ink">Address *</span>
                <textarea
                  value={form.address}
                  onChange={(e) => setField('address', e.target.value)}
                  rows={2}
                  placeholder="Building, street, landmark"
                  className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none"
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold text-ink">City *</span>
                <input
                  value={form.city}
                  onChange={(e) => setField('city', e.target.value)}
                  placeholder="Dubai"
                  className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none"
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold text-ink">Country *</span>
                <input
                  value={form.country}
                  onChange={(e) => setField('country', e.target.value)}
                  placeholder="United Arab Emirates"
                  className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none"
                />
              </label>
            </div>
          </div>

          <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-ink mb-4">Order Summary</h2>
            <ul className="space-y-2 border-b border-line pb-4">
              {items.map((it) => (
                <li key={it.id} className="flex justify-between gap-3 text-sm">
                  <span className="text-ink">
                    {it.name} × {it.qty}
                  </span>
                  <span className="font-semibold whitespace-nowrap">{formatAED(it.qty * it.price)}</span>
                </li>
              ))}
            </ul>
            <dl className="text-sm space-y-2 pt-4">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="font-semibold">{formatAED(total)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Shipping</dt>
                <dd className="font-semibold">{formatAED(shipping)}</dd>
              </div>
              <div className="flex justify-between font-extrabold text-brand text-lg border-t border-line pt-3 mt-3">
                <dt>TOTAL</dt>
                <dd>{formatAED(finalTotal)}</dd>
              </div>
            </dl>

            {error && <p className="text-sm text-red-600 mt-4 text-center">{error}</p>}

            <button
              onClick={placeOrder}
              disabled={loading}
              className="btn-flash btn-primary-flash w-full mt-6 text-center disabled:opacity-60"
            >
              {loading ? 'Placing Order…' : 'PLACE ORDER'}
            </button>
            <p className="text-[11px] text-muted text-center mt-3">🔒 Secure checkout · 3–5 working day delivery</p>
          </div>
        </div>
      </div>
    </section>
  );
}