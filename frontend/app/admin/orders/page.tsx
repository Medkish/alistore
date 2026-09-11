'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
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
const SHIPPING_FEE = 10;

const STATUS_COLOR: Record<string, string> = {
  PENDING:  'bg-slate-100 text-slate-700 border-slate-300',
  PAID:     'bg-green-50 text-green-700 border-green-300',
  SHIPPED:  'bg-blue-50 text-blue-700 border-blue-300',
  DELIVERED:'bg-emerald-50 text-emerald-700 border-emerald-300',
  CANCELLED:'bg-red-50 text-red-600 border-red-300',
};

const ACTION_LABEL: Record<string, string> = {
  PAID:     'MARK AS PAID',
  SHIPPED:  'MARK AS SHIPPED',
  DELIVERED:'MARK AS DELIVERED',
  CANCELLED:'CANCEL ORDER',
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

        {orders === null && (
          <div className="py-12 text-center text-muted text-sm bg-white border border-line rounded-2xl">Loading orders…</div>
        )}
        {orders !== null && !orders.length && (
          <div className="py-12 text-center text-muted text-sm bg-white border border-line rounded-2xl">No orders match your filters.</div>
        )}

        {orders !== null && orders.length > 0 && (
          <div className="bg-white border border-line rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-line text-left text-[11px] uppercase tracking-wide text-muted">
                    <th className="px-4 py-3 font-bold">Order</th>
                    <th className="px-4 py-3 font-bold">Customer</th>
                    <th className="px-4 py-3 font-bold text-right">Total</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    const expanded = openId === o.id;
                    const currentStatus = (o.status || 'PENDING') as OrderStatus;
                    const nextMoves = ORDER_TRANSITIONS[currentStatus] || [];
                    const itemSubtotal = (o.items || []).reduce((s, it) => s + it.qty * (it.price || 0), 0);

                    return (
                      <FragmentRow key={o.id} expanded={expanded}>
                        <td className="px-4 py-3 font-bold text-ink align-top">
                          {o.reference}
                          <span className="block text-[11px] font-normal text-muted mt-0.5">
                            {new Date(o.placedAt || Date.now()).toLocaleDateString(undefined, {
                              year: 'numeric', month: 'short', day: 'numeric',
                            })}
                            {' · '}
                            {new Date(o.placedAt || Date.now()).toLocaleTimeString(undefined, {
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span className="font-semibold text-ink">
                            {o.user?.name || o.contact?.name || '—'}
                          </span>
                          <span className="block text-[11px] text-muted mt-0.5">
                            {o.user?.email || o.contact?.email || '—'}
                          </span>
                          <span className="block text-[11px] text-muted">
                            🚚 {o.contact?.address || 'no address'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-extrabold text-brand align-top whitespace-nowrap">
                          {formatAED(o.total)}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`border text-[11px] font-bold px-2 py-0.5 rounded-lg ${STATUS_COLOR[currentStatus] || ''}`}>
                              {currentStatus}
                            </span>
                            {nextMoves.length === 0 && (
                              <span className="text-[11px] text-muted italic">
                                {currentStatus === 'DELIVERED' ? 'Completed' : 'Closed'}
                              </span>
                            )}
                            <button
                              onClick={() => setOpenId(expanded ? '' : (o.id as string))}
                              className="ml-auto text-[11px] font-bold text-accent-dark hover:underline whitespace-nowrap shrink-0"
                            >
                              {expanded ? 'Hide detail ↑' : 'View detail ↓'}
                            </button>
                          </div>

                          {expanded && (
                            <div className="mt-4 border border-line rounded-2xl bg-slate-50/50 p-5">
                              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                <p className="text-lg font-extrabold text-ink">{o.reference}</p>
                                <span className={`border text-xs font-bold px-2.5 py-1 rounded-lg ${STATUS_COLOR[currentStatus] || ''}`}>
                                  {currentStatus}
                                </span>
                              </div>

                              <div className="grid gap-5 md:grid-cols-2">
                                <div>
                                  <p className="text-[10px] font-bold text-muted uppercase tracking-wide mb-2 border-b border-dashed border-line pb-1">
                                    Customer
                                  </p>
                                  <div className="text-xs space-y-1">
                                    <p>
                                      <span className="text-muted">Name:</span>{' '}
                                      <span className="font-semibold text-ink">{o.user?.name || o.contact?.name || '—'}</span>
                                    </p>
                                    <p>
                                      <span className="text-muted">Email:</span>{' '}
                                      <span className="font-semibold text-ink">{o.user?.email || o.contact?.email || '—'}</span>
                                    </p>
                                    <p>
                                      <span className="text-muted">Phone:</span>{' '}
                                      <span className="font-semibold text-ink">{o.contact?.phone || '—'}</span>
                                    </p>
                                    <p>
                                      <span className="text-muted">Ship to:</span>{' '}
                                      <span className="text-ink">{o.contact?.address || '—'}</span>
                                    </p>
                                  </div>
                                </div>

                                <div>
                                  <p className="text-[10px] font-bold text-muted uppercase tracking-wide mb-2 border-b border-dashed border-line pb-1">
                                    Items
                                  </p>
                                  <ul className="text-xs space-y-1.5">
                                    {o.items.map((it, i) => (
                                      <li key={i} className="flex justify-between gap-3">
                                        <span className="text-ink">{it.name} × {it.qty}</span>
                                        <span className="font-semibold whitespace-nowrap">{formatAED(it.qty * (it.price || 0))}</span>
                                      </li>
                                    ))}
                                    <li className="flex justify-between text-muted border-t border-dashed border-line pt-1.5 mt-1.5">
                                      <span>Shipping</span>
                                      <span className="font-semibold text-ink">{formatAED(SHIPPING_FEE)}</span>
                                    </li>
                                    {(o.discountAmount ?? 0) > 0 && (
                                      <li className="flex justify-between text-green-600">
                                        <span>{o.couponCode ? `Discount (${o.couponCode})` : 'Discount'}</span>
                                        <span>−{formatAED(o.discountAmount as number)}</span>
                                      </li>
                                    )}
                                    <li className="flex justify-between font-extrabold text-brand border-t border-line pt-1.5 mt-1.5">
                                      <span>TOTAL</span>
                                      <span>
                                        {formatAED(itemSubtotal + SHIPPING_FEE - (o.discountAmount ?? 0))}
                                      </span>
                                    </li>
                                  </ul>
                                  <p className="text-[10px] text-muted mt-2">
                                    Payment: {o.paymentMethod || '—'} ·{' '}
                                    Paid: {o.paidAt ? new Date(o.paidAt).toLocaleString() : 'Pending'}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-5 flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-muted uppercase tracking-wide mr-1">Status</span>
                                <ScrollArea>
                                  {nextMoves.map((next) => (
                                    <button
                                      key={next}
                                      disabled={busyId === o.id}
                                      onClick={() => changeStatus(o.id || '', next)}
                                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold text-white transition disabled:opacity-50 whitespace-nowrap ${ACTION_STYLE[next] || 'bg-slate-400'}`}
                                    >
                                      {busyId === o.id ? '…' : ACTION_LABEL[next] || next}
                                    </button>
                                  ))}
                                </ScrollArea>
                              </div>
                            </div>
                          )}
                        </td>
                      </FragmentRow>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

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

function FragmentRow({ children }: { expanded: boolean; children: ReactNode }) {
  return <tr className="border-b border-line last:border-0 align-top hover:bg-slate-50/60 transition">{children}</tr>;
}

function ScrollArea({ children }: { children: ReactNode }) {
  return <span className="flex gap-1 flex-wrap max-w-[220px]">{children}</span>;
}