'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/providers';
import type { NotificationItem } from '@/lib/types';

const TYPE_ICON: Record<string, string> = {
  ORDER_CONFIRMED: '🛒',
  PAYMENT: '💳',
  SHIPPED: '🚚',
  DELIVERED: '📦',
  SECURITY: '🔐',
  REVIEW: '⭐',
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const load = useCallback(() => {
    if (!user) return;
    api
      .getNotifications()
      .then((r) => setNotifs(r.notifications))
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) {
    return (
      <section className="py-16 text-center">
        <p className="text-muted mb-6">Sign in to see your notifications.</p>
        <Link href="/login/" className="btn-flash btn-primary-flash">
          Login
        </Link>
      </section>
    );
  }

  const unread = notifs.filter((n) => !n.read).length;
  const shown = filter === 'unread' ? notifs.filter((n) => !n.read) : notifs;

  async function markOne(id: string) {
    try {
      const r = await api.markNotificationsRead(id);
      setNotifs(r.notifications);
    } catch {
      /* offline */
    }
  }

  async function markAll() {
    try {
      const r = await api.markNotificationsRead();
      setNotifs(r.notifications);
    } catch {
      /* offline */
    }
  }

  return (
    <section className="py-10 md:py-16">
      <div className="mx-auto max-w-2xl px-4">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-brand">Notifications</h1>
            <p className="text-sm text-muted mt-1">
              {unread > 0 ? `${unread} unread` : 'You are all caught up'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`btn-flash text-xs ${filter === 'all' ? 'btn-primary-flash' : 'btn-outline-flash text-brand border-brand'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`btn-flash text-xs ${filter === 'unread' ? 'btn-primary-flash' : 'btn-outline-flash text-brand border-brand'}`}
            >
              Unread {unread > 0 && `(${unread})`}
            </button>
            {unread > 0 && (
              <button onClick={markAll} className="btn-flash btn-outline-flash text-brand border-brand text-xs">
                Mark all read
              </button>
            )}
          </div>
        </div>

        {loaded && shown.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-muted">No notifications{filter === 'unread' ? ' left unread' : ''}.</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {shown.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 bg-white border rounded-2xl p-4 shadow-sm ${
                n.read ? 'border-line opacity-70' : 'border-accent/50'
              }`}
            >
              <span className="text-2xl leading-none mt-0.5">{TYPE_ICON[n.type] || '🔔'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-ink text-sm">{n.title}</p>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-accent shrink-0" />}
                </div>
                <p className="text-xs text-muted mt-0.5">{n.message}</p>
                <p className="text-[10px] text-muted mt-1">
                  {new Date(n.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
              {!n.read && (
                <button onClick={() => markOne(n.id)} className="text-[11px] font-bold text-accent-dark hover:underline shrink-0">
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}