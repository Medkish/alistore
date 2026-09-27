'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { StoreSettings } from '@/lib/types';
import { relativeTime, useAdminData } from '@/lib/admin';
import { Btn, ErrorNote, Field, Loading, Panel, Pill, TextArea, useToast } from '@/components/admin/ui';

type Tab = 'store' | 'donation' | 'website' | 'system';

const TABS: { key: Tab; label: string }[] = [
  { key: 'store', label: 'Store' },
  { key: 'donation', label: 'Donations' },
  { key: 'website', label: 'Website' },
  { key: 'system', label: 'System' },
];

export default function AdminSettingsPage() {
  const [tab, setTab] = useState<Tab>('store');
  const settings = useAdminData(() => api.adminSettings(), []);
  const website = useAdminData(() => api.adminWebsite(), []);
  const system = useAdminData(() => api.adminSystem(), []);

  const [draft, setDraft] = useState<StoreSettings | null>(null);
  const [siteDraft, setSiteDraft] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (settings.data) setDraft(settings.data.settings);
  }, [settings.data]);

  useEffect(() => {
    if (website.data) setSiteDraft(website.data.content as unknown as Record<string, unknown>);
  }, [website.data]);

  async function saveSettings() {
    if (!draft) return;
    setSaving(true);
    try {
      await api.adminUpdateSettings(draft);
      toast.ok('Settings saved.');
      settings.reload();
    } catch (err) {
      toast.err(err instanceof Error ? err.message : 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  }

  async function saveWebsite() {
    if (!siteDraft) return;
    setSaving(true);
    try {
      await api.adminUpdateWebsite(siteDraft as never);
      toast.ok('Website content saved.');
      website.reload();
    } catch (err) {
      toast.err(err instanceof Error ? err.message : 'Could not save website content.');
    } finally {
      setSaving(false);
    }
  }

  async function runSystem(key: string, fn: () => Promise<unknown>, success: string) {
    setBusy(key);
    try {
      await fn();
      toast.ok(success);
      system.reload();
    } catch (err) {
      toast.err(err instanceof Error ? err.message : 'That action failed.');
    } finally {
      setBusy(null);
    }
  }

  if (settings.loading && !draft) return <Loading label="Loading settings" />;
  if (settings.error) return <ErrorNote message={settings.error} onRetry={settings.reload} />;

  return (
    <div className="space-y-4 sm:space-y-5">
      <header>
        <h1 className="text-xl font-extrabold text-ink sm:text-2xl">Settings</h1>
        <p className="mt-1 text-sm text-muted">Store configuration, website content and system tools.</p>
      </header>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`chip shrink-0 ${tab === t.key ? 'chip-active' : ''}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'store' && draft && (
        <>
          <Panel title="Store details">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Store name"
                  value={draft.store?.name || ''}
                  onChange={(e) => setDraft({ ...draft, store: { ...draft.store, name: e.target.value } })}
                />
                <Field
                  label="Currency"
                  value={draft.store?.currency || ''}
                  onChange={(e) => setDraft({ ...draft, store: { ...draft.store, currency: e.target.value } })}
                />
                <Field
                  label="Contact email"
                  type="email"
                  value={draft.store?.email || ''}
                  onChange={(e) => setDraft({ ...draft, store: { ...draft.store, email: e.target.value } })}
                />
                <Field
                  label="Phone"
                  value={draft.store?.phone || ''}
                  onChange={(e) => setDraft({ ...draft, store: { ...draft.store, phone: e.target.value } })}
                />
              </div>
            </div>
          </Panel>

          <Panel title="Tax" subtitle="Applied at checkout">
            <div className="space-y-4">
              <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-line px-3">
                <input
                  type="checkbox"
                  checked={!!draft.tax?.enabled}
                  onChange={(e) => setDraft({ ...draft, tax: { ...draft.tax, enabled: e.target.checked } })}
                  className="h-4 w-4 shrink-0 accent-[var(--color-brand)]"
                />
                <span className="text-sm font-semibold text-ink">Charge tax</span>
              </label>
              <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-line px-3">
                <input
                  type="checkbox"
                  checked={!!draft.tax?.included}
                  onChange={(e) => setDraft({ ...draft, tax: { ...draft.tax, included: e.target.checked } })}
                  className="h-4 w-4 shrink-0 accent-[var(--color-brand)]"
                />
                <span className="text-sm font-semibold text-ink">Prices already include tax</span>
              </label>
              <Field
                label="Tax rate"
                hint="percentage"
                type="number"
                min={0}
                step="0.01"
                value={String(draft.tax?.rate ?? '')}
                onChange={(e) => setDraft({ ...draft, tax: { ...draft.tax, rate: Number(e.target.value) } })}
              />
            </div>
          </Panel>

          <Panel title="Shipping and payment">
            <div className="space-y-4">
              <Field
                label="Free shipping threshold"
                hint="0 disables it"
                type="number"
                min={0}
                step="1"
                value={String(draft.shipping?.freeShippingThreshold ?? '')}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    shipping: { ...draft.shipping, freeShippingThreshold: Number(e.target.value) },
                  })
                }
              />
              {(
                [
                  ['shipping.codEnabled', 'Cash on delivery', draft.shipping?.codEnabled, 'shipping'],
                  ['payment.cardEnabled', 'Card payments', draft.payment?.cardEnabled, 'payment'],
                  ['payment.codEnabled', 'Cash on delivery (payment)', draft.payment?.codEnabled, 'payment'],
                ] as const
              ).map(([key, label, checked, group]) => (
                <label
                  key={key}
                  className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-line px-3"
                >
                  <input
                    type="checkbox"
                    checked={!!checked}
                    onChange={(e) =>
                      setDraft({ ...draft, [group]: { ...draft[group], [key.split('.')[1]]: e.target.checked } })
                    }
                    className="h-4 w-4 shrink-0 accent-[var(--color-brand)]"
                  />
                  <span className="text-sm font-semibold text-ink">{label}</span>
                </label>
              ))}
            </div>
          </Panel>

          <div className="sticky bottom-0 -mx-3 border-t border-line bg-white/95 px-3 py-3 backdrop-blur sm:-mx-5 sm:px-5">
            <Btn busy={saving} onClick={saveSettings} className="w-full sm:w-auto">
              Save settings
            </Btn>
          </div>
        </>
      )}

      {tab === 'donation' && draft && (
        <Panel title="Donation options" subtitle="Controls the donate page">
          <div className="space-y-4">
            {(
              [
                ['enabled', 'Accept donations'],
                ['allowAnonymous', 'Allow anonymous donations'],
                ['allowMonthly', 'Allow monthly donations'],
                ['allowMessages', 'Allow donor messages'],
                ['allowCampaigns', 'Show campaign picker'],
                ['showSupporterWall', 'Show the supporter wall'],
                ['showOnHomepage', 'Feature donations on the homepage'],
                ['sendEmailReceipt', 'Email a receipt to donors'],
                ['messageApproval', 'Approve donor messages before display'],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-line px-3"
              >
                <input
                  type="checkbox"
                  checked={!!draft.donation?.[key]}
                  onChange={(e) => setDraft({ ...draft, donation: { ...draft.donation, [key]: e.target.checked } })}
                  className="h-4 w-4 shrink-0 accent-[var(--color-brand)]"
                />
                <span className="text-sm font-semibold text-ink">{label}</span>
              </label>
            ))}

            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Minimum amount"
                type="number"
                min={0}
                step="1"
                value={String(draft.donation?.minAmount ?? '')}
                onChange={(e) =>
                  setDraft({ ...draft, donation: { ...draft.donation, minAmount: Number(e.target.value) } })
                }
              />
              <Field
                label="Maximum amount"
                hint="0 for no limit"
                type="number"
                min={0}
                step="1"
                value={String(draft.donation?.maxAmount ?? '')}
                onChange={(e) =>
                  setDraft({ ...draft, donation: { ...draft.donation, maxAmount: Number(e.target.value) } })
                }
              />
            </div>

            <Field
              label="Donate page message"
              value={draft.donation?.message || ''}
              onChange={(e) => setDraft({ ...draft, donation: { ...draft.donation, message: e.target.value } })}
            />

            <div className="sticky bottom-0 -mx-3 border-t border-line bg-white/95 px-3 py-3 backdrop-blur sm:-mx-5 sm:px-5">
              <Btn busy={saving} onClick={saveSettings} className="w-full sm:w-auto">
                Save donation settings
              </Btn>
            </div>
          </div>
        </Panel>
      )}

      {tab === 'website' && (
        <>
          {website.loading && <Loading label="Loading website content" />}
          {website.error && <ErrorNote message={website.error} onRetry={website.reload} />}
          {siteDraft && (
            <>
              <Panel title="Contact details" subtitle="Shown in the footer and contact blocks">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Contact email"
                    value={String((siteDraft.contact as Record<string, string>)?.email ?? '')}
                    onChange={(e) =>
                      setSiteDraft({
                        ...siteDraft,
                        contact: { ...((siteDraft.contact as object) || {}), email: e.target.value },
                      })
                    }
                  />
                  <Field
                    label="Phone"
                    value={String((siteDraft.contact as Record<string, string>)?.phone ?? '')}
                    onChange={(e) =>
                      setSiteDraft({
                        ...siteDraft,
                        contact: { ...((siteDraft.contact as object) || {}), phone: e.target.value },
                      })
                    }
                  />
                </div>
                <Field
                  label="Address"
                  className="mt-3"
                  value={String((siteDraft.contact as Record<string, string>)?.address ?? '')}
                  onChange={(e) =>
                    setSiteDraft({
                      ...siteDraft,
                      contact: { ...((siteDraft.contact as object) || {}), address: e.target.value },
                    })
                  }
                />
              </Panel>

              <Panel title="Footer">
                <Field
                  label="Tagline"
                  value={String((siteDraft.footer as Record<string, string>)?.tagline ?? '')}
                  onChange={(e) =>
                    setSiteDraft({
                      ...siteDraft,
                      footer: { ...((siteDraft.footer as object) || {}), tagline: e.target.value },
                    })
                  }
                />
              </Panel>

              <Panel title="About page" subtitle="Markdown is not rendered, plain text only">
                <TextArea
                  rows={8}
                  value={String(siteDraft.about ?? '')}
                  onChange={(e) => setSiteDraft({ ...siteDraft, about: e.target.value })}
                />
              </Panel>

              <Panel title="Policies" subtitle="Privacy, terms, shipping and refunds">
                <div className="space-y-4">
                  {(
                    [
                      ['privacy', 'Privacy policy'],
                      ['terms', 'Terms and conditions'],
                      ['shippingPolicy', 'Shipping policy'],
                      ['refundPolicy', 'Refund policy'],
                    ] as const
                  ).map(([key, label]) => {
                    const pages = (siteDraft.pages as Record<string, string>) || {};
                    return (
                      <TextArea
                        key={key}
                        label={label}
                        rows={5}
                        value={String(pages[key] ?? '')}
                        onChange={(e) => setSiteDraft({ ...siteDraft, pages: { ...pages, [key]: e.target.value } })}
                      />
                    );
                  })}
                </div>
              </Panel>

              <div className="sticky bottom-0 -mx-3 border-t border-line bg-white/95 px-3 py-3 backdrop-blur sm:-mx-5 sm:px-5">
                <Btn busy={saving} onClick={saveWebsite} className="w-full sm:w-auto">
                  Save website content
                </Btn>
              </div>
            </>
          )}
        </>
      )}

      {tab === 'system' && (
        <>
          {system.loading && <Loading label="Loading system status" />}
          {system.error && <ErrorNote message={system.error} onRetry={system.reload} />}
          {system.data && (
            <>
              <Panel title="Status">
                <div className="flex flex-wrap gap-2">
                  <Pill tone={system.data.status.server.up ? 'success' : 'danger'}>
                    Server {system.data.status.server.up ? 'up' : 'down'}
                  </Pill>
                  <Pill tone={system.data.status.api.healthy ? 'success' : 'danger'}>
                    API {system.data.status.api.version}
                  </Pill>
                  <Pill tone={system.data.status.database.connected ? 'success' : 'danger'}>
                    Database {system.data.status.database.provider}
                  </Pill>
                </div>
                <dl className="mt-4 space-y-1.5 text-xs text-muted">
                  <div className="flex justify-between gap-3">
                    <dt>Store</dt>
                    <dd className="truncate font-bold text-ink">{system.data.info.storeName}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Database</dt>
                    <dd className="truncate font-bold text-ink">{system.data.info.databaseVersion}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Uptime</dt>
                    <dd className="font-bold text-ink">{system.data.info.uptimePretty}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Memory</dt>
                    <dd className="font-bold text-ink">{system.data.info.memoryUsageMB} MB</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Last backup</dt>
                    <dd className="font-bold text-ink">
                      {relativeTime(system.data.backup.lastBackup)}
                      {system.data.backup.auto && ' (automatic)'}
                    </dd>
                  </div>
                </dl>
              </Panel>

              <Panel title="Maintenance">
                <div className="flex flex-wrap gap-2">
                  <Btn
                    variant="outline"
                    busy={busy === 'backup'}
                    onClick={() => runSystem('backup', () => api.adminBackup(), 'Backup created.')}
                  >
                    Create backup
                  </Btn>
                  <Btn
                    variant="outline"
                    busy={busy === 'cache'}
                    onClick={() => runSystem('cache', () => api.adminClearCache(), 'Cache cleared.')}
                  >
                    Clear cache
                  </Btn>
                </div>
              </Panel>

              {system.data.logs.errors.length > 0 && (
                <Panel title="Recent errors" subtitle={`${system.data.logs.errors.length} logged`} bodyClassName="p-0">
                  <ul className="divide-y divide-line">
                    {system.data.logs.errors.slice(0, 10).map((e) => (
                      <li key={e.id} className="px-4 py-2.5 text-xs">
                        <p className="break-words font-bold text-red-700">
                          {e.status ? `[${e.status}] ` : ''}
                          {e.message || e.path}
                        </p>
                        <p className="mt-0.5 break-all text-muted">
                          {e.method} {e.path} · {relativeTime(e.at)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </Panel>
              )}
            </>
          )}
        </>
      )}

      {toast.node}
    </div>
  );
}
