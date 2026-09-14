'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatAED, formatNumber } from '@/lib/format';
import type {
  Campaign, DonationItem, DonationReports, DonationRefundItem, DonationsResult, DonationSettings, DonorItem, StoreSettings,
} from '@/lib/types';

type DonationView =
  | 'overview' | 'all' | 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED' | 'recurring'
  | 'campaigns' | 'donors' | 'goals' | 'receipts' | 'reports' | 'refunds' | 'settings';

const STATUS_COLOR: Record<string, string> = {
  PAID: 'bg-green-50 text-green-700 border-green-300',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-300',
  FAILED: 'bg-red-50 text-red-600 border-red-300',
  REFUNDED: 'bg-rose-50 text-rose-600 border-rose-300',
};

const VIEWS: { key: DonationView; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'all', label: 'All Donations' },
  { key: 'PAID', label: 'Successful' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'FAILED', label: 'Failed' },
  { key: 'REFUNDED', label: 'Refunded' },
  { key: 'recurring', label: 'Recurring Donations' },
  { key: 'campaigns', label: 'Campaigns' },
  { key: 'donors', label: 'Donor Management' },
  { key: 'goals', label: 'Donation Goals' },
  { key: 'receipts', label: 'Receipts' },
  { key: 'reports', label: 'Reports' },
  { key: 'refunds', label: 'Refunds' },
  { key: 'settings', label: 'Donation Settings' },
];

const STATUSES = ['ALL', 'PAID', 'PENDING', 'FAILED', 'REFUNDED'];
const MIN_Y = 100;

export default function DonationsTab() {
  const [view, setView] = useState<DonationView>('overview');
  const [viewNum, setViewNum] = useState<Record<string, number>>({});

  const [data, setData] = useState<DonationsResult | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<string>('');

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const [selected, setSelected] = useState<DonationItem | null>(null);

  const load = useCallback(() => {
    const status = ['overview', 'campaigns', 'donors', 'goals', 'receipts', 'reports', 'refunds', 'settings'].includes(view)
      ? 'ALL'
      : view === 'recurring'
        ? 'ALL'
        : view;
    api
      .adminDonations({
        status,
        search: search.trim() || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        minAmount: filters.minAmount || undefined,
        maxAmount: filters.maxAmount || undefined,
        campaignId: filters.campaignId && filters.campaignId !== 'ALL' ? filters.campaignId : undefined,
        method: filters.method && filters.method !== 'ALL' ? filters.method : undefined,
        recurring: view === 'recurring' ? 'true' : filters.recurring || undefined,
        anonymous: filters.anonymous || undefined,
        country: filters.country || undefined,
      })
      .then((r) => {
        setData(r);
        setViewNum((m) => ({ ...m, [view]: r.totalCount }));
      })
      .catch((e) => setError((e as Error).message));
  }, [view, search, filters]);

  useEffect(load, [load]);

  useEffect(() => {
    api.adminCampaigns().then((r) => setCampaigns(r.campaigns)).catch(() => undefined);
    api.adminSettings().then((r) => setSettings(r.settings)).catch(() => undefined);
    api.adminDonations({ status: 'ALL' }).then((r) => setViewNum(r.byStatus)).catch(() => undefined);
  }, []);

  function setFilter(key: string, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
    setError('');
  }

  const stats = data?.stats;
  const byStatus = data?.byStatus || {};
  const donations = data?.donations || [];

  /* ---------------- Actions ---------------- */

  async function refundDonation(d: DonationItem) {
    const reason = window.prompt('Reason for the refund (added to the audit record):', '') || '';
    if (!window.confirm(`Refund donation ${d.donationNumber} of ${formatAED(d.amount)}?`)) return;
    setBusy(d.id);
    setMsg(null);
    setError('');
    try {
      await api.adminRefundDonation(d.donationNumber, reason.trim() || undefined);
      setMsg({ ok: true, text: `Donation ${d.donationNumber} refunded. Audit record saved.` });
      setSelected(null);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy('');
  }

  async function setMessageStatus(d: DonationItem, status: string) {
    setBusy(`${d.id}-${status}`);
    setError('');
    try {
      await api.adminDonationMessage(d.donationNumber, status);
      setMsg({ ok: true, text: `Message ${status === 'approved' ? 'approved' : status === 'hidden' ? 'hidden' : 'updated'}.` });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy('');
  }

  function exportCsv(rows: (string | number | null | undefined)[][], name = 'donations') {
    const escape = (c: string | number | null | undefined) => `"${String(c ?? '').replace(/"/g, '""')}"`;
    const csv = rows.map((r) => r.map(escape).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `alistore-${name}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportDonations() {
    exportCsv(
      [
        ['Donation ID', 'Donor', 'Email', 'Amount (AED)', 'Purpose', 'Campaign', 'Method', 'Provider', 'Recurring', 'Status', 'Country', 'Transaction ID', 'Paid At', 'Created At'],
        ...donations.map((d) => [
          d.donationNumber, d.donorName, d.donorEmail || '', d.amount, d.purpose || '', d.campaign?.title || '',
          d.paymentMethod || '', d.provider || '', d.recurring ? 'Y' : 'N', d.status, d.country || '',
          d.transactionId || '', d.paidAt || '', d.createdAt,
        ]),
      ],
      'donations',
    );
  }

  async function saveSettings() {
    if (!settings) return;
    setBusy('save');
    setMsg(null);
    setError('');
    try {
      await api.adminUpdateSettings(settings);
      setMsg({ ok: true, text: 'Donation settings saved.' });
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy('');
  }

  function setDonationSetting(key: string, value: unknown) {
    setSettings((s) => {
      if (!s) return s;
      const donation = { ...(s.donation || {}) } as Record<string, unknown>;
      return { ...s, donation: { ...donation, [key]: value } };
    });
  }

  /* ---------------- Campaign management ---------------- */

  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [campaignForm, setCampaignForm] = useState<Record<string, string>>({});

  function startCampaignEdit(c?: Campaign) {
    setEditingCampaign(c || null);
    setCampaignForm(
      c
        ? { title: c.title, description: c.description, goal: String(c.goal), purpose: c.purpose || '', status: c.status, featured: c.featured ? '1' : '0', startsAt: c.startsAt?.slice(0, 10) || '', endsAt: c.endsAt?.slice(0, 10) || '', banner: c.banner || '' }
        : { title: '', description: '', goal: '', purpose: '', status: 'ACTIVE', featured: '0', startsAt: '', endsAt: '', banner: '' },
    );
  }

  async function saveCampaign() {
    setError('');
    setMsg(null);
    try {
      const body: Record<string, unknown> = {
        title: campaignForm.title,
        description: campaignForm.description,
        goal: Number(campaignForm.goal),
        purpose: campaignForm.purpose || null,
        status: campaignForm.status,
        featured: campaignForm.featured === '1',
        startsAt: campaignForm.startsAt ? new Date(campaignForm.startsAt as string).toISOString() : null,
        endsAt: campaignForm.endsAt ? new Date(campaignForm.endsAt as string).toISOString() : null,
        banner: campaignForm.banner || null,
      };
      if (editingCampaign) await api.adminUpdateCampaign(editingCampaign.id, body);
      else await api.adminCreateCampaign(body);
      setMsg({ ok: true, text: editingCampaign ? 'Campaign updated.' : 'Campaign created.' });
      setEditingCampaign(null);
      const r = await api.adminCampaigns();
      setCampaigns(r.campaigns);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function campaignStatus(c: Campaign, status: string) {
    setError('');
    try {
      await api.adminUpdateCampaign(c.id, { status });
      setMsg({ ok: true, text: `Campaign ${status === 'PAUSED' ? 'paused' : status === 'ENDED' ? 'ended' : 'activated'}.` });
      const r = await api.adminCampaigns();
      setCampaigns(r.campaigns);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function deleteCampaign(c: Campaign) {
    if (!window.confirm(`Delete campaign “${c.title}”? Its donations will be kept but unlinked.`)) return;
    try {
      await api.adminDeleteCampaign(c.id);
      setMsg({ ok: true, text: 'Campaign deleted.' });
      const r = await api.adminCampaigns();
      setCampaigns(r.campaigns);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function exportCampaign(c: Campaign) {
    const rows = donations.filter((d) => d.campaignId === c.id).map((d) => [
      d.donationNumber, d.donorName, d.donorEmail || '', d.amount, d.status, d.provider || '', d.transactionId || '', d.paidAt || '',
    ]);
    exportCsv([['Donation ID', 'Donor', 'Email', 'Amount (AED)', 'Status', 'Provider', 'Transaction ID', 'Paid At'], ...rows], `campaign-${c.slug}`);
  }

  /* ---------------- Reports ---------------- */

  const [reports, setReports] = useState<DonationReports | null>(null);
  const [donors, setDonors] = useState<DonorItem[]>([]);
  const [refunds, setRefunds] = useState<DonationRefundItem[]>([]);
  const [donorSearch, setDonorSearch] = useState('');

  useEffect(() => {
    if (view === 'reports') api.adminDonationReports().then(setReports).catch((e) => setError((e as Error).message));
    if (view === 'donors') api.adminDonors({ search: donorSearch || undefined }).then((r) => setDonors(r.donors)).catch((e) => setError((e as Error).message));
    if (view === 'refunds') api.adminDonationRefunds().then((r) => setRefunds(r.refunds)).catch((e) => setError((e as Error).message));
  }, [view, donorSearch]);

  useEffect(() => {
    if (view === 'donors' && donorSearch) {
      const t = setTimeout(() => api.adminDonors({ search: donorSearch }).then((r) => setDonors(r.donors)).catch(() => undefined), 300);
      return () => clearTimeout(t);
    }
  }, [donorSearch, view]);

  const maxBar = reports ? Math.max(1, ...reports.daily.map((d) => d.amount), ...reports.monthly.map((m) => m.amount)) : MIN_Y;
  const maxCampaignBar = reports ? Math.max(1, ...reports.campaignPerformance.map((c) => c.amount)) : MIN_Y;

  /* ---------------- Render ---------------- */

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold text-brand">💝 DONATIONS</h2>
        <div className="flex gap-2">
          {view !== 'reports' && view !== 'donors' && view !== 'refunds' && view !== 'campaigns' && view !== 'settings' && (
            <>
              <button onClick={exportDonations} disabled={!donations.length} className="btn-flash btn-outline-flash text-brand border-brand text-xs disabled:opacity-60">
                ⬇ Export CSV / Excel
              </button>
            </>
          )}
          {view === 'campaigns' && <NewCampaignButton onClick={() => startCampaignEdit()} />}
          {view === 'receipts' && !selected && <p className="text-xs text-muted self-center">Click a row to open its receipt.</p>}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
              view === v.key ? 'bg-brand text-white' : 'bg-white border border-line text-ink hover:border-brand'
            }`}
          >
            {v.label}
            {v.key in viewNum && (v.key === 'PAID' || v.key === 'PENDING' || v.key === 'FAILED' || v.key === 'REFUNDED') && (
              <span className="ml-1.5 text-[10px] {view===v.key?'text-white/80':'text-muted'}">({viewNum[v.key]})</span>
            )}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">{error}</p>}
      {msg && (
        <p className={`text-sm ${msg.ok ? 'text-green-700 bg-green-50 border border-green-200' : 'text-red-600 bg-red-50 border border-red-200'} rounded-xl p-4`}>
          {msg.text} <button onClick={() => setMsg(null)} className="float-right font-bold">✕</button>
        </p>
      )}

      {view === 'overview' && (
        <OverviewGrid stats={stats} byStatus={byStatus} campaigns={campaigns} />
      )}

      {(view === 'all' || view === 'PAID' || view === 'PENDING' || view === 'FAILED' || view === 'REFUNDED' || view === 'recurring') && (
        <DonationsTable
          view={view}
          donations={donations}
          data={data}
          fields={{
            search, setSearch, filters, setFilter,
          }}
          campaigns={campaigns}
          onSelect={setSelected}
          selected={selected}
        />
      )}

      {view === 'campaigns' && (
        <CampaignManager
          campaigns={campaigns}
          onEdit={startCampaignEdit}
          onStatus={campaignStatus}
          onDelete={deleteCampaign}
          onExport={exportCampaign}
          form={campaignForm}
          setForm={setCampaignForm}
          editing={editingCampaign}
          saving={busy === 'campaign'}
          onSave={saveCampaign}
          onCancel={() => setEditingCampaign(null)}
        />
      )}

      {view === 'donors' && (
        <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="font-bold text-ink">Donor Management ({formatNumber(donors.length)})</h3>
            <input
              value={donorSearch}
              onChange={(e) => setDonorSearch(e.target.value)}
              placeholder="🔍 Search donor…"
              className="border-2 border-line rounded-xl px-3 py-1.5 text-sm focus:border-brand focus:outline-none w-full md:w-64"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-line">
                  <th className="py-2 pr-3">Donor</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Total</th>
                  <th className="py-2 pr-3">Count</th>
                  <th className="py-2 pr-3">Monthly</th>
                  <th className="py-2">Last Donation</th>
                </tr>
              </thead>
              <tbody>
                {donors.map((d) => (
                  <tr key={d.email || d.name} className="border-b border-line last:border-0">
                    <td className="py-2 pr-3 font-bold text-ink">{d.isAnonymous ? '🕶️ Anonymous' : d.name}</td>
                    <td className="py-2 pr-3 text-muted text-xs">{d.email || '—'}</td>
                    <td className="py-2 pr-3 font-bold">{formatAED(d.total)}</td>
                    <td className="py-2 pr-3">{d.count}</td>
                    <td className="py-2 pr-3">{d.recurring ? '⭐ Yes' : '—'}</td>
                    <td className="py-2 text-muted text-xs">{new Date(d.lastDonation).toLocaleString()}</td>
                  </tr>
                ))}
                {donors.length === 0 && <tr><td colSpan={6} className="py-6 text-muted">No donors found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'goals' && (
        <div className="grid md:grid-cols-2 gap-4">
          {campaigns.map((c) => (
            <div key={c.id} className="bg-white border border-line rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-extrabold text-ink">{c.title}</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${c.status === 'ACTIVE' ? 'text-green-700 bg-green-50 border-green-200' : c.status === 'PAUSED' ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-muted bg-slate-50 border-line'}`}>
                  {c.status}
                </span>
              </div>
              <p className="text-xs text-muted mt-1.5 line-clamp-2">{c.description}</p>
              <div className="flex items-end justify-between mt-5">
                <p className="text-xl font-extrabold text-brand">{formatAED(c.raised)}</p>
                <p className="text-xs font-bold text-muted">of {formatAED(c.goal)} goal</p>
              </div>
              <div className="h-3 bg-line rounded-full mt-2 overflow-hidden">
                <div className={`h-full ${c.fundedPercent >= 100 ? 'bg-green-600' : 'bg-accent'}`} style={{ width: `${Math.min(100, c.fundedPercent)}%` }} />
              </div>
              <p className="text-sm font-extrabold text-accent-dark mt-2">{c.fundedPercent}% funded · {c.donorsCount} donors</p>
            </div>
          ))}
          {campaigns.length === 0 && <p className="col-span-full text-sm text-muted py-6">No campaigns yet.</p>}
        </div>
      )}

      {view === 'receipts' && (
        <div className="bg-white border border-line rounded-2xl p-5 shadow-sm overflow-x-auto">
          <h3 className="font-bold text-ink mb-4">Donation Receipts ({formatNumber(donations.length)})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-line">
                  <th className="py-2 pr-3">Donation ID</th>
                  <th className="py-2 pr-3">Donor</th>
                  <th className="py-2 pr-3">Amount</th>
                  <th className="py-2 pr-3">Transaction</th>
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {donations.map((d) => (
                  <tr key={d.id} className="border-b border-line last:border-0">
                    <td className="py-2 pr-3 font-bold text-ink">{d.donationNumber}</td>
                    <td className="py-2 pr-3">{d.donorName}</td>
                    <td className="py-2 pr-3 font-bold">{formatAED(d.amount)}</td>
                    <td className="py-2 pr-3 text-muted text-xs">{d.transactionId || '—'}</td>
                    <td className="py-2 pr-3 text-muted text-xs">{new Date(d.createdAt).toLocaleDateString()}</td>
                    <td className="py-2">
                      <button onClick={() => setSelected(selected?.id === d.id ? null : d)} className="text-xs font-bold text-accent-dark hover:underline">
                        {selected?.id === d.id ? 'Close' : 'View receipt'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {selected && <DonationDetail donation={selected} busy={busy} onRefund={refundDonation} onMessage={setMessageStatus} onClose={() => setSelected(null)} />}
        </div>
      )}

      {view === 'reports' && reports && (
        <ReportsPanel reports={reports} maxBar={maxBar} maxCampaignBar={maxCampaignBar} />
      )}

      {view === 'refunds' && (
        <div className="bg-white border border-line rounded-2xl p-5 shadow-sm overflow-x-auto">
          <h3 className="font-bold text-ink mb-4">Refund History (audit record)</h3>
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-line">
                <th className="py-2 pr-3">Donation ID</th>
                <th className="py-2 pr-3">Amount</th>
                <th className="py-2 pr-3">Reason</th>
                <th className="py-2 pr-3">Issued by</th>
                <th className="py-2">Refunded At</th>
              </tr>
            </thead>
            <tbody>
              {refunds.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="py-2 pr-3 font-bold text-ink">{r.donationNumber}</td>
                  <td className="py-2 pr-3 font-bold">{formatAED(r.amount)}</td>
                  <td className="py-2 pr-3 text-muted text-xs">{r.reason || '—'}</td>
                  <td className="py-2 pr-3">{r.actorName}</td>
                  <td className="py-2 text-muted text-xs">{new Date(r.refundedAt).toLocaleString()}</td>
                </tr>
              ))}
              {refunds.length === 0 && <tr><td colSpan={5} className="py-6 text-muted">No refunds have been issued yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {view === 'settings' && settings && (
        <SettingsPanel settings={settings} setDonationSetting={setDonationSetting} saving={busy === 'save'} onSave={saveSettings} />
      )}
    </div>
  );
}

/* ---------------- Overview ---------------- */

function OverviewGrid({ stats, byStatus, campaigns }: { stats: DonationsResult['stats'] | undefined; byStatus: Record<string, number>; campaigns: Campaign[] }) {
  const cards = [
    { label: 'Total Donations', value: stats ? formatAED(stats.totalDonations) : '…', sub: stats ? `${formatNumber(stats.totalCount)} donations` : '' },
    { label: 'This Month', value: stats ? formatAED(stats.thisMonth) : '…', sub: stats ? `${formatNumber(stats.thisMonthCount)} donations` : '' },
    { label: 'Today', value: stats ? formatAED(stats.today) : '…', sub: '' },
    { label: 'Total Donors', value: stats ? formatNumber(stats.donors) : '…', sub: '' },
    { label: 'Monthly Donors', value: stats ? formatNumber(stats.monthlyDonors) : '…', sub: '' },
    { label: 'Average Donation', value: stats ? formatAED(stats.average) : '…', sub: '' },
  ];
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="bg-white border border-line rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-muted font-semibold uppercase">{c.label}</p>
            <p className="text-xl font-extrabold text-brand mt-1">{c.value}</p>
            {c.sub && <p className="text-xs text-muted mt-0.5">{c.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {Object.entries(byStatus).map(([st, count]) => (
          <div key={st} className={`border rounded-2xl px-3 py-2 ${STATUS_COLOR[st] || 'bg-slate-50 text-slate-600 border-slate-300'}`}>
            <p className="text-[10px] font-bold uppercase tracking-wide">{st}</p>
            <p className="text-lg font-extrabold">{formatNumber(count)}</p>
          </div>
        ))}
      </div>

      {campaigns.filter((c) => c.status === 'ACTIVE').length > 0 && (
        <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-ink mb-4">Active Campaigns</h3>
          <div className="flex flex-col gap-4">
            {campaigns.filter((c) => c.status === 'ACTIVE').slice(0, 3).map((c) => (
              <div key={c.id}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <p className="font-bold text-ink">{c.title}</p>
                  <p className="text-xs font-bold text-accent-dark">{c.fundedPercent}%</p>
                </div>
                <div className="h-2.5 bg-line rounded-full overflow-hidden">
                  <div className={`h-full ${c.fundedPercent >= 100 ? 'bg-green-600' : 'bg-accent'}`} style={{ width: `${Math.min(100, c.fundedPercent)}%` }} />
                </div>
                <p className="text-[11px] text-muted mt-1">{formatAED(c.raised)} of {formatAED(c.goal)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Donations table + filters ---------------- */

function DonationsTable({
  view, donations, data, fields, campaigns, onSelect, selected,
}: {
  view: string;
  donations: DonationItem[];
  data: DonationsResult | null;
  fields: { search: string; setSearch: (s: string) => void; filters: Record<string, string>; setFilter: (k: string, v: string) => void };
  campaigns: Campaign[];
  onSelect: (d: DonationItem) => void;
  selected: DonationItem | null;
}) {
  const { search, setSearch, filters, setFilter } = fields;
  const countries = [...new Set(donations.map((d) => d.country).filter(Boolean))] as string[];
  return (
    <div className="bg-white border border-line rounded-2xl p-5 shadow-sm overflow-x-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <h3 className="font-bold text-ink">
          {view === 'recurring' ? 'Recurring Donations' : view === 'all' ? 'All Donations' : view} ({data ? formatNumber(donations.length) : '…'})
        </h3>
        <button
          onClick={() => { setSearch(''); Object.keys(filters).forEach((k) => setFilter(k, '')); }}
          className="text-xs font-bold text-muted hover:underline"
        >
          Clear filters
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4 text-sm">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Search donor / ID / email…" className="border-2 border-line rounded-xl px-3 py-1.5 focus:border-brand focus:outline-none w-full md:w-64" />
        <input type="date" value={filters.from || ''} onChange={(e) => setFilter('from', e.target.value)} className="border-2 border-line rounded-xl px-2 py-1.5 focus:border-brand focus:outline-none" />
        <span className="text-muted text-xs self-center">→</span>
        <input type="date" value={filters.to || ''} onChange={(e) => setFilter('to', e.target.value)} className="border-2 border-line rounded-xl px-2 py-1.5 focus:border-brand focus:outline-none" />
        <input type="number" placeholder="Min AED" value={filters.minAmount || ''} onChange={(e) => setFilter('minAmount', e.target.value)} className="border-2 border-line rounded-xl px-2 py-1.5 focus:border-brand focus:outline-none w-24" />
        <input type="number" placeholder="Max AED" value={filters.maxAmount || ''} onChange={(e) => setFilter('maxAmount', e.target.value)} className="border-2 border-line rounded-xl px-2 py-1.5 focus:border-brand focus:outline-none w-24" />
        <select value={filters.campaignId || ''} onChange={(e) => setFilter('campaignId', e.target.value)} className="border-2 border-line rounded-xl px-2 py-1.5 focus:border-brand focus:outline-none">
          <option value="">All campaigns</option>
          {campaigns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <select value={filters.method || ''} onChange={(e) => setFilter('method', e.target.value)} className="border-2 border-line rounded-xl px-2 py-1.5 focus:border-brand focus:outline-none">
          <option value="">All methods</option>
          {['CARD', 'BANK_TRANSFER', 'PAYPAL'].map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={filters.recurring || ''} onChange={(e) => setFilter('recurring', e.target.value)} className="border-2 border-line rounded-xl px-2 py-1.5 focus:border-brand focus:outline-none">
          <option value="">One-time & monthly</option>
          <option value="true">Monthly</option>
          <option value="false">One-time</option>
        </select>
        <select value={filters.anonymous || ''} onChange={(e) => setFilter('anonymous', e.target.value)} className="border-2 border-line rounded-xl px-2 py-1.5 focus:border-brand focus:outline-none">
          <option value="">All donors</option>
          <option value="true">Anonymous</option>
          <option value="false">Named</option>
        </select>
        <select value={filters.country || ''} onChange={(e) => setFilter('country', e.target.value)} className="border-2 border-line rounded-xl px-2 py-1.5 focus:border-brand focus:outline-none">
          <option value="">All countries</option>
          {countries.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {selected && <DonationDetail donation={selected} busy={''} onRefund={() => undefined} onMessage={() => undefined} onClose={() => onSelect(selected)} noActions />}

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead>
            <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-line">
              <th className="py-2 pr-3">Donation ID</th>
              <th className="py-2 pr-3">Donor</th>
              <th className="py-2 pr-3">Amount</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Type</th>
              <th className="py-2 pr-3">Method</th>
              <th className="py-2 pr-3">Purpose</th>
              <th className="py-2 pr-3">Date</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data === null && <tr><td colSpan={9} className="py-4 text-muted">Loading…</td></tr>}
            {data && !donations.length && <tr><td colSpan={9} className="py-4 text-muted">No donations found.</td></tr>}
            {donations.map((d) => (
              <tr key={d.id} className="border-b border-line last:border-0">
                <td className="py-2 pr-3 font-bold text-ink">{d.donationNumber}</td>
                <td className="py-2 pr-3">{d.donorName}{d.isAnonymous ? ' 🕶️' : ''}</td>
                <td className="py-2 pr-3 font-bold">{formatAED(d.amount)}</td>
                <td className="py-2 pr-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${STATUS_COLOR[d.status] || ''}`}>{d.status}</span>
                </td>
                <td className="py-2 pr-3 text-xs">{d.recurring ? '⭐ Monthly' : 'One-time'}</td>
                <td className="py-2 pr-3 text-xs">{d.paymentMethod || '—'}</td>
                <td className="py-2 pr-3 text-xs text-muted max-w-[140px] truncate">{d.purpose || '—'}</td>
                <td className="py-2 pr-3 text-muted text-xs">{new Date(d.createdAt).toLocaleDateString()}</td>
                <td className="py-2">
                  <div className="flex items-center gap-3 text-xs">
                    <button onClick={() => onSelect(selected?.id === d.id ? d : d)} className="font-bold text-accent-dark hover:underline">
                      View
                    </button>
                    {d.status === 'PAID' && (
                      <button onClick={() => onSelect(d)} className="hidden">refund in detail</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Donation detail (incl. refund management) ---------------- */

function DonationDetail({
  donation: d, busy, onRefund, onMessage, onClose, noActions,
}: {
  donation: DonationItem;
  busy: string;
  onRefund: (d: DonationItem) => void;
  onMessage: (d: DonationItem, status: string) => void;
  onClose: () => void;
  noActions?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="border border-accent bg-accent/5 rounded-2xl p-4 mb-4 text-sm">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
        <h4 className="font-extrabold text-brand">DONATION {d.donationNumber}</h4>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${STATUS_COLOR[d.status] || ''}`}>{d.status}</span>
          <button onClick={onClose} className="text-xs font-bold text-muted hover:underline">✕</button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-xs">
        <Detail k="Amount" v={`${formatAED(d.amount)}${d.coverFees ? ` (incl. ${formatAED(d.feesAmount || 0)} fee)` : ''}`} />
        <Detail k="Donor" v={`${d.donorName}${d.isAnonymous ? ' (anonymous)' : ''}`} />
        <Detail k="Email" v={d.donorEmail || '—'} />
        <Detail k="Payment" v={d.paymentMethod || '—'} />
        <Detail k="Provider" v={d.provider || '—'} />
        <Detail k="Transaction" v={d.transactionId || '—'} />
        <Detail k="Type" v={d.recurring ? '⭐ Monthly recurring' : 'One-time'} />
        <Detail k="Purpose / Campaign" v={d.campaign ? d.campaign.title : d.purpose || 'General Fund'} />
        <Detail k="Paid At" v={d.paidAt ? new Date(d.paidAt).toLocaleString() : '—'} />
        <Detail k="Created At" v={new Date(d.createdAt).toLocaleString()} />
        <Detail k="Country" v={d.country || '—'} />
        <Detail k="Wall" v={d.showOnWall ? '☑ Shown' : 'Hidden'} />
      </div>

      {d.message && (
        <div className="mt-3 bg-white border border-line rounded-xl p-3">
          <p className="text-[10px] font-bold text-muted uppercase mb-1">Donor Message</p>
          <p className="text-sm text-ink italic">“{d.message}”</p>
          <p className="text-[10px] text-muted mt-1">
            {d.messageStatus === 'approved' ? '✅ Approved · displayed publicly' : d.messageStatus === 'hidden' ? '🔒 Hidden' : '⏳ Pending approval'}
          </p>
          {d.messageStatus === 'pending' && !noActions && (
            <div className="flex gap-2 mt-2">
              <button onClick={() => onMessage(d, 'approved')} disabled={busy === `${d.id}-approved`} className="text-xs font-bold text-green-700 hover:underline disabled:opacity-50">
                {busy === `${d.id}-approved` ? '…' : '✅ Approve'}
              </button>
              <button onClick={() => onMessage(d, 'hidden')} disabled={busy === `${d.id}-hidden`} className="text-xs font-bold text-muted hover:underline disabled:opacity-50">
                Hide
              </button>
            </div>
          )}
          {d.messageStatus === 'approved' && !noActions && (
            <button onClick={() => onMessage(d, 'hidden')} className="text-xs font-bold text-muted hover:underline mt-2">
              Hide from wall
            </button>
          )}
          {d.messageStatus === 'hidden' && !noActions && (
            <button onClick={() => onMessage(d, 'approved')} className="text-xs font-bold text-green-700 hover:underline mt-2">
              Approve & display
            </button>
          )}
        </div>
      )}

      {d.status === 'PAID' && !noActions && (
        <div className="flex justify-end gap-3 mt-4 items-center">
          {confirming ? (
            <span className="text-xs text-muted">Confirm refund? This updates the status and saves an audit record.</span>
          ) : null}
          <button
            onClick={() => {
              if (!confirming) setConfirming(true);
              else { setConfirming(false); onRefund(d); }
            }}
            disabled={busy === d.id}
            className="btn-flash btn-outline-flash text-red-600 border-red-300 text-xs disabled:opacity-50"
          >
            {busy === d.id ? 'Refunding…' : confirming ? '⚠ Confirm Refund' : '[ REFUND DONATION ]'}
          </button>
          {confirming && (
            <button onClick={() => setConfirming(false)} className="text-xs font-bold text-muted hover:underline">
              Cancel
            </button>
          )}
        </div>
      )}

      {d.refund && (
        <div className="mt-3 bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs">
          <p className="font-bold text-rose-700 mb-1">↩ Refunded {formatAED(d.refund.amount)}</p>
          <p>Reason: {d.refund.reason || '—'}</p>
          <p>By {d.refund.actorName} on {new Date(d.refund.refundedAt).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}

function Detail({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <p className="text-muted">{k}</p>
      <p className="font-bold text-ink">{v}</p>
    </div>
  );
}

/* ---------------- Campaign manager ---------------- */

function NewCampaignButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="btn-flash btn-primary-flash text-xs">
      + Create Campaign
    </button>
  );
}

function CampaignManager({
  campaigns, onEdit, onStatus, onDelete, onExport, form, setForm, editing, saving, onSave, onCancel,
}: {
  campaigns: Campaign[];
  onEdit: (c?: Campaign) => void;
  onStatus: (c: Campaign, s: string) => void;
  onDelete: (c: Campaign) => void;
  onExport: (c: Campaign) => void;
  form: Record<string, string>;
  setForm: (f: Record<string, string>) => void;
  editing: Campaign | null;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      {editing && (
        <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
          <h3 className="font-extrabold text-ink mb-4">{editing ? 'Edit Campaign' : 'Create Campaign'}</h3>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <label className="block sm:col-span-2">
              <span className="font-semibold block mb-1">Campaign Name</span>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Help Us Give 1,000 Students Free Programming Books" className="w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
            </label>
            <label className="block sm:col-span-2">
              <span className="font-semibold block mb-1">Description</span>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
            </label>
            <label className="block">
              <span className="font-semibold block mb-1">Goal Amount (AED)</span>
              <input type="number" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} placeholder="50000" className="w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
            </label>
            <label className="block">
              <span className="font-semibold block mb-1">Purpose</span>
              <input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder="AlioStore Development" className="w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
            </label>
            <label className="block">
              <span className="font-semibold block mb-1">Start Date</span>
              <input type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className="w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
            </label>
            <label className="block">
              <span className="font-semibold block mb-1">End Date</span>
              <input type="date" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} className="w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
            </label>
            <label className="block">
              <span className="font-semibold block mb-1">Banner Image URL</span>
              <input value={form.banner} onChange={(e) => setForm({ ...form, banner: e.target.value })} placeholder="/images/campaigns/banner.jpg" className="w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
            </label>
            <label className="block">
              <span className="font-semibold block mb-1">Status</span>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none">
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="ENDED">Ended</option>
              </select>
            </label>
            <label className="flex items-center gap-2 font-semibold">
              <input type="checkbox" checked={form.featured === '1'} onChange={(e) => setForm({ ...form, featured: e.target.checked ? '1' : '0' })} className="w-4 h-4 accent-brand" />
              Featured campaign
            </label>
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <button onClick={onCancel} className="btn-flash btn-outline-flash text-brand border-brand text-xs">Cancel</button>
            <button onClick={onSave} disabled={saving || !form.title || !form.goal} className="btn-flash btn-primary-flash text-xs disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Campaign'}
            </button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {campaigns.map((c) => (
          <div key={c.id} className="bg-white border border-line rounded-2xl overflow-hidden shadow-sm">
            {c.banner && <div className="h-28 bg-gradient-to-br from-brand/20 to-accent/30 flex items-center justify-center text-4xl">📢</div>}
            <div className="p-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-extrabold text-ink">{c.title}</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${c.status === 'ACTIVE' ? 'text-green-700 bg-green-50 border-green-200' : c.status === 'PAUSED' ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-muted bg-slate-50 border-line'}`}>{c.status}</span>
              </div>
              {c.featured && <span className="text-[10px] font-bold text-accent-dark bg-accent/10 rounded-full px-2 py-0.5 mt-1 inline-block">★ Featured</span>}
              <p className="text-xs text-muted mt-2 line-clamp-2">{c.description}</p>
              <div className="flex items-end justify-between mt-4">
                <p className="text-lg font-extrabold text-brand">{formatAED(c.raised)}</p>
                <p className="text-xs font-bold text-muted">of {formatAED(c.goal)}</p>
              </div>
              <div className="h-2.5 bg-line rounded-full mt-2 overflow-hidden">
                <div className={`h-full ${c.fundedPercent >= 100 ? 'bg-green-600' : 'bg-accent'}`} style={{ width: `${Math.min(100, c.fundedPercent)}%` }} />
              </div>
              <p className="text-[11px] font-extrabold text-accent-dark mt-1.5">{c.fundedPercent}% funded · {c.donorsCount} donors</p>
              {c.purpose && <p className="text-[11px] text-muted mt-1">Purpose: {c.purpose}</p>}
              <div className="flex flex-wrap gap-2 mt-4 text-xs">
                <button onClick={() => onEdit(c)} className="font-bold text-accent-dark hover:underline">Edit</button>
                {c.status === 'ACTIVE' && <button onClick={() => onStatus(c, 'PAUSED')} className="font-bold text-amber-700 hover:underline">Pause</button>}
                {c.status === 'PAUSED' && <button onClick={() => onStatus(c, 'ACTIVE')} className="font-bold text-green-700 hover:underline">Activate</button>}
                {c.status === 'ACTIVE' && <button onClick={() => onStatus(c, 'ENDED')} className="font-bold text-muted hover:underline">End</button>}
                <button onClick={() => onExport(c)} className="font-bold text-ink hover:underline">Export donations</button>
                <button onClick={() => onDelete(c)} className="font-bold text-red-600 hover:underline">Delete</button>
              </div>
            </div>
          </div>
        ))}
        {campaigns.length === 0 && <p className="col-span-full text-sm text-muted py-6 text-center">No campaigns yet — create your first one!</p>}
      </div>
    </div>
  );
}

/* ---------------- Reports ---------------- */

function ReportsPanel({ reports: r, maxBar, maxCampaignBar }: { reports: DonationReports; maxBar: number; maxCampaignBar: number }) {
  const stats = [
    { label: 'Donations', value: formatAED(r.totalAmount) },
    { label: 'Donors', value: formatNumber(r.donors) },
    { label: 'Average', value: formatAED(r.average) },
    { label: 'Monthly Donors', value: formatNumber(r.monthlyDonors) },
    { label: 'Largest', value: `${formatAED(r.largest)}${r.largestDonor ? ` (${r.largestDonor})` : ''}` },
    { label: 'Recurring Revenue', value: formatAED(r.recurringRevenue) },
    { label: 'Conversion Rate', value: `${r.conversionRate}%` },
  ];
  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h3 className="font-extrabold text-ink">Donation Report · {r.label}</h3>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="btn-flash btn-outline-flash text-brand border-brand text-xs">⬇ Export Report</button>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
          {stats.map((s) => (
            <div key={s.label} className="border border-line rounded-xl p-3">
              <p className="text-[10px] font-bold text-muted uppercase">{s.label}</p>
              <p className="text-base font-extrabold text-brand mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
          <h4 className="font-bold text-ink mb-4">Donations over time</h4>
          <div className="flex items-end gap-1 h-40">
            {r.daily.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center justify-end gap-1 group" title={`${d.date}: ${formatAED(d.amount)}`}>
                <span className="text-[9px] font-bold text-accent-dark opacity-0 group-hover:opacity-100">{formatAED(d.amount)}</span>
                <div className="w-full bg-accent rounded-t" style={{ height: `${Math.max(2, (d.amount / maxBar) * 140)}px` }} />
              </div>
            ))}
            {r.daily.length === 0 && <p className="text-xs text-muted py-8">No data.</p>}
          </div>
          <p className="text-[10px] text-muted mt-2">Last 30 days</p>
        </div>

        <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
          <h4 className="font-bold text-ink mb-4">Donations by campaign</h4>
          <div className="flex flex-col gap-2.5">
            {r.campaignPerformance.map((c) => (
              <div key={c.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold text-ink">{c.name}</span>
                  <span className="font-bold text-brand">{formatAED(c.amount)}</span>
                </div>
                <div className="h-2 bg-line rounded-full overflow-hidden">
                  <div className="h-full bg-accent" style={{ width: `${(c.amount / maxCampaignBar) * 100}%` }} />
                </div>
              </div>
            ))}
            {r.campaignPerformance.length === 0 && <p className="text-xs text-muted py-6">No campaign donations yet.</p>}
          </div>
        </div>

        <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
          <h4 className="font-bold text-ink mb-4">Donations by amount (+ by country)</h4>
          <div className="flex flex-col gap-2 text-xs mb-4">
            {r.byAmount.map((b) => (
              <div key={b.label} className="flex justify-between border-b border-line pb-1.5">
                <span className="text-muted">{b.label}</span>
                <span className="font-bold text-ink">{b.value} donations</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1.5 text-xs">
            {r.byCountry.map((c) => (
              <div key={c.name} className="flex justify-between">
                <span className="text-muted">{c.name}</span>
                <span className="font-bold text-ink">{formatAED(c.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
          <h4 className="font-bold text-ink mb-4">One-time vs monthly · Status</h4>
          <div className="flex gap-2 mb-4">
            <div className="flex-1 bg-brand/5 rounded-xl p-3 text-center">
              <p className="text-xl font-extrabold text-brand">{r.oneTimeIfMonthly.oneTime}</p>
              <p className="text-[10px] font-bold text-muted uppercase">One-time</p>
            </div>
            <div className="flex-1 bg-accent/10 rounded-xl p-3 text-center">
              <p className="text-xl font-extrabold text-accent-dark">{r.oneTimeIfMonthly.monthly}</p>
              <p className="text-[10px] font-bold text-muted uppercase">Monthly</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 text-xs">
            {Object.entries(r.byStatus).map(([status, count]) => (
              <div key={status} className="flex justify-between">
                <span className="text-muted">{status}</span>
                <span className="font-bold text-ink">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Settings ---------------- */

function SettingsPanel({ settings, setDonationSetting, saving, onSave }: {
  settings: StoreSettings;
  setDonationSetting: (k: string, v: unknown) => void;
  saving: boolean;
  onSave: () => void;
}) {
  const d = (settings.donation || {}) as DonationSettings & Record<string, unknown>;
  const suggested = (d.suggestedAmounts as number[] | undefined) || [10, 25, 50, 100, 250];
  const monthly = (d.monthlyAmounts as number[] | undefined) || [10, 25, 50, 100];
  const purposes = (d.purposes as string[] | undefined) || ['AlioStore Development', 'Help improve the platform'];

  function textArray(key: string, current: number[]) {
    return current.map((v, i) => (
      <input
        key={i}
        type="number"
        defaultValue={v}
        onBlur={(e) => {
          const next = current.slice();
          const n = Number(e.target.value);
          next[i] = Number.isFinite(n) ? n : 0;
          setDonationSetting(key, next);
        }}
        className="w-20 border-2 border-line rounded-xl px-2 py-1.5 text-sm focus:border-brand focus:outline-none"
      />
    ));
  }

  function textList(key: string, current: string[], placeholder: string) {
    return current.map((v, i) => (
      <input
        key={i}
        defaultValue={v}
        onBlur={(e) => {
          const next = current.slice();
          next[i] = e.target.value;
          setDonationSetting(key, next);
        }}
        placeholder={placeholder}
        className="border-2 border-line rounded-xl px-2 py-1.5 text-sm focus:border-brand focus:outline-none flex-1 min-w-[160px]"
      />
    ));
  }

  const Toggles = ({ label, key }: { label: string; key: string }) => (
    <label className="flex items-center gap-2 font-semibold text-sm">
      <input type="checkbox" checked={Boolean(d[key])} onChange={(e) => setDonationSetting(key, e.target.checked)} className="w-4 h-4 accent-brand" />
      {label}
    </label>
  );

  return (
    <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
      <h3 className="font-extrabold text-ink mb-5">Donation Settings</h3>
      <div className="flex flex-col gap-5 text-sm">
        <div className="flex flex-col gap-2">
          <Toggles label="Donation System" key="enabled" />
          <Toggles label="Allow Anonymous Donations" key="allowAnonymous" />
          <Toggles label="Allow Monthly Donations" key="allowMonthly" />
          <Toggles label="Allow Donation Messages" key="allowMessages" />
          <Toggles label="Show Supporter Wall" key="showSupporterWall" />
          <Toggles label="Send Email Receipt" key="sendEmailReceipt" />
          <Toggles label="Show Donation Progress" key="showProgress" />
          <Toggles label="Allow Campaign Donations" key="allowCampaigns" />
          <Toggles label="Messages require approval" key="messageApproval" />
          <Toggles label="☑ Display messages publicly" key="messageDisplay" />
        </div>

        <div className="grid sm:grid-cols-2 gap-3 border-t border-line pt-4 mt-2">
          <label className="block">
            <span className="font-semibold block mb-1">Minimum Donation (AED)</span>
            <input type="number" defaultValue={Number(d.minAmount) || 5} onBlur={(e) => setDonationSetting('minAmount', Number(e.target.value))} className="w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
          </label>
          <label className="block">
            <span className="font-semibold block mb-1">Maximum Donation (AED)</span>
            <input type="number" defaultValue={Number(d.maxAmount) || 50000} onBlur={(e) => setDonationSetting('maxAmount', Number(e.target.value))} className="w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
          </label>
        </div>

        <div className="border-t border-line pt-4">
          <span className="font-semibold block mb-2">Suggested Amounts (AED)</span>
          <div className="flex flex-wrap gap-2">{textArray('suggestedAmounts', suggested)}</div>
        </div>
        <div className="border-t border-line pt-4">
          <span className="font-semibold block mb-2">Monthly Giving Amounts (AED)</span>
          <div className="flex flex-wrap gap-2">{textArray('monthlyAmounts', monthly)}</div>
        </div>
        <div className="border-t border-line pt-4">
          <span className="font-semibold block mb-2">Donation Purposes</span>
          <div className="flex flex-wrap gap-2">{textList('purposes', purposes, 'Purpose')}</div>
        </div>

        <label className="block border-t border-line pt-4">
          <span className="font-semibold block mb-1">Donation Message</span>
          <textarea defaultValue={String(d.message || '')} onBlur={(e) => setDonationSetting('message', e.target.value)} rows={2} className="w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
        </label>

        <div className="border-t border-line pt-4 grid sm:grid-cols-2 gap-2">
          <Toggles label="Send payment success email (customer)" key="notifications.customer.paymentSuccess" />
          <Toggles label="Send receipt email (customer)" key="notifications.customer.receipt" />
          <Toggles label="Send thank-you email (customer)" key="notifications.customer.thankYou" />
          <Toggles label="Monthly donation confirmation (customer)" key="notifications.customer.monthlyConfirmation" />
          <Toggles label="Notify admin: new donation" key="notifications.admin.newDonation" />
          <Toggles label="Notify admin: large donation" key="notifications.admin.largeDonation" />
          <Toggles label="Notify admin: payment failed" key="notifications.admin.paymentFailed" />
          <Toggles label="Notify admin: recurring cancelled" key="notifications.admin.recurringCancelled" />
          <Toggles label="Notify admin: refund requested" key="notifications.admin.refundRequested" />
        </div>

        <div className="flex justify-end">
          <button onClick={onSave} disabled={saving} className="btn-flash btn-primary-flash disabled:opacity-60">
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}