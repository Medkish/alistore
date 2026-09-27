'use client';

import Link from 'next/link';
import { api } from '@/lib/api';
import {
  formatDateTime,
  humanise,
  money,
  orderTone,
  paymentTone,
  relativeTime,
  useAdminData,
} from '@/lib/admin';
import { EmptyState, ErrorNote, Loading, Panel, Pill, StatCard } from '@/components/admin/ui';

export default function AdminDashboardPage() {
  const stats = useAdminData(() => api.adminStats(), []);
  const donations = useAdminData(() => api.adminDonations({}), []);
  const analytics = useAdminData(() => api.adminAnalytics(7), []);

  if (stats.loading) return <Loading label="Loading dashboard" />;
  if (stats.error) return <ErrorNote message={stats.error} onRetry={stats.reload} />;
  if (!stats.data) return null;

  const s = stats.data;

  return (
    <div className="space-y-4 sm:space-y-5">
      <header>
        <h1 className="text-xl font-extrabold text-ink sm:text-2xl">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Store health at a glance. Figures cover paid orders only.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Revenue"
          value={money(s.revenue)}
          tone="success"
          hint={`${s.paidOrderCount} paid order${s.paidOrderCount === 1 ? '' : 's'}`}
        />
        <StatCard label="Catalogue" value={s.bookCount} tone="info" hint={`${s.stockTotal} units in stock`} />
        <StatCard label="Customers" value={s.userCount} hint="Registered accounts" />
        <StatCard
          label="Avg order"
          value={money(s.paidOrderCount ? s.revenue / s.paidOrderCount : 0)}
          hint="Revenue per paid order"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Recent orders"
          subtitle={`${s.recentOrders.length} most recent`}
          action={
            <Link href="/admin/orders/" className="btn-flash btn-outline-flash min-h-11 border-brand !px-3 !text-xs text-brand">
              Manage
            </Link>
          }
          bodyClassName="p-0"
        >
          {s.recentOrders.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No orders yet" hint="Orders appear here as soon as customers check out." />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {s.recentOrders.slice(0, 8).map((o) => (
                <li key={o.id || o.reference} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{o.contact?.name || o.user?.name || 'Guest'}</p>
                    <p className="truncate text-xs text-muted">
                      <span className="break-all">{o.reference}</span>
                      {' · '}
                      {o.items?.length || 0} item{(o.items?.length || 0) === 1 ? '' : 's'}
                      {' · '}
                      {relativeTime(o.placedAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Pill tone={paymentTone(o.paymentStatus)}>{humanise(o.paymentStatus)}</Pill>
                    <Pill tone={orderTone(o.status)}>{humanise(o.status)}</Pill>
                    <span className="text-sm font-extrabold tabular-nums text-ink">{money(o.total)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel
            title="Donations"
            action={
              <Link href="/admin/donations/" className="btn-flash btn-outline-flash min-h-11 border-brand !px-3 !text-xs text-brand">
                Open
              </Link>
            }
          >
            {donations.loading && <Loading label="Loading donations" />}
            {donations.error && <p className="text-sm text-red-600">{donations.error}</p>}
            {donations.data && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Raised" value={money(donations.data.stats.totalDonations)} tone="success" />
                  <StatCard label="Donors" value={donations.data.stats.donors} />
                  <StatCard label="This month" value={money(donations.data.stats.thisMonth)} tone="info" />
                  <StatCard label="Average" value={money(donations.data.stats.average)} />
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {Object.entries(donations.data.byStatus).map(([status, count]) => (
                    <Pill key={status} tone={status === 'PAID' ? 'success' : status === 'PENDING' ? 'warn' : 'neutral'}>
                      {humanise(status)}: {count}
                    </Pill>
                  ))}
                </div>
              </>
            )}
          </Panel>

          <Panel
            title="Traffic (7 days)"
            action={
              <Link href="/admin/analytics/" className="btn-flash btn-outline-flash min-h-11 border-brand !px-3 !text-xs text-brand">
                Details
              </Link>
            }
          >
            {analytics.loading && <Loading label="Loading analytics" />}
            {analytics.error && <p className="text-sm text-red-600">{analytics.error}</p>}
            {analytics.data && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Page views" value={analytics.data.overview.pageViews} tone="info" />
                  <StatCard label="Visitors" value={analytics.data.overview.uniqueVisitors} />
                </div>
                <p className="mt-3 text-xs text-muted">
                  {analytics.data.overview.addToCarts} add-to-cart event
                  {analytics.data.overview.addToCarts === 1 ? '' : 's'} from {analytics.data.overview.productViews}{' '}
                  product views.
                </p>
              </>
            )}
          </Panel>
        </div>
      </div>

      {analytics.data && analytics.data.topProducts.length > 0 && (
        <Panel title="Most viewed books" subtitle="By product page views in the selected period" bodyClassName="p-0">
          <ul className="divide-y divide-line">
            {analytics.data.topProducts.slice(0, 6).map((p) => (
              <li key={p.bookId} className="flex flex-wrap items-center gap-3 px-4 py-3">
                {p.image ? (
                  <img
                    src={p.image}
                    alt=""
                    width={40}
                    height={52}
                    loading="lazy"
                    className="h-[3.25rem] w-10 shrink-0 rounded-md object-cover ring-1 ring-line"
                  />
                ) : (
                  <span className="h-[3.25rem] w-10 shrink-0 rounded-md bg-surface-2" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{p.title}</p>
                  <p className="text-xs text-muted">
                    <span className="break-all">/{p.slug}</span>
                  </p>
                </div>
                <div className="flex shrink-0 gap-2 text-xs">
                  <Pill tone="info">{p.views} views</Pill>
                  <Pill tone="warn">{p.carts} carts</Pill>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <p className="pt-1 text-center text-[11px] text-muted">
        Refreshed {formatDateTime(new Date().toISOString())} · figures are live from the database
      </p>
    </div>
  );
}
