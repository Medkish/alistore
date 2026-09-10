import type { AdminStats, AdminUser, Book, BooksResult, CartItem, Order, User } from '@/lib/types';

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

async function request<T>(
  path: string,
  opts: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<T> {
  const headers: Record<string, string> = { ...(opts.headers || {}) };
  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    if (typeof opts.body === 'string') {
      body = opts.body;
    } else if (typeof FormData !== 'undefined' && opts.body instanceof FormData) {
      body = opts.body;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(opts.body);
    }
  }
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const timeout = new Promise<never>((_resolve, reject) =>
    setTimeout(() => reject(new Error('The store is offline right now.')), 8000),
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

export interface BookFilters {
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export const api = {
  register: (body: { name: string; email: string; mobile: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/register', { method: 'POST', body }),
  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/login', { method: 'POST', body }),
  logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
  getConfig: () =>
    request<{ payment: { provider: string }; storage: { provider: string }; currency: string }>('/config'),
  getBooks: (filters: BookFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.q) params.set('search', filters.q);
    if (filters.category) params.set('category', filters.category);
    if (filters.minPrice != null) params.set('minPrice', String(filters.minPrice));
    if (filters.maxPrice != null) params.set('maxPrice', String(filters.maxPrice));
    if (filters.minRating != null) params.set('minRating', String(filters.minRating));
    if (filters.sort) params.set('sort', filters.sort);
    if (filters.page && filters.page > 1) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    const qs = params.toString();
    return request<BooksResult>(`/books${qs ? `?${qs}` : ''}`);
  },
  getBook: (slug: string) => request<{ book: Book }>(`/books/${slug}`),
  getCategories: () =>
    request<{ categories: { id: string; name: string; slug: string; bookCount: number }[] }>('/categories'),
  placeOrder: (items: CartItem[], shipping: { name: string; email: string; phone: string; address: string }) =>
    request<{ order: Order }>('/orders', {
      method: 'POST',
      body: { items: items.map((i) => ({ id: i.id, qty: i.qty })), shipping, paymentMethod: 'demo' },
    }),
  getOrders: () => request<{ orders: Order[] }>('/orders'),
  donate: (amount: number, method: string) =>
    request<{ reference: string; amount: number }>('/donations', { method: 'POST', body: { amount, method } }),
  subscribe: (body: { plan: string; period: string; email: string; nextBilling: string }) =>
    request<{ reference: string; plan: string; period: string; nextBilling?: string }>('/subscriptions', {
      method: 'POST',
      body,
    }),
  /* ----------------- Admin (ADMIN role only) ----------------- */
  adminStats: () => request<AdminStats>('/admin/stats'),
  adminBooks: (search?: string) =>
    request<BooksResult>(`/admin/books${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  adminCreateBook: (body: Record<string, unknown>) =>
    request<{ book: Book }>('/admin/books', { method: 'POST', body }),
  adminUpdateBook: (slug: string, body: Record<string, unknown>) =>
    request<{ book: Book }>(`/admin/books/${encodeURIComponent(slug)}`, { method: 'PUT', body }),
  adminDeleteBook: (slug: string) => request<{ ok: boolean }>(`/admin/books/${encodeURIComponent(slug)}`, { method: 'DELETE' }),
  adminOrders: (status?: string) =>
    request<{ orders: Order[]; total: number; page: number; pageSize: number; totalPages: number }>(
      `/admin/orders${status ? `?status=${status}` : ''}`,
    ),
  adminSetOrderStatus: (orderId: string, status: string) =>
    request<{ order: Order }>(`/admin/orders/${orderId}/status`, { method: 'PATCH', body: { status } }),
  adminUsers: () => request<{ users: AdminUser[] }>('/admin/users'),
  uploadCover: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return request<{ url: string; filename: string }>('/admin/upload', { method: 'POST', body: fd });
  },
};

export async function apiAvailable(): Promise<boolean> {
  try {
    await request<{ ok: boolean }>('/health', { method: 'GET' });
    return true;
  } catch {
    return false;
  }
}