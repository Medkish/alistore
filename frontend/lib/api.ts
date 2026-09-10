import type { CartItem, Order, User } from '@/lib/types';

const BASE = (process.env.NEXT_PUBLIC_API_BASE || '').replace(/\/$/, '');

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('alistore_token');
}

export function setToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem('alistore_token', token);
  else window.localStorage.removeItem('alistore_token');
}

async function request<T>(path: string, opts: { method?: string; body?: unknown; headers?: Record<string, string> } = {}): Promise<T> {
  const headers: Record<string, string> = { ...(opts.headers || {}) };
  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    if (typeof opts.body === 'string') {
      body = opts.body;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(opts.body);
    }
  }
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const timeout = new Promise<never>((_resolve, reject) =>
    setTimeout(() => reject(new Error('timeout')), 6000),
  );
  const fetchPromise = fetch(`${BASE}/api${path}`, { method: opts.method || 'GET', headers, body })
    .then(async (r) => {
      if (!r.ok) {
        let msg = `API error ${r.status}`;
        try {
          const j = await r.json();
          if (j && j.error) msg = j.error;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      return r.json() as Promise<T>;
    });

  return Promise.race([fetchPromise, timeout]);
}

export const api = {
  register: (body: { name: string; email: string; mobile: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/register', { method: 'POST', body }),
  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/login', { method: 'POST', body }),
  logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
  placeOrder: (items: CartItem[]) =>
    request<{ order: Order }>('/orders', { method: 'POST', body: { items } }),
  getOrders: () => request<{ orders: Order[] }>('/orders'),
  donate: (amount: number, method: string) =>
    request<{ reference: string; amount: number }>('/donations', { method: 'POST', body: { amount, method } }),
  subscribe: (body: { plan: string; period: string; email: string; nextBilling: string }) =>
    request<{ reference: string; plan: string; period: string; nextBilling?: string }>('/subscriptions', {
      method: 'POST',
      body,
    }),
};

export async function apiAvailable(): Promise<boolean> {
  try {
    await request<{ ok: boolean }>('/health', { method: 'GET' });
    return true;
  } catch {
    return false;
  }
}