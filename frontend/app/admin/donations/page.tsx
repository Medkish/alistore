'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { formatDate, humanise, money, donationTone, useAdminData } from '@/lib/admin';
import { Btn, EmptyState, ErrorNote, Loading, Panel, Pill, Select, StatCard, useToast } from '@/components/admin/ui';

const STATUSES = ['', 'PAID', 'PENDING', 'FAILED', 'REFUNDED'];

export default function AdminDonationsPage() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const toast = useToast();

  const donations = useAdminData(
    () => api.adminDonations({ status: status || undefined, search: query || undefined }),
    [status, query],
  );
  const reports = useAdminData(() => api.adminDonationReports(), []);

  const [busyNumber, setBusyNumber] = useState<string | null>(null);

  const list = donations.data?.donations || [];
  const stats = donations.data?.stats;

  async function moderate(donationNumber: string, messageStatus: string) {
    setBusyNumber(donationNumber);
    try {
      await api.adminDonationMessage(donationNumber, messageStatus);
      toast.ok(messageStatus === 'APPROVED' ? 'Message approved.' : 'Message hidden.');
      donations.reload();
    } catch (err) {
      toast.err(err instanceof Error ? err.message : 'Could not update the message.');
    } finally {
      setBusyNumber(null);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <header>
        <h1 className="text-xl font-extrabold text-ink sm:text-2xl">Donations</h1>
        <p className="mt-1 text-sm text-muted">Support received, donor messages and campaign performance.</p>
      </header>

      {stats && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Total raised"
            value={money(stats.totalDonations)}
            tone="success"
            hint={`${stats.totalCount} donations`}
          />
          <StatCard label="Donors" value={stats.donors} hint={`${stats.monthlyDonors} monthly`} />
          <StatCard
            label="This month"
            value={money(stats.thisMonth)}
            tone="info"
            hint={`${stats.thisMonthCount} donations`}
          />
          <StatCard label="Average" value={money(stats.average)} hint={`${money(stats.today)} today`} />
        </div>
      )}

      <Panel bodyClassName="p-3 sm:p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(search.trim());
          }}
          className="grid gap-3 sm:grid-cols-[1fr_auto_auto]"
        >
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-ink">Search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Donation number, donor or email"
              className="field min-h-11"
            />
          </label>
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s || 'all'} value={s}>
                {s ? humanise(s) : 'All statuses'}
              </option>
            ))}
          </Select>
          <div className="flex items-end">
            <Btn type="submit" className="w-full sm:w-auto">
              Apply
            </Btn>
          </div>
        </form>
      </Panel>

      {donations.loading && <Loading label="Loading donations" />}
      {donations.error && <ErrorNote message={donations.error} onRetry={donations.reload} />}
      {!donations.loading && !donations.error && list.length === 0 && (
        <EmptyState title="No donations match" hint="Try a different status or clear the search." />
      )}

      {!donations.loading && !donations.error && list.length > 0 && (
        <Panel title="Donations" subtitle={`${list.length} shown`} bodyClassName="p-0">
          <ul className="divide-y divide-line">
            {list.map((d) => (
              <li key={d.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="break-all text-sm font-extrabold text-ink">{d.donationNumber}</span>
                    <Pill tone={donationTone(d.status)}>{humanise(d.status)}</Pill>
                    {d.recurring && <Pill tone="info">Monthly</Pill>}
                    {d.isAnonymous && <Pill tone="neutral">Anonymous</Pill>}
                  </div>
                  <p className="mt-1 truncate text-xs text-muted">
                    {d.donorName}
                    {d.donorEmail && <span className="break-all"> · {d.donorEmail}</span>}
                    {' · '}
                    {formatDate(d.createdAt)}
                  </p>
                  {d.purpose && <p className="mt-0.5 truncate text-xs text-muted">For: {d.purpose}</p>}
                  {d.campaign && <p className="mt-0.5 truncate text-xs text-muted">Campaign: {d.campaign.title}</p>}
                  {d.message && (
                    <div className="mt-1.5 break-words rounded-lg bg-surface px-3 py-2 text-xs text-muted">
                      <span className="font-bold text-ink">Message:</span> {d.message}
                      {d.messageStatus && d.messageStatus !== 'APPROVED' && (
                        <Btn
                          variant="outline"
                          className="ml-2 !py-1 !text-[11px]"
                          busy={busyNumber === d.donationNumber}
                          onClick={() => moderate(d.donationNumber, 'APPROVED')}
                        >
                          Approve
                        </Btn>
                      )}
                    </div>
                  )}
                  {d.refund && (
                    <p className="mt-1 text-xs text-red-600">
                      Refunded {money(d.refund.amount)} — {d.refund.reason}
                    </p>
                  )}
                </div>
                <p className="shrink-0 text-base font-extrabold tabular-nums text-ink">
                  {money(d.amount, d.currency)}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {reports.data && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Lifetime report" subtitle={reports.data.label}>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Raised"
                value={money(reports.data.totalAmount, reports.data.currency)}
                tone="success"
              />
              <StatCard label="Donors" value={reports.data.donors} />
              <StatCard
                label="Recurring"
                value={money(reports.data.recurringRevenue, reports.data.currency)}
                tone="info"
              />
              <StatCard label="Conversion" value={`${reports.data.conversionRate}%`} />
            </div>
            <p className="mt-3 text-xs text-muted">
              Largest gift {money(reports.data.largest, reports.data.currency)}
              {reports.data.largestDonor && ` from ${reports.data.largestDonor}`}.
            </p>
          </Panel>

          <Panel title="Campaign performance" subtitle="Amount raised per campaign">
            {reports.data.campaignPerformance.length === 0 ? (
              <EmptyState title="No campaign donations yet" />
            ) : (
              <ul className="space-y-2.5">
                {reports.data.campaignPerformance.map((c) => {
                  const max = Math.max(...reports.data!.campaignPerformance.map((x) => x.amount), 1);
                  return (
                    <li key={c.name}>
                      <div className="flex items-baseline justify-between gap-2 text-xs">
                        <span className="truncate font-bold text-ink">{c.name}</span>
                        <span className="shrink-0 font-bold tabular-nums text-muted">
                          {money(c.amount, reports.data!.currency)}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="h-full rounded-full bg-brand"
                          style={{ width: `${(c.amount / max) * 100}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      )}

      {toast.node}
    </div>
  );
}
