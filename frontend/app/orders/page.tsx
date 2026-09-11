'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Order, OrderStatus } from '@/lib/types';
import { useAuth } from '@/components/providers';
import { formatAED } from '@/lib/format';

const ORDER_STEPS: OrderStatus[] = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED'];

const STEP_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Order Placed',
  PAID: 'Payment Confirmed',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

const STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING: 'bg-slate-100 text-slate-700 border-slate-300',
  PAID: 'bg-green-50 text-green-700 border-green-300',
  SHIPPED: 'bg-blue-50 text-blue-700 border-blue-300',
  DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  CANCELLED: 'bg-red-50 text-red-600 border-red-300',
};

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user) return;
    api
      .getOrders()
      .then((res) => {
        setOrders(res.orders);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [user]);

  if (!user) {
    return (
      <section className="py-16 text-center">
        <div className="mx-auto max-w-md px-4">
          <p className="text-4xl mb-3">📦</p>
          <h1 className="text-2xl font-extrabold text-brand mb-2">Track your orders</h1>
          <p className="text-muted mb-6">Sign in to see your order history, live status and delivery timeline.</p>
          <Link href="/login/" className="btn-flash btn-primary-flash">
            Login
          </Link>
        </div>
      </section>
    );
  }

  const toggle = (id: string) => setOpen((o) => ({ ...o, [id]: !o[id] }));

  return (
    <section className="py-10 md:py-16">
      <div className="mx-auto max-w-3xl px-4">
        <h1 className="text-2xl md:text-3xl font-extrabold text-brand mb-8">My Orders</h1>

        {loaded && !orders.length && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🛍️</p>
            <p className="text-muted mb-4">No orders yet. Place your first order from the cart.</p>
            <Link href="/books/" className="btn-flash btn-primary-flash">
              Browse Books
            </Link>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {orders.map((o, i) => {
            const status = (o.status || 'PENDING') as OrderStatus;
            const cancelled = status === 'CANCELLED';
            const reached = ORDER_STEPS.indexOf(status);
            const key = o.id || String(i);
            const isOpen = !!open[key];
            const placed = o.placedAt ? new Date(o.placedAt) : null;
            const subtotal = o.items.reduce((s, it) => s + it.price * it.qty, 0);
            const discount = o.discountAmount || 0;

            return (
              <div key={key} className="bg-white border border-line rounded-2xl shadow-sm overflow-hidden">
                <button
                  onClick={() => toggle(key)}
                  className="w-full text-left px-5 py-4 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50 transition"
                >
                  <div>
                    <p className="font-bold text-ink">MY ORDER #{o.reference || 1001 + i}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {placed
                        ? placed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                        : '—'}
                      <span className="mx-2 text-line">|</span>
                      {o.items.reduce((s, it) => s + it.qty, 0)} item{o.items.reduce((s, it) => s + it.qty, 0) === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`border text-xs font-bold px-2.5 py-1 rounded-lg ${
                        STATUS_STYLE[status] || STATUS_STYLE.PENDING
                      }`}
                    >
                      {status}
                    </span>
                    <span className="text-line">{isOpen ? '▲' : '▼'}</span>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 border-t border-line">
                    <ul className="my-4 space-y-2">
                      {o.items.map((it, idx) => (
                        <li key={idx} className="flex justify-between text-sm">
                          <span className="text-ink">{it.name} × {it.qty}</span>
                          <span className="font-semibold text-ink">{formatAED(it.price * it.qty)}</span>
                        </li>
                      ))}
                      <li className="flex justify-between text-sm text-muted pt-2 border-t border-dashed border-line">
                        <span>Subtotal</span>
                        <span>{formatAED(subtotal)}</span>
                      </li>
                      {discount > 0 && (
                        <li className="flex justify-between text-sm text-green-600">
                          <span>{o.couponCode ? `Discount (${o.couponCode})` : 'Discount'}</span>
                          <span>−{formatAED(discount)}</span>
                        </li>
                      )}
                      <li className="flex justify-between font-extrabold text-brand pt-1">
                        <span>Total</span>
                        <span>{formatAED(o.total)}</span>
                      </li>
                    </ul>

                    {o.paymentProvider && (
                      <p className="text-xs text-muted mb-3">
                        Payment: <span className="font-semibold text-ink">{o.paymentProvider}</span>
                        {o.paidAt ? ` · paid ${new Date(o.paidAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}` : ''}
                      </p>
                    )}

                    {!cancelled && (
                      <div className="flex items-center gap-1 my-3 overflow-x-auto py-1">
                        {ORDER_STEPS.map((step, idx) => {
                          const done = reached > idx;
                          const current = reached === idx;
                          const icon = done ? '✓' : current ? '●' : '○';
                          return (
                            <div key={step} className="flex items-center gap-1 shrink-0">
                              <span
                                className={`px-2 py-1 rounded-full border text-[10px] font-bold whitespace-nowrap ${
                                  done
                                    ? 'bg-green-600 text-white border-green-600'
                                    : current
                                      ? 'bg-brand text-white border-brand'
                                      : 'bg-white text-muted border-line'
                                }`}
                              >
                                {icon} {STEP_LABELS[step]}
                              </span>
                              {idx < ORDER_STEPS.length - 1 && (
                                <span className={`h-px w-4 ${reached > idx ? 'bg-green-600' : 'bg-line'}`} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {o.contact && (
                      <div className="text-xs text-muted mt-3">
                        Ship to {o.contact.name} · {o.contact.address} · {o.contact.phone}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}