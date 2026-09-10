'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Order } from '@/lib/types';
import { useAuth } from '@/components/providers';
import { formatAED } from '@/lib/format';

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
          {orders.map((o, i) => (
            <div key={o.id || i} className="bg-white border border-line rounded-2xl p-5 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-bold">Order #{o.reference || 1001 + i}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {o.placedAt ? new Date(o.placedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                  </p>
                </div>
                <span className="bg-green-50 text-green-700 border border-green-200 text-xs font-bold px-2.5 py-1 rounded-lg">
                  {o.status || 'Delivered'}
                </span>
              </div>
              <p className="text-sm text-ink mb-1">
                {o.items.map((it) => `${it.name} × ${it.qty}`).join(', ')}
              </p>
              <p className="font-extrabold text-brand">{formatAED(o.total)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}