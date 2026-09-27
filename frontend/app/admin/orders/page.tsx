'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { ORDER_TRANSITIONS, ORDER_STATUSES, TRACK_LABELS } from '@/lib/types';
import type { Order } from '@/lib/types';
import { formatDateTime, humanise, money, orderTone, paymentTone, relativeTime, useAdminData } from '@/lib/admin';
import {
  Btn,
  EmptyState,
  ErrorNote,
  Field,
  Loading,
  Modal,
  Panel,
  Pill,
  Select,
  TextArea,
  useToast,
} from '@/components/admin/ui';

const STATUS_TABS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function AdminOrdersPage() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const toast = useToast();

  const orders = useAdminData(
    () => api.adminOrders({ status: status || undefined, search: query || undefined, page, pageSize: 20 }),
    [status, query, page],
  );

  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ status: string; note: string; tracking: string; provider: string; eta: string; notes: string }>({
    status: '',
    note: '',
    tracking: '',
    provider: '',
    eta: '',
    notes: '',
  });

  const list = orders.data?.orders || [];
  const detail = list.find((o) => o.id === openId) || null;

  function openOrder(o: Order) {
    setOpenId(o.id || null);
    setDraft({
      status: o.status || '',
      note: '',
      tracking: o.trackingNumber || '',
      provider: o.trackingProvider || '',
      eta: o.estimatedDelivery || '',
      notes: o.notes || '',
    });
  }

  async function run(id: string, fn: () => Promise<unknown>, success: string) {
    setBusyId(id);
    try {
      await fn();
      toast.ok(success);
      orders.reload();
      return true;
    } catch (err) {
      toast.err(err instanceof Error ? err.message : 'That update failed.');
      return false;
    } finally {
      setBusyId(null);
    }
  }

  const changeStatus = async () => {
    if (!detail?.id || !draft.status) return;
    const done = await run(detail.id, () => api.adminSetOrderStatus(detail.id!, draft.status, draft.note || undefined), 'Status updated.');
    if (done) {
      setDraft((d) => ({ ...d, note: '' }));
      setOpenId(null);
    }
  };

  const saveTracking = async () => {
    if (!detail?.id) return;
    const done = await run(
      detail.id,
      () =>
        api.adminSetOrderTracking(detail.id!, {
          trackingNumber: draft.tracking.trim() || undefined,
          trackingProvider: draft.provider.trim() || undefined,
          estimatedDelivery: draft.eta || undefined,
        }),
      'Tracking saved.',
    );
    if (done) setOpenId(null);
  };

  const saveNotes = async () => {
    if (!detail?.id) return;
    const done = await run(detail.id, () => api.adminSetOrderNotes(detail.id!, draft.notes), 'Notes saved.');
    if (done) setOpenId(null);
  };

  const refund = async () => {
    if (!detail?.id) return;
    const done = await run(detail.id, () => api.adminRefundOrder(detail.id!), 'Refund recorded.');
    if (done) setOpenId(null);
  };

  const transitions = detail?.status ? ORDER_TRANSITIONS[detail.status] || [] : [];

  return (
    <div className="space-y-4 sm:space-y-5">
      <header>
        <h1 className="text-xl font-extrabold text-ink sm:text-2xl">Orders</h1>
        <p className="mt-1 text-sm text-muted">
          {orders.data ? `${orders.data.total} order${orders.data.total === 1 ? '' : 's'}` : 'Loading orders'}
          {orders.data && orders.data.totalPages > 1 && ` · page ${orders.data.page} of ${orders.data.totalPages}`}
        </p>
      </header>

      <Panel bodyClassName="p-3 sm:p-4">
        <div className="space-y-3">
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value || 'all'}
                onClick={() => {
                  setStatus(tab.value);
                  setPage(1);
                }}
                className={`chip shrink-0 ${status === tab.value ? 'chip-active' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setQuery(search.trim());
              setPage(1);
            }}
            className="flex gap-2"
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reference, name or email"
              aria-label="Search orders"
              className="field min-h-11"
            />
            <Btn type="submit" className="shrink-0">
              Search
            </Btn>
          </form>
        </div>
      </Panel>

      {orders.loading && <Loading label="Loading orders" />}
      {orders.error && <ErrorNote message={orders.error} onRetry={orders.reload} />}
      {!orders.loading && !orders.error && list.length === 0 && (
        <EmptyState title="No orders match those filters" hint="Try a different status or clear the search." />
      )}

      {!orders.loading && !orders.error && list.length > 0 && (
        <ul className="space-y-3">
          {list.map((o) => {
            const id = o.id || o.reference || '';
            return (
              <li key={id} className="card p-3 sm:p-4">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => openOrder(o)}
                        className="min-h-11 text-left text-sm font-extrabold break-all text-brand hover:underline"
                      >
                        {o.reference}
                      </button>
                      <Pill tone={paymentTone(o.paymentStatus)}>{humanise(o.paymentStatus)}</Pill>
                      <Pill tone={orderTone(o.status)}>{TRACK_LABELS[o.status || ''] || humanise(o.status)}</Pill>
                    </div>
                    <p className="mt-1 truncate text-sm text-ink">
                      {o.contact?.name || o.user?.name || 'Guest'}
                      {o.contact?.email && <span className="text-muted"> · {o.contact.email}</span>}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {o.items?.length || 0} item{(o.items?.length || 0) === 1 ? '' : 's'} ·{' '}
                      {relativeTime(o.placedAt)} · {o.paymentMethod || 'unknown payment'}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-lg font-extrabold tabular-nums text-ink">{money(o.total)}</span>
                    <Btn variant="outline" className="!px-3 !text-xs" onClick={() => openOrder(o)}>
                      Manage
                    </Btn>
                  </div>
                </div>

                {o.items && o.items.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3">
                    {o.items.slice(0, 4).map((it) => (
                      <li key={it.id} className="chip !min-h-0 !py-1 !text-[11px]">
                        {it.qty}× {it.name}
                      </li>
                    ))}
                    {o.items.length > 4 && <li className="chip !min-h-0 !py-1 !text-[11px]">+{o.items.length - 4} more</li>}
                  </ul>
                )}

                {o.trackingNumber && (
                  <p className="mt-2.5 break-all text-xs text-muted">
                    <span className="font-bold text-ink">Tracking:</span> {o.trackingNumber}
                    {o.trackingProvider && <span className="text-muted"> ({o.trackingProvider})</span>}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {orders.data && orders.data.totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <Btn variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Previous
          </Btn>
          <span className="text-xs font-bold text-muted">
            {orders.data.page} / {orders.data.totalPages}
          </span>
          <Btn
            variant="outline"
            disabled={page >= orders.data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Btn>
        </div>
      )}

      <Modal
        open={!!detail}
        title={`Order ${detail?.reference || ''}`}
        onClose={() => setOpenId(null)}
        wide
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpenId(null)}>
              Close
            </Btn>
            {detail && ['PAID', 'CONFIRMED', 'DELIVERED'].includes(String(detail.status)) && (
              <Btn variant="danger" busy={busyId === detail.id} onClick={refund}>
                Refund
              </Btn>
            )}
          </>
        }
      >
        {detail && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-line p-3">
                <p className="text-[11px] font-bold uppercase text-muted">Customer</p>
                <p className="mt-1 text-sm font-bold text-ink">{detail.contact?.name || detail.user?.name || 'Guest'}</p>
                {detail.contact?.email && <p className="break-all text-xs text-muted">{detail.contact.email}</p>}
                {detail.contact?.phone && <p className="text-xs text-muted">{detail.contact.phone}</p>}
                {detail.contact?.address && (
                  <p className="mt-1 text-xs leading-relaxed text-muted">{detail.contact.address}</p>
                )}
              </div>
              <div className="rounded-xl border border-line p-3">
                <p className="text-[11px] font-bold uppercase text-muted">Payment</p>
                <p className="mt-1 text-sm font-bold text-ink">
                  {money(detail.total)} · {humanise(detail.paymentStatus)}
                </p>
                <p className="text-xs text-muted">
                  {humanise(detail.paymentMethod)}
                  {detail.paymentProvider && ` via ${detail.paymentProvider}`}
                </p>
                {detail.paidAt && <p className="text-xs text-muted">Paid {formatDateTime(detail.paidAt)}</p>}
                {detail.paymentReference && (
                  <p className="mt-1 break-all text-xs text-muted">Ref: {detail.paymentReference}</p>
                )}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-bold uppercase text-muted">Items</p>
              <ul className="divide-y divide-line rounded-xl border border-line">
                {(detail.items || []).map((it) => (
                  <li key={it.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">
                      {it.qty}× {it.name}
                    </span>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-ink">{money(it.qty * it.price)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 space-y-1 text-xs text-muted">
                {detail.subtotal != null && (
                  <p className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="tabular-nums">{money(detail.subtotal)}</span>
                  </p>
                )}
                {detail.discountAmount ? (
                  <p className="flex justify-between text-emerald-700">
                    <span>Discount {detail.couponCode ? `(${detail.couponCode})` : ''}</span>
                    <span className="tabular-nums">-{money(detail.discountAmount)}</span>
                  </p>
                ) : null}
                {detail.shippingCost ? (
                  <p className="flex justify-between">
                    <span>Shipping</span>
                    <span className="tabular-nums">{money(detail.shippingCost)}</span>
                  </p>
                ) : null}
                <p className="flex justify-between text-sm font-extrabold text-ink">
                  <span>Total</span>
                  <span className="tabular-nums">{money(detail.total)}</span>
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-line p-3">
              <p className="mb-2 text-[11px] font-bold uppercase text-muted">Update status</p>
              {transitions.length === 0 ? (
                <p className="text-sm text-muted">
                  This order is {humanise(detail.status)} and has no further transitions available.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {transitions.map((t) => (
                      <button
                        key={t}
                        onClick={() => setDraft((d) => ({ ...d, status: t }))}
                        className={`chip shrink-0 ${draft.status === t ? 'chip-active' : ''}`}
                      >
                        {TRACK_LABELS[t] || humanise(t)}
                      </button>
                    ))}
                  </div>
                  <Field
                    label="Note for the customer"
                    placeholder="Optional — shown in their tracking timeline"
                    value={draft.note}
                    onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
                  />
                  <Btn
                    busy={busyId === detail.id}
                    disabled={!draft.status || draft.status === detail.status}
                    onClick={changeStatus}
                  >
                    {draft.status ? `Mark as ${TRACK_LABELS[draft.status] || humanise(draft.status)}` : 'Pick a status'}
                  </Btn>
                </div>
              )}
              {ORDER_STATUSES.includes(detail.status as never) && !transitions.includes('CANCELLED') && detail.status !== 'DELIVERED' && (
                <Select
                  label="Or set any status directly"
                  className="mt-3"
                  value={draft.status}
                  onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
                >
                  <option value="">No change</option>
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {TRACK_LABELS[s] || humanise(s)}
                    </option>
                  ))}
                </Select>
              )}
            </div>

            <div className="rounded-xl border border-line p-3">
              <p className="mb-2 text-[11px] font-bold uppercase text-muted">Tracking</p>
              <div className="space-y-3">
                <Field
                  label="Tracking number"
                  value={draft.tracking}
                  onChange={(e) => setDraft((d) => ({ ...d, tracking: e.target.value }))}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Carrier"
                    placeholder="e.g. Aramex"
                    value={draft.provider}
                    onChange={(e) => setDraft((d) => ({ ...d, provider: e.target.value }))}
                  />
                  <Field
                    label="Estimated delivery"
                    type="date"
                    value={draft.eta ? String(draft.eta).slice(0, 10) : ''}
                    onChange={(e) => setDraft((d) => ({ ...d, eta: e.target.value }))}
                  />
                </div>
                <Btn variant="outline" busy={busyId === detail.id} onClick={saveTracking}>
                  Save tracking
                </Btn>
              </div>
            </div>

            <div className="rounded-xl border border-line p-3">
              <p className="mb-2 text-[11px] font-bold uppercase text-muted">Internal notes</p>
              <TextArea
                rows={3}
                value={draft.notes}
                onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              />
              <Btn variant="outline" className="mt-3" busy={busyId === detail.id} onClick={saveNotes}>
                Save notes
              </Btn>
            </div>

            {detail.trackingEvents && detail.trackingEvents.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase text-muted">Timeline</p>
                <ol className="space-y-2">
                  {detail.trackingEvents.map((ev) => (
                    <li key={ev.id || ev.at} className="flex flex-wrap items-baseline gap-x-2 text-xs">
                      <span className="font-bold text-ink">{ev.label || humanise(ev.status)}</span>
                      <span className="text-muted">{formatDateTime(ev.at)}</span>
                      {ev.note && <span className="w-full text-muted">{ev.note}</span>}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </Modal>

      {toast.node}
    </div>
  );
}
