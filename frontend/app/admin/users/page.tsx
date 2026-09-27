'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { VALID_ROLES } from '@/lib/types';
import type { AdminUser } from '@/lib/types';
import { formatDate, humanise, money, relativeTime, useAdminData } from '@/lib/admin';
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

const STATUS_FILTERS = [
  { value: '', label: 'All accounts' },
  { value: 'active', label: 'Active' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'admin', label: 'Admins' },
];

function roleTone(role: string) {
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') return 'danger' as const;
  if (role === 'MANAGER') return 'warn' as const;
  return 'neutral' as const;
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const toast = useToast();

  const users = useAdminData(() => api.adminUsers({ search: query || undefined, status: status || undefined }), [
    query,
    status,
  ]);

  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ role: string; notes: string }>({ role: '', notes: '' });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmBlock, setConfirmBlock] = useState<{ user: AdminUser; blocked: boolean } | null>(null);

  const list = users.data?.users || [];
  const target = list.find((u) => u.id === editId) || null;

  function startEdit(u: AdminUser) {
    setEditId(u.id);
    setDraft({ role: u.role, notes: u.notes || '' });
  }

  async function run(id: string, fn: () => Promise<unknown>, success: string) {
    setBusyId(id);
    try {
      await fn();
      toast.ok(success);
      users.reload();
      return true;
    } catch (err) {
      toast.err(err instanceof Error ? err.message : 'That update failed.');
      return false;
    } finally {
      setBusyId(null);
    }
  }

  const changeRole = async () => {
    if (!target || !draft.role || draft.role === target.role) return;
    const done = await run(target.id, () => api.adminUpdateUserRole(target.id, draft.role), 'Role updated.');
    if (done) setEditId(null);
  };

  const saveNotes = async () => {
    if (!target) return;
    const done = await run(target.id, () => api.adminSetUserNotes(target.id, draft.notes), 'Notes saved.');
    if (done) setEditId(null);
  };

  const toggleBlock = async () => {
    if (!confirmBlock) return;
    const { user, blocked } = confirmBlock;
    const done = await run(
      user.id,
      () => api.adminBlockUser(user.id, blocked),
      blocked ? `${user.email} blocked.` : `${user.email} unblocked.`,
    );
    if (done) setConfirmBlock(null);
  };

  const admins = list.filter((u) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN').length;
  const blockedCount = list.filter((u) => u.blocked).length;

  return (
    <div className="space-y-4 sm:space-y-5">
      <header>
        <h1 className="text-xl font-extrabold text-ink sm:text-2xl">Customers</h1>
        <p className="mt-1 text-sm text-muted">
          {users.data ? `${users.data.users.length} account${users.data.users.length === 1 ? '' : 's'}` : 'Loading accounts'}
          {admins > 0 && ` · ${admins} admin${admins === 1 ? '' : 's'}`}
          {blockedCount > 0 && ` · ${blockedCount} blocked`}
        </p>
      </header>

      <Panel bodyClassName="p-3 sm:p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(search.trim());
          }}
          className="grid gap-3 sm:grid-cols-[1fr_auto_auto]"
        >
          <Field
            label="Search"
            placeholder="Name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select label="Type" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
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

      {users.loading && <Loading label="Loading accounts" />}
      {users.error && <ErrorNote message={users.error} onRetry={users.reload} />}
      {!users.loading && !users.error && list.length === 0 && (
        <EmptyState title="No accounts match" hint="Try a different search or filter." />
      )}

      {!users.loading && !users.error && list.length > 0 && (
        <ul className="space-y-3">
          {list.map((u) => (
            <li key={u.id} className="card p-3 sm:p-4">
              <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-2 text-sm font-bold text-white">
                    {u.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink">{u.name}</p>
                    <p className="truncate text-xs text-muted">{u.email}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Pill tone={roleTone(u.role)}>{humanise(u.role)}</Pill>
                  {u.blocked && <Pill tone="danger">Blocked</Pill>}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-line pt-3 text-xs text-muted">
                <span>
                  <span className="font-bold text-ink">{u.ordersCount}</span> order
                  {u.ordersCount === 1 ? '' : 's'}
                </span>
                {u.totalSpent ? (
                  <span>
                    Spent <span className="font-bold text-ink">{money(u.totalSpent)}</span>
                  </span>
                ) : null}
                <span>Joined {formatDate(u.createdAt)}</span>
                <span>Active {relativeTime(u.lastActive)}</span>
                {u.mobile && <span className="break-all">{u.mobile}</span>}
              </div>

              {u.notes && (
                <p className="mt-2 break-words rounded-lg bg-surface px-3 py-2 text-xs text-muted">
                  <span className="font-bold text-ink">Note:</span> {u.notes}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <Btn variant="outline" className="!px-3 !text-xs" onClick={() => startEdit(u)}>
                  Manage
                </Btn>
                <Btn
                  variant={u.blocked ? 'success' : 'danger'}
                  className="!px-3 !text-xs"
                  onClick={() => setConfirmBlock({ user: u, blocked: !u.blocked })}
                >
                  {u.blocked ? 'Unblock' : 'Block'}
                </Btn>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={!!target}
        title={target ? `Manage ${target.name}` : ''}
        onClose={() => setEditId(null)}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setEditId(null)}>
              Close
            </Btn>
            <Btn variant="outline" busy={busyId === target?.id} onClick={saveNotes}>
              Save notes
            </Btn>
            <Btn
              busy={busyId === target?.id}
              disabled={!draft.role || draft.role === target?.role}
              onClick={changeRole}
            >
              Change role
            </Btn>
          </>
        }
      >
        {target && (
          <div className="space-y-4">
            <div className="rounded-xl border border-line p-3 text-xs text-muted">
              <p>
                <span className="break-all">{target.email}</span>
                {target.mobile && <> · {target.mobile}</>}
              </p>
              <p className="mt-1">
                {target.ordersCount} order{target.ordersCount === 1 ? '' : 's'} · joined {formatDate(target.createdAt)}
              </p>
            </div>

            <Select
              label="Role"
              hint="Admins can manage the whole store"
              value={draft.role}
              onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))}
            >
              {VALID_ROLES.map((r) => (
                <option key={r} value={r}>
                  {humanise(r)}
                </option>
              ))}
            </Select>

            <TextArea
              label="Internal notes"
              hint="Only visible to staff"
              rows={4}
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            />
          </div>
        )}
      </Modal>

      <Modal
        open={!!confirmBlock}
        title={confirmBlock?.blocked ? 'Block this account?' : 'Unblock this account?'}
        onClose={() => setConfirmBlock(null)}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setConfirmBlock(null)}>
              Cancel
            </Btn>
            <Btn
              variant={confirmBlock?.blocked ? 'danger' : 'success'}
              busy={busyId === confirmBlock?.user.id}
              onClick={toggleBlock}
            >
              {confirmBlock?.blocked ? 'Block account' : 'Unblock account'}
            </Btn>
          </>
        }
      >
        <p className="text-sm text-ink">
          {confirmBlock?.blocked ? (
            <>
              <span className="font-bold">{confirmBlock.user.email}</span> will be signed out and blocked from
              signing in again.
            </>
          ) : (
            <>
              <span className="font-bold">{confirmBlock?.user.email}</span> will be able to sign in again.
            </>
          )}
        </p>
      </Modal>

      {toast.node}
    </div>
  );
}
