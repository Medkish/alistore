'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { formatAED } from '@/lib/format';
import { TRACK_LABELS, type Order } from '@/lib/types';

const TIMELINE = ['PENDING', 'PAID', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export default function TrackPage() {
  const [reference, setReference] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function lookup() {
    setError('');
    setOrder(null);
    if (!reference.trim()) {
      setError('Enter your order reference, e.g. OR-4821.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.trackOrder(reference.trim());
      setOrder(res.order);
    } catch (e) {
      setError('No order found with that reference. Check the number and try again.');
    }
    setLoading(false);
  }

  const events = order?.trackingEvents || [];
  const currentIdx = order ? TIMELINE.indexOf(order.status || '') : -1;
  const isCancelled = order?.status === 'CANCELLED';

  return (
    <section className="py-10 md:py-14">
      <div className="mx-auto max-w-2xl px-4">
        <h1 className="text-2xl md:text-3xl font-extrabold text-brand mb-2">Track Your Order</h1>
        <p className="text-sm text-muted mb-6">
          Enter your order reference (found in your confirmation email) to see delivery updates in real time.
        </p>

        <div className="flex gap-2 mb-6">
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && lookup()}
            placeholder="Order reference e.g. OR-4821"
            className="flex-1 border-2 border-line rounded-xl px-4 py-2.5 text-sm focus:border-brand focus:outline-none"
          />
          <button
            onClick={lookup}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-brand text-accent text-sm font-bold hover:bg-accent-dark hover:text-white transition disabled:opacity-60"
          >
            {loading ? 'Tracking…' : 'Track Order'}
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4 mb-6">{error}</p>
        )}

        {order && (
          <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-4">
              <div>
                <p className="font-extrabold text-brand">Order {order.reference}</p>
                <p className="text-xs text-muted">
                  Placed {order.placedAt ? new Date(order.placedAt).toLocaleString() : '—'}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                    isCancelled
                      ? 'bg-red-50 text-red-600 border-red-300'
                      : order.status === 'DELIVERED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-amber-50 text-amber-700 border-amber-300'
                  }`}
                >
                  {TRACK_LABELS[order.status || 'PENDING'] || order.status}
                </p>
                <p className="text-lg font-extrabold text-ink mt-1">{formatAED(order.total)}</p>
              </div>
            </div>

            {!isCancelled && events.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-bold text-muted uppercase tracking-wide mb-3">Delivery Timeline</p>
                <div className="flex flex-col gap-3">
                  {events.map((t, i) => {
                    const step = TIMELINE.indexOf(t.status);
                    const isLast = i === events.length - 1;
                    const reached = step <= currentIdx || step <= 0;
                    const isCurrent = step === currentIdx;
                    return (
                      <div key={t.id || i} className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <span
                            className={`w-3 h-3 rounded-full border-2 mt-1 ${
                              isCurrent
                                ? 'bg-accent border-accent-dark'
                                : reached
                                  ? 'bg-green-500 border-green-600'
                                  : 'bg-white border-slate-300'
                            }`}
                          />
                          {!isLast && <span className="w-0.5 flex-1 bg-line min-h-[18px]" />}
                        </div>
                        <div className="pb-4">
                          <p className={`font-semibold ${isCurrent ? 'text-accent-dark' : reached ? 'text-ink' : 'text-slate-400'}`}>
                            {t.label}
                          </p>
                          {t.note && <p className="text-xs text-muted">{t.note}</p>}
                          <p className="text-xs text-muted">{new Date(t.at).toLocaleString()}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {order.trackingNumber && (
              <div className="mt-5 bg-slate-50 rounded-xl p-3 text-sm">
                <p className="text-xs text-muted uppercase font-bold tracking-wide mb-1">Carrier Tracking</p>
                <p className="font-bold text-ink">{order.trackingNumber}</p>
                <p className="text-xs text-muted">
                  {order.trackingProvider || 'Shipping provider'}
                  {order.estimatedDelivery ? ` · Estimated delivery ${new Date(order.estimatedDelivery).toLocaleDateString()}` : ''}
                </p>
              </div>
            )}

            <div className="mt-5">
              <p className="text-xs font-bold text-muted uppercase tracking-wide mb-2">Order Summary</p>
              <ul className="space-y-1.5 text-sm">
                {order.items.map((it, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span className="text-ink">{it.name || it.id} × {it.qty}</span>
                    <span className="font-semibold">{formatAED((it.qty || 0) * (it.price || 0))}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 text-sm space-y-1 border-t border-line pt-2">
                <p className="flex justify-between text-muted"><span>Subtotal</span><span>{formatAED(order.subtotal != null ? order.subtotal : order.total)}</span></p>
                <p className="flex justify-between text-muted"><span>Shipping</span><span>{order.shippingCost ? formatAED(order.shippingCost) : 'Free'}</span></p>
                <p className="flex justify-between text-muted"><span>Tax</span><span>{formatAED(order.tax || 0)}</span></p>
                <p className="flex justify-between font-extrabold text-brand"><span>Total</span><span>{formatAED(order.total)}</span></p>
              </div>
            </div>

            <p className="text-xs text-muted mt-5 italic">
              ⚠️ Never share your order reference or payment details with anyone.
            </p>
          </div>
        )}

        {!order && !error && (
          <div className="bg-white border border-line rounded-2xl p-6 shadow-sm text-sm text-muted">
            📦 Acknowledgement emails include a reference like <b>OR-0000</b>. Tracking steps (Order Placed → Delivered) update
            automatically as your order progresses.
          </div>
        )}
      </div>
    </section>
  );
}