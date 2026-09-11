import type { AdminStats, AdminUser, Book, BookReviews, BooksResult, CartItem, CategoryItem, CouponResult, DiscountItem, NotificationItem, Order, User } from '@/lib/types';

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
    request<{ categories: CategoryItem[] }>('/categories'),
  getBookReviews: (slug: string) => request<BookReviews>(`/books/${slug}/reviews`),
  submitReview: (slug: string, rating: number, text: string) =>
    request<{ review: { id: string; rating: number; text: string; status: string } }>(`/books/${slug}/reviews`, {
      method: 'POST',
      body: { rating, text },
    }),
  validateCoupon: (code: string, subtotal: number) =>
    request<CouponResult>(`/discounts/${encodeURIComponent(code)}/validate?subtotal=${subtotal}`),
  placeOrder: (
    items: CartItem[],
    shipping: { name: string; email: string; phone: string; address: string },
    paymentMethod = 'demo',
    coupon = '',
  ) =>
    request<{ order: Order }>('/orders', {
      method: 'POST',
      body: {
        items: items.map((i) => ({ id: i.id, qty: i.qty })),
        shipping,
        paymentMethod,
        coupon,
      },
    }),
  getOrders: () => request<{ orders: Order[] }>('/orders'),
  getNotifications: () => request<{ notifications: NotificationItem[]; unread: number }>('/me/notifications'),
  markNotificationsRead: (id?: string) =>
    request<{ notifications: NotificationItem[]; unread: number }>('/me/notifications/read', {
      method: 'POST',
      body: id ? { id } : {},
    }),
  updateProfile: (name: string, mobile: string) =>
    request<{ user: User }>('/me/profile', { method: 'PUT', body: { name, mobile } }),
  changePassword: (current: string, next: string) =>
    request<{ ok: boolean }>('/me/password', { method: 'POST', body: { current, next } }),
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
  adminCategories: () => request<{ categories: CategoryItem[] }>('/admin/categories'),
  adminCreateCategory: (name: string) =>
    request<{ category: CategoryItem }>('/admin/categories', { method: 'POST', body: { name } }),
  adminUpdateCategory: (slug: string, name: string) =>
    request<{ category: CategoryItem }>(`/admin/categories/${encodeURIComponent(slug)}`, { method: 'PUT', body: { name } }),
  adminDeleteCategory: (slug: string) =>
    request<{ ok: boolean }>(`/admin/categories/${encodeURIComponent(slug)}`, { method: 'DELETE' }),
  adminDiscounts: () => request<{ discounts: DiscountItem[] }>('/admin/discounts'),
  adminCreateDiscount: (body: { code: string; type: string; value: number; minOrder: number }) =>
    request<{ discount: DiscountItem }>('/admin/discounts', { method: 'POST', body }),
  adminUpdateDiscount: (id: string, body: Record<string, unknown>) =>
    request<{ discount: DiscountItem }>(`/admin/discounts/${id}`, { method: 'PATCH', body }),
  adminDeleteDiscount: (id: string) => request<{ ok: boolean }>(`/admin/discounts/${id}`, { method: 'DELETE' }),
  adminReviews: (status?: string) =>
    request<{ reviews: { id: string; rating: number; text: string; status: string; createdAt: string; book: { slug: string; title: string; image: string } | null; user: { id: string; name: string; email: string } | null }[]; pending: number }>(
      `/admin/reviews${status ? `?status=${status}` : ''}`,
    ),
  adminModerateReview: (id: string, status: 'APPROVED' | 'REJECTED') =>
    request<{ review: Record<string, unknown> }>(`/admin/reviews/${id}`, { method: 'PATCH', body: { status } }),
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