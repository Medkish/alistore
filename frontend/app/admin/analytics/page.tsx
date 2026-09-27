'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { formatDateTime, relativeTime, useAdminData } from '@/lib/admin';
import {
  EmptyState,
  ErrorNote,
  Loading,
  Panel,
  Pill,
  Select,
  StatCard,
} from '@/components/admin/ui';

const RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '14', label: 'Last 14 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState('14');
  const analytics = useAdminData(() => api.adminAnalytics(Number(days)), [days]);
  const visitors = useAdminData(() => api.adminAnalyticsVisitors(Number(days)), [days]);

  if (analytics.loading) return <Loading label="Loading analytics" />;
  if (analytics.error) return <ErrorNote message={analytics.error} onRetry={analytics.reload} />;
  const a = analytics.data;
  if (!a) return null;

  const o = a.overview;
  const maxViews = Math.max(...a.perDay.map((d) => d.pageViews), 1);
  const cartRate = o.productViews ? Math.round((o.addToCarts / o.productViews) * 100) : 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      <header>
        <h1 className="text-xl font-extrabold text-ink sm:text-2xl">Analytics</h1>
        <p className="mt-1 text-sm text-muted">
          Traffic and conversion over the last {a.periodDays} days.
        </p>
      </header>

      <Panel bodyClassName="p-3 sm:p-4">
        <div className="max-w-xs">
          <Select label="Period" value={days} onChange={(e) => setDays(e.target.value)}>
            {RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Page views" value={o.pageViews} tone="info" hint={`${o.uniqueVisitors} unique visitors`} />
        <StatCard label="Product views" value={o.productViews} hint={`${o.distinctProducts} products`} />
        <StatCard label="Add to carts" value={o.addToCarts} tone="warn" hint={`${cartRate}% of product views`} />
        <StatCard label="Sessions" value={o.totalSessions} hint={`avg ${o.avgSessionMinutes} min`} />
      </div>

      <Panel title="Daily page views" subtitle="Bar height is relative to the busiest day">
        <ul className="flex items-end gap-1.5 overflow-x-auto pb-1" style={{ minHeight: '10rem' }}>
          {a.perDay.map((d) => (
            <li key={d.label} className="flex min-w-[2.25rem] flex-1 flex-col items-center gap-1.5">
              <span className="text-[10px] font-bold tabular-nums text-muted">{d.pageViews}</span>
              <div
                className="w-full rounded-t-md bg-brand transition-all"
                style={{ height: `${Math.max((d.pageViews / maxViews) * 100, 2)}%` }}
                title={`${d.label}: ${d.pageViews} views, ${d.visitors} visitors`}
              />
              <span className="truncate text-[10px] text-muted">{d.label.slice(-2)}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Top pages" bodyClassName="p-0">
          {a.topPages.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No page views recorded" />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {a.topPages.slice(0, 8).map((p) => (
                <li key={p.path} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{p.path}</span>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-muted">{p.views}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Devices" subtitle="How visitors reach the store">
          {a.devices.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No device data yet" />
            </div>
          ) : (
            <ul className="space-y-2.5">
              {a.devices.map((d) => {
                const total = a.devices.reduce((s, x) => s + x.count, 0) || 1;
                return (
                  <li key={d.device}>
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="font-bold text-ink">{d.device}</span>
                      <span className="tabular-nums text-muted">
                        {d.count} · {Math.round((d.count / total) * 100)}%
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${(d.count / total) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Top products" subtitle="Views and carts per book" bodyClassName="p-0">
          {a.topProducts.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No product views yet" />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {a.topProducts.slice(0, 8).map((p) => (
                <li key={p.bookId} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{p.title}</p>
                    <p className="truncate text-xs text-muted">
                      <span className="break-all">/{p.slug}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Pill tone="info">{p.views} views</Pill>
                    <Pill tone="warn">{p.carts} carts</Pill>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Referrers" subtitle="Where traffic comes from">
          {a.referrers.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No referrer data" />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {a.referrers.slice(0, 8).map((r) => (
                <li key={r.referrer} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{r.referrer}</span>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-muted">{r.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Recent events" subtitle="Live stream of visitor activity" bodyClassName="p-0">
        {a.recent.length === 0 ? (
          <div className="p-4">
            <EmptyState title="No events recorded in this period" />
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {a.recent.slice(0, 12).map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2.5 text-xs">
                <Pill
                  tone={
                    e.event === 'add_to_cart'
                      ? 'warn'
                      : e.event === 'login' || e.event === 'purchase'
                        ? 'success'
                        : e.event === 'product_view'
                          ? 'info'
                          : 'neutral'
                  }
                >
                  {e.event.replace(/_/g, ' ')}
                </Pill>
                <span className="min-w-0 flex-1 truncate text-ink">{e.path}</span>
                <span className="shrink-0 text-muted">{e.device}</span>
                <span className="shrink-0 text-muted" title={formatDateTime(e.at)}>
                  {relativeTime(e.at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {visitors.data && visitors.data.visitors.length > 0 && (
        <Panel title="Known visitors" subtitle="Visitors identified by a signed-in account" bodyClassName="p-0">
          <ul className="divide-y divide-line">
            {visitors.data.visitors.slice(0, 10).map((v) => (
              <li key={v.visitorId} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-xs">
                <span className="min-w-0 flex-1 truncate font-bold text-ink">
                  {v.user?.name || v.visitorId.slice(0, 12)}
                </span>
                <span className="shrink-0 text-muted">{v.pageViews} views</span>
                <span className="shrink-0 text-muted">{v.sessions} sessions</span>
                <span className="shrink-0 text-muted">{v.device}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {visitors.loading && <Loading label="Loading visitors" />}
    </div>
  );
}
