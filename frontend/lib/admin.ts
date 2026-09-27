'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, getToken } from '@/lib/api';
import { useAuth } from '@/components/providers';

/* ------------------------------------------------------------------ *
 * Admin access guard
 *
 * Authorisation is decided by the API, not by the cached user object.
 * The store's AuthProvider fabricates a local ADMIN user when a login
 * request fails, so a client-side role check would let anyone into the
 * chrome. Probing an admin endpoint with the real bearer token is the
 * only trustworthy test.
 *
 * The probe re-runs whenever the signed-in user changes, otherwise a
 * successful sign-in from the gate screen would leave the guard stuck
 * on "denied" until a manual reload. `nonce` lets a caller force an
 * extra re-check after writing a token itself.
 * ------------------------------------------------------------------ */
export type GuardState = 'checking' | 'ok' | 'denied';

export function useAdminGuard(nonce?: unknown): GuardState {
  const { user } = useAuth();
  const [state, setState] = useState<GuardState>('checking');

  useEffect(() => {
    let cancelled = false;

    // No bearer token means no admin session, full stop. This also rejects
    // the AuthProvider's offline fallback, which sets a user but no token.
    if (!getToken()) {
      setState('denied');
      return;
    }

    setState('checking');
    api
      .adminStats()
      .then(() => {
        if (!cancelled) setState('ok');
      })
      .catch(() => {
        if (!cancelled) setState('denied');
      });

    return () => {
      cancelled = true;
    };
  }, [user, nonce]);

  return state;
}

/* ------------------------------ status meta ------------------------------ */

export type Tone = 'neutral' | 'info' | 'success' | 'warn' | 'danger';

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-muted border-line',
  info: 'bg-brand/8 text-brand border-brand/25',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warn: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
};

export function toneClass(tone: Tone): string {
  return TONE_CLASS[tone];
}

const ORDER_TONES: Record<string, Tone> = {
  PENDING: 'warn',
  PAID: 'info',
  CONFIRMED: 'info',
  PROCESSING: 'info',
  SHIPPED: 'info',
  OUT_FOR_DELIVERY: 'info',
  DELIVERED: 'success',
  CANCELLED: 'danger',
  REFUNDED: 'neutral',
};

export function orderTone(status?: string): Tone {
  return ORDER_TONES[String(status || '').toUpperCase()] || 'neutral';
}

const PAYMENT_TONES: Record<string, Tone> = {
  PAID: 'success',
  SUCCESS: 'success',
  PENDING: 'warn',
  FAILED: 'danger',
  REFUNDED: 'neutral',
  UNPAID: 'neutral',
};

export function paymentTone(status?: string): Tone {
  return PAYMENT_TONES[String(status || '').toUpperCase()] || 'neutral';
}

export function donationTone(status?: string): Tone {
  const s = String(status || '').toUpperCase();
  if (s === 'PAID' || s === 'COMPLETED' || s === 'SUCCEEDED') return 'success';
  if (s === 'PENDING' || s === 'PENDING_PAYMENT') return 'warn';
  if (s === 'FAILED' || s === 'CANCELLED') return 'danger';
  if (s === 'REFUNDED') return 'neutral';
  return 'neutral';
}

export function humanise(value?: string | null): string {
  if (!value) return '—';
  return String(value)
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* --------------------------------- dates --------------------------------- */

export function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${formatDate(value)}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

export function relativeTime(value?: string | null): string {
  if (!value) return 'never';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return 'never';
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

export function money(n?: number | null, currency = 'AED'): string {
  const v = Number(n || 0);
  try {
    return `${currency} ${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } catch {
    return `${currency} ${v.toFixed(2)}`;
  }
}

/* -------------------------------- data hook -------------------------------- */

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  setData: (updater: T | ((prev: T | null) => T | null)) => void;
}

/**
 * Small fetch helper for admin screens. Keeps loading/error/refresh state in
 * one place so every section reports failures the same way.
 */
export function useAdminData<T>(loader: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const loaderMemo = useMemo(() => loader, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loaderMemo()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Something went wrong.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loaderMemo, nonce]);

  return {
    data,
    loading,
    error,
    reload: () => setNonce((n) => n + 1),
    setData: (updater) =>
      setData((prev) => (typeof updater === 'function' ? (updater as (p: T | null) => T | null)(prev) : updater)),
  };
}
