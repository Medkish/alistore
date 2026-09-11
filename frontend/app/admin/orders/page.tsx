'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/providers';
import { formatAED, formatNumber } from '@/lib/format';
import {
  ORDER_STATUSES,
  ORDER_TRANSITIONS,
  type Order,
  type OrderStatus,
} from '@/lib/types';

const PAGE_SIZE = 15;

const STATUS_COLOR: Record<string, string> = {
  PENDING:  'bg-slate-100 text-slate-700 border-slate-300',
  PAID:     'bg-green-50 text-green-700 border-green-300',
  SHIPPED:  'bg-blue-50 text-blue-700 border-blue-300',
  DELIVERED:'bg-emerald-50 text-emerald-700 border-emerald-300',
  CANCELLED:'bg-red-50 text-red-600 border-red-300',
};

const ACTION_LABEL: Record<string, string> = {
  PAID:     'Mark Paid',
  SHIPPED:  'Mark Shipped',
  DELIVERED:'Mark Delivered',
  CANCELLED:'Cancel',
};

const ACTION_STYLE: Record<string, string> = {
  PAID:     'bg-green-600 hover:bg-green-700',
  SHIPPED:  'bg-blue-600 hover:bg-blue-700',
  DELIVERED:'bg-emerald-600 hover:bg-emerald-700',
  CANCELLED:'bg-red-600 hover:bg-red-700',
};

export default function AdminOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [openId, setOpenId] = useState('');

  const load = useCallback(() => {
    api
      .adminOrders({ status, search, page, pageSize: PAGE_SIZE })
      .then((res) => {
        setOrders(res.orders);
        setTotalPages(res.totalPages);
        setTotal(res.total);
      })
      .catch((e) => setError((e as Error).message));
  }, [status, search, page]);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of ORDER_STATUSES) map[s] = 0;
    for (const o of orders || []) {
      if (map[o.status!] !== undefined) map[o.status!]++;
    }
    return map;
  }, [orders]);

  if (!user || user.role !== 'ADMIN') {
    return (
      <section className="py-16 text-center">
        <p className="text-muted">Access denied.</p>
        <Link href="/login/" className="btn-flash btn-primary-flash mt-4 inline-block">Login as Admin</Link>
      </section>
    );
  }

  function applyFilter(nextStatus: string) {
    setStatus(nextStatus);
    setPage(1);
  }

  function runSearch() {
    setPage(1);
    setSearch(searchInput.trim());
  }

  async function changeStatus(id: string, next: string) {
    setBusyId(id);
    try {
      await api.adminSetOrderStatus(id, next);
      setOpenId('');
      load();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusyId('');
  }

  return (
    <section className="py-10 md:py-16">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin/" className="text-xs font-semibold text-accent-dark hover:underline mb-1 block">
              ← Admin Dashboard
            </Link>
            <h1 className="text-2xl md:text-3xl font-extrabold text-brand">Order Management</h1>
            <p className="text-sm text-muted mt-1">
              {total > 0 ? `${formatNumber(total)} order${total === 1 ? '' : 's'} total` : 'No orders yet'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {ORDER_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => applyFilter(s)}
              className={`rounded-2xl border p-3 text-center transition ${
                status === s ? 'border-brand bg-brand text-white' : 'border-line bg-white hover:border-brand'
              }`}
            >
              <p className={`text-2xl font-extrabold ${status === s ? 'text-white' : 'text-brand'}`}>
                {counts[s]}
              </p>
              <p className={`text-[11px] font-bold mt-0.5 ${status === s ? 'text-white/80' : 'text-muted'}`}>{s}</p>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 mb-5">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => applyFilter('')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                status === '' ? 'bg-brand text-white' : 'bg-white border border-line text-ink'
              }`}
            >
              All
              <span className={`ml-1.5 text-[10px] ${status === '' ? 'text-white/80' : 'text-muted'}`}>
                {orders?.length ?? total}
              </span>
            </button>
            {ORDER_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => applyFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                  status === s ? 'bg-brand text-white' : 'bg-white border border-line text-ink'
                }`}
              >
                {s}
                <span className={`ml-1.5 text-[10px] ${status === s ? 'text-white/80' : 'text-muted'}`}>
                  {counts[s]}
                </span>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
              placeholder="Search by order #, customer name or email"
              className="flex-1 border-2 border-line rounded-xl px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
            <button
              onClick={runSearch}
              className="px-5 py-2 rounded-xl bg-brand text-white text-sm font-bold hover:bg-accent-dark transition"
            >
              Search
            </button>
            {(search || status) && (
              <button
                onClick={() => { setSearch(''); setSearchInput(''); setStatus(''); setPage(1); }}
                className="px-4 py-2 rounded-xl border border-line text-sm font-semibold hover:bg-slate-50 transition"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4 mb-4">{error}</p>
        )}

        <div className="flex flex-col gap-4">
          {orders === null && (
            <div className="py-12 text-center text-muted text-sm">Loading orders…</div>
          )}
          {orders !== null && !orders.length && (
            <div className="py-12 text-center text-muted text-sm">No orders match your filters.</div>
          )}
          {orders?.map((o) => {
            const expanded = openId === o.id;
            const currentStatus = (o.status || 'PENDING') as OrderStatus;
            const nextMoves = ORDER_TRANSITIONS[currentStatus] || [];
            const itemSubtotal = (o.items || []).reduce((s, it) => s + it.qty * (it.price || 0), 0);

            return (
              <div key={o.id} className="bg-white border border-line rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-ink text-lg">{o.reference}</p>
                        <span className={`border text-[11px] font-bold px-2 py-0.5 rounded-lg ${STATUS_COLOR[currentStatus] || ''}`}>
                          {currentStatus}
                        </span>
                      </div>
                      <p className="text-xs text-muted">
                        {o.user?.name} · {o.user?.email} · {new Date(o.placedAt || Date.now()).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted mt-1">
                        Ship to: {o.contact?.name} · {o.contact?.phone} · {o.contact?.address || 'n/a'}
                      </p>
                    </div>
                    <p className="text-xl font-extrabold text-brand shrink-0">{formatAED(o.total)}</p>
                  </div>

                  <p className="text-sm text-ink mb-3">
                    {o.items.map((it) => `${it.name} × ${it.qty}`).join(', ')}
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    {nextMoves.map((next) => (
                      <button
                        key={next}
                        disabled={busyId === o.id}
                        onClick={() => changeStatus(o.id || '', next)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold text-white transition disabled:opacity-50 ${ACTION_STYLE[next] || 'bg-slate-400'}`}
                      >
                        {busyId === o.id ? '…' : ACTION_LABEL[next] || next}
                      </button>
                    ))}
                    {nextMoves.length === 0 && (
                      <span className="text-xs text-muted italic">
                        {currentStatus === 'DELIVERED' ? 'Completed' : 'Order closed'}
                      </span>
                    )}
                    <button
                      onClick={() => setOpenId(expanded ? '' : (o.id as string))}
                      className="ml-auto text-xs font-bold text-accent-dark hover:underline"
                    >
                      {expanded ? 'Hide details ↑' : 'View details ↓'}
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-line bg-slate-50/60 px-5 py-4 grid gap-5 lg:grid-cols-2">
                    <div>
                      <p className="text-xs font-bold text-muted uppercase tracking-wide mb-2">Items</p>
                      <ul className="space-y-1.5 text-sm">
                        {o.items.map((it, i) => (
                          <li key={i} className="flex justify-between gap-3">
                            <span className="text-ink">{it.name} × {it.qty}</span>
                            <span className="font-semibold whitespace-nowrap">{formatAED(it.qty * (it.price || 0))}</span>
                          </li>
                        ))}
                      </ul>
                      <dl className="text-sm mt-3 space-y-1">
                        <div className="flex justify-between">
                          <dt className="text-muted">Items subtotal</dt>
                          <dd className="font-semibold">{formatAED(itemSubtotal)}</dd>
                        </div>
                        {(o.discountAmount ?? 0) > 0 && (
                          <div className="flex justify-between text-green-600">
                            <dt>{o.couponCode ? `Discount (${o.couponCode})` : 'Discount'}</dt>
                            <dd>−{formatAED(o.discountAmount as number)}</dd>
                          </div>
                        )}
                        <div className="flex justify-between font-extrabold text-brand border-t border-line pt-2 mt-2">
                          <dt>Total</dt>
                          <dd>{formatAED(o.total)}</dd>
                        </div>
                      </dl>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-muted uppercase tracking-wide mb-2">Customer Details</p>
                      <div className="text-sm space-y-1.5">
                        <p>
                          <span className="text-muted">User:</span>{' '}
                          <span className="font-semibold text-ink">{o.user?.name || '—'}</span>{' '}
                          <span className="text-muted">({o.user?.email || '—'})</span>
                        </p>
                        <p>
                          <span className="text-muted">Contact:</span>{' '}
                          <span className="font-semibold text-ink">{o.contact?.name || '—'}</span>{' '}
                          <span className="text-muted">{o.contact?.phone || '—'}</span>
                        </p>
                        <p className="text-muted">{o.contact?.address || 'No shipping address.'}</p>
                        <div className="border-t border-line pt-2 mt-2">
                          <p>
                            <span className="text-muted">Payment:</span>{' '}
                            <span className="font-semibold text-ink">{o.paymentMethod || '—'}</span>
                          </p>
                          <p>
                            <span className="text-muted">Paid:</span>{' '}
                            <span className="font-semibold text-ink">
                              {o.paidAt ? new Date(o.paidAt).toLocaleString() : 'Pending'}
                            </span>
                          </p>
                          <p>
                            <span className="text-muted">Placed:</span>{' '}
                            <span className="font-semibold text-ink">
                              {o.placedAt ? new Date(o.placedAt).toLocaleString() : '—'}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8 text-sm">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-4 py-1.5 rounded-lg border border-line font-semibold disabled:opacity-40 hover:bg-slate-50 transition"
            >
              ← Prev
            </button>
            <span className="text-muted">
              Page <span className="font-bold text-ink">{page}</span> of{' '}
              <span className="font-bold text-ink">{totalPages}</span>
              <span className="ml-2 text-xs">({formatNumber(total)} orders)</span>
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-4 py-1.5 rounded-lg border border-line font-semibold disabled:opacity-40 hover:bg-slate-50 transition"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
