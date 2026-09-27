'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import type { Campaign } from '@/lib/types';
import { formatDate, humanise, money, useAdminData } from '@/lib/admin';
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

const BLANK = {
  title: '',
  slug: '',
  description: '',
  goal: '5000',
  purpose: '',
  banner: '',
  status: 'ACTIVE',
  featured: false,
  startsAt: '',
  endsAt: '',
};

type Draft = typeof BLANK;

function toDraft(c: Campaign): Draft {
  return {
    title: c.title,
    slug: c.slug,
    description: c.description || '',
    goal: String(c.goal ?? 0),
    purpose: c.purpose || '',
    banner: c.banner || '',
    status: c.status || 'ACTIVE',
    featured: !!c.featured,
    startsAt: c.startsAt ? String(c.startsAt).slice(0, 10) : '',
    endsAt: c.endsAt ? String(c.endsAt).slice(0, 10) : '',
  };
}

export default function AdminCampaignsPage() {
  const campaigns = useAdminData(() => api.adminCampaigns(), []);
  const toast = useToast();

  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Campaign | null>(null);

  const list = campaigns.data?.campaigns || [];

  async function save() {
    if (!editing) return;
    setSaving(true);
    const body = {
      title: editing.draft.title.trim(),
      slug: editing.draft.slug.trim() || undefined,
      description: editing.draft.description.trim(),
      goal: Number(editing.draft.goal) || 0,
      purpose: editing.draft.purpose.trim() || undefined,
      banner: editing.draft.banner.trim() || null,
      status: editing.draft.status,
      featured: editing.draft.featured,
      startsAt: editing.draft.startsAt || null,
      endsAt: editing.draft.endsAt || null,
    };
    try {
      if (editing.id) {
        await api.adminUpdateCampaign(editing.id, body);
        toast.ok('Campaign updated.');
      } else {
        await api.adminCreateCampaign(body);
        toast.ok('Campaign created.');
      }
      setEditing(null);
      campaigns.reload();
    } catch (err) {
      toast.err(err instanceof Error ? err.message : 'Could not save the campaign.');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirmDelete) return;
    setBusyId(confirmDelete.id);
    try {
      await api.adminDeleteCampaign(confirmDelete.id);
      toast.ok(`Deleted “${confirmDelete.title}”.`);
      setConfirmDelete(null);
      campaigns.reload();
    } catch (err) {
      toast.err(err instanceof Error ? err.message : 'Could not delete the campaign.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-ink sm:text-2xl">Campaigns</h1>
          <p className="mt-1 text-sm text-muted">Fundraising campaigns shown on the donate page.</p>
        </div>
        <Btn
          onClick={() => setEditing({ id: null, draft: { ...BLANK } })}
          className="w-full sm:w-auto"
        >
          New campaign
        </Btn>
      </header>

      {campaigns.loading && <Loading label="Loading campaigns" />}
      {campaigns.error && <ErrorNote message={campaigns.error} onRetry={campaigns.reload} />}
      {!campaigns.loading && !campaigns.error && list.length === 0 && (
        <EmptyState
          title="No campaigns yet"
          hint="Create one to let supporters fund a specific goal."
        />
      )}

      {!campaigns.loading && !campaigns.error && list.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {list.map((c) => (
            <li key={c.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-ink">{c.title}</p>
                  <p className="truncate text-xs text-muted">
                    <span className="break-all">/{c.slug}</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Pill tone={c.status === 'ACTIVE' ? 'success' : c.status === 'DRAFT' ? 'neutral' : 'warn'}>
                    {humanise(c.status)}
                  </Pill>
                  {c.featured && <Pill tone="info">Featured</Pill>}
                </div>
              </div>

              <p className="mt-2 line-clamp-2 text-xs text-muted">{c.description}</p>

              <div className="mt-3">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="font-bold tabular-nums text-ink">{money(c.raised, c.currency)}</span>
                  <span className="tabular-nums text-muted">of {money(c.goal, c.currency)}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-brand transition-all"
                    style={{ width: `${Math.min(c.fundedPercent ?? 0, 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-muted">
                  {Math.round(c.fundedPercent ?? 0)}% funded · {c.donorsCount} donor
                  {c.donorsCount === 1 ? '' : 's'}
                </p>
              </div>

              {(c.startsAt || c.endsAt) && (
                <p className="mt-2 text-[11px] text-muted">
                  {c.startsAt && `From ${formatDate(c.startsAt)}`}
                  {c.startsAt && c.endsAt && ' · '}
                  {c.endsAt && `Until ${formatDate(c.endsAt)}`}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                <Btn
                  variant="outline"
                  className="!px-3 !text-xs"
                  onClick={() => setEditing({ id: c.id, draft: toDraft(c) })}
                >
                  Edit
                </Btn>
                <Btn variant="danger" className="!px-3 !text-xs" onClick={() => setConfirmDelete(c)}>
                  Delete
                </Btn>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={!!editing}
        title={editing?.id ? 'Edit campaign' : 'New campaign'}
        onClose={() => setEditing(null)}
        wide
        footer={
          <>
            <Btn variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Btn>
            <Btn busy={saving} onClick={save}>
              {editing?.id ? 'Save changes' : 'Create campaign'}
            </Btn>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <Field
              label="Title"
              value={editing.draft.title}
              onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, title: e.target.value } })}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Slug"
                hint="optional"
                value={editing.draft.slug}
                onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, slug: e.target.value } })}
              />
              <Field
                label="Goal"
                type="number"
                min={0}
                step="1"
                value={editing.draft.goal}
                onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, goal: e.target.value } })}
              />
            </div>
            <TextArea
              label="Description"
              rows={4}
              value={editing.draft.description}
              onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, description: e.target.value } })}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Purpose"
                hint="optional"
                value={editing.draft.purpose}
                onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, purpose: e.target.value } })}
              />
              <Field
                label="Banner image URL"
                hint="optional"
                value={editing.draft.banner}
                onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, banner: e.target.value } })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Select
                label="Status"
                value={editing.draft.status}
                onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, status: e.target.value } })}
              >
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="CLOSED">Closed</option>
              </Select>
              <Field
                label="Starts"
                type="date"
                value={editing.draft.startsAt}
                onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, startsAt: e.target.value } })}
              />
              <Field
                label="Ends"
                type="date"
                value={editing.draft.endsAt}
                onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, endsAt: e.target.value } })}
              />
            </div>
            <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-line px-3">
              <input
                type="checkbox"
                checked={editing.draft.featured}
                onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, featured: e.target.checked } })}
                className="h-4 w-4 shrink-0 accent-[var(--color-brand)]"
              />
              <span className="text-sm font-semibold text-ink">Feature this campaign</span>
            </label>
          </div>
        )}
      </Modal>

      <Modal
        open={!!confirmDelete}
        title="Delete this campaign?"
        onClose={() => setConfirmDelete(null)}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setConfirmDelete(null)}>
              Keep it
            </Btn>
            <Btn variant="danger" busy={busyId === confirmDelete?.id} onClick={remove}>
              Delete permanently
            </Btn>
          </>
        }
      >
        <p className="text-sm text-ink">
          <span className="font-bold">{confirmDelete?.title}</span> will be removed. Donations already linked to it
          are kept.
        </p>
      </Modal>

      {toast.node}
    </div>
  );
}
