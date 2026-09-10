'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Order, OrderStatus } from '@/lib/types';
import { useAuth } from '@/components/providers';
import { formatAED } from '@/lib/format';

const STATUS_STYLE: Record<OrderStatus, string> = {
  PLACED: 'bg-slate-100 text-slate-700 border-slate-300',
  PAID: 'bg-green-50 text-green-700 border-green-300',
  PROCESSING: 'bg-amber-50 text-amber-700 border-amber-300',
  SHIPPED: 'bg-blue-50 text-blue-700 border-blue-300',
  DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  CANCELLED: 'bg-red-50 text-red-600 border-red-300',
};

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!user) return;
    api.getOrders().then((res) => setOrders(res.orders)).catch(() => undefined);
  }, [user]);

  if (!user) {
    return (
      <section className="py-16 text-center">
        <p className="text-muted mb-6">Sign in to see your orders.</p>
        <Link href="/login/" className="btn-flash btn-primary-flash">
          Login
        </Link>
      </section>
    );
  }

  return (
    <section className="py-10 md:py-16">
      <div className="mx-auto max-w-3xl px-4">
        <h1 className="text-2xl md:text-3xl font-extrabold text-brand mb-8">My Orders</h1>

        {!orders.length && (
          <div className="text-center py-12">
            <p className="text-muted mb-4">No orders yet. Place your first order from the cart.</p>
            <Link href="/books/" className="btn-flash btn-primary-flash">
              Browse Books
            </Link>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {orders.map((o, i) => {
            const status = (o.status || 'PLACED') as OrderStatus;
            const placed = o.placedAt ? new Date(o.placedAt) : null;
            return (
              <div key={o.id || i} className="bg-white border border-line rounded-2xl p-5 shadow-sm">
                <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
                  <div>
                    <p className="font-bold">Order #{o.reference || 1001 + i}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {placed
                        ? placed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                        : '—'}
                    </p>
                  </div>
                  <span className={`border text-xs font-bold px-2.5 py-1 rounded-lg ${STATUS_STYLE[status] || STATUS_STYLE.PLACED}`}>
                    {status}
                  </span>
                </div>

                <p className="text-sm text-ink mb-2">
                  {o.items.map((it) => `${it.name} × ${it.qty}`).join(', ')}
                </p>

                {['PLACED', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(status) && (
                  <div className="flex items-center gap-1 text-[10px] font-bold text-muted my-3 max-w-full overflow-x-auto">
                    {['PLACED', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].map((step, idx) => {
                      const reached = ['PLACED', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].indexOf(status) >= idx;
                      return (
                        <div key={step} className="flex items-center gap-1 shrink-0">
                          <span
                            className={`px-2 py-1 rounded-full border ${
                              reached ? 'bg-brand text-white border-brand' : 'bg-white text-muted border-line'
                            }`}
                          >
                            {step}
                          </span>
                          {idx < 4 && <span className={`h-px w-4 ${reached ? 'bg-brand' : 'bg-line'}`} />}
                        </div>
                      );
                    })}
                  </div>
                )}

                <p className="font-extrabold text-brand">{formatAED(o.total)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}