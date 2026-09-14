import type {
  ActivityLogEntry, AdminCart, AdminStats, AdminUser, AnalyticsSummary, AuthEvent, Book, BookReviews, BooksResult,
  BroadcastNotification, CartItem, Campaign, CategoryItem, CouponResult, DiscountItem, DonationItem, DonationReports, DonationRefundItem,
  DonationsResult, DonationSettings, DonationSummary, DonationSupporter, DonorItem, NotificationItem, Order,
  PaymentTransaction, SessionItem, ShippingInfo, ShippingMethod, ShippingZone, ShippingProvider,
  StockLogItem, StoreSettings, SystemStatus, TeamMember, TeamRole, User, WebsiteContent
} from '@/lib/types';

const DEV_API_BASE =
  process.env.NODE_ENV === 'development' && typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:4000`
    : '';
export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || DEV_API_BASE).replace(/\/$/, '');

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
  const fetchPromise = fetch(`${API_BASE}/api${path}`, { method: opts.method || 'GET', headers, body })
    .then(async (r) => {
      if (!r.ok) {
        let msg = `API error ${r.status}`;
        try {
          const j = await r.json();
          if (j && j.error) msg = j.error;
        } catch {
          /* ignore */
        }
        if (r.status === 401 && !path.startsWith('/auth/')) {
          try {
            if (typeof window !== 'undefined') {
              window.localStorage.removeItem('alistore_token');
              window.localStorage.removeItem('alistore_user');
              window.dispatchEvent(new Event('auth:unauthorized'));
            }
          } catch {
            /* ignore */
          }
        }
        throw new Error(msg);
      }
      return r.json() as Promise<T>;
    })
    .catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      const m = msg.toLowerCase();
      if (m.includes('failed to fetch') || m.includes('networkerror') || m.includes('network request failed') || m.includes('load failed')) {
        throw new Error('Cannot reach the store server. Make sure the backend is running, then try again.');
      }
      throw err;
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

export interface AdminBookFilters {
  search?: string;
  category?: string;
  author?: string;
  isbn?: string;
  featured?: boolean;
  bestseller?: boolean;
  published?: boolean;
  sort?: string;
}

  export const api = {
  register: (body: { name: string; email: string; mobile: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/register', { method: 'POST', body }),
  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/login', { method: 'POST', body }),
  logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
  forgotPassword: (email: string) =>
    request<{ ok: boolean; demoCode?: string; message: string }>('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (email: string, code: string, password: string) =>
    request<{ ok: boolean }>('/auth/reset-password', { method: 'POST', body: { email, code, password } }),
  getConfig: () =>
    request<{ payment: { provider: string }; storage: { provider: string }; currency: string }>('/config'),
  getWebsite: () => request<{ content: WebsiteContent }>('/website'),
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
  trackOrder: (reference: string) => request<{ order: Order }>(`/track/${encodeURIComponent(reference)}`),
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
    shipping: { name: string; email: string; phone: string; address: string; city?: string; country?: string },
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
  getOrder: (id: string) => request<{ order: Order }>(`/orders/${encodeURIComponent(id)}`),
  payOrderDemo: (id: string) =>
    request<{ order: Order }>(`/orders/${encodeURIComponent(id)}/payments/demo`, { method: 'POST' }),
  getNotifications: () => request<{ notifications: NotificationItem[]; unread: number }>('/me/notifications'),
  markNotificationsRead: (id?: string) =>
    request<{ notifications: NotificationItem[]; unread: number }>('/me/notifications/read', {
      method: 'POST',
      body: id ? { id } : {},
    }),
  getMe: () => request<{ user: User }>('/me'),
  updateProfile: (name: string, mobile: string) =>
    request<{ user: User }>('/me/profile', { method: 'PUT', body: { name, mobile } }),
  changePassword: (current: string, next: string) =>
    request<{ ok: boolean }>('/me/password', { method: 'POST', body: { current, next } }),
  donate: (
    amount: number,
    method: string,
    info?: {
      name?: string;
      email?: string;
      anonymous?: boolean;
      provider?: string;
      message?: string;
      purpose?: string;
      coverFees?: boolean;
      recurring?: boolean;
      campaignId?: string;
      showOnWall?: boolean;
      country?: string;
    },
  ) =>
    request<{ id: string; donationNumber: string; amount: number; feesAmount?: number; recurring?: boolean; status: string }>('/donations', {
      method: 'POST',
      body: { amount, method, ...info },
    }),
  payDonationDemo: (id: string) =>
    request<{ donation: DonationItem }>(`/donations/${encodeURIComponent(id)}/payments/demo`, { method: 'POST' }),
  donationSettings: () => request<{ settings: DonationSettings }>('/donations/settings'),
  donationSummary: () => request<DonationSummary>('/donations/summary'),
  donationSupporters: () =>
    request<{
      recent: DonationSupporter[];
      top: DonationSupporter[];
      monthly: DonationSupporter[];
      anonymous: DonationSupporter[];
      messages: (DonationSupporter & { message: string })[];
    }>('/donations/supporters'),
  campaigns: (opts?: { all?: boolean }) =>
    opts?.all
      ? request<{ campaigns: Campaign[] }>('/campaigns?all=1')
      : request<{ campaigns: Campaign[] }>('/campaigns'),
  campaignBySlug: (slug: string) => request<{ campaign: Campaign }>(`/campaigns/${encodeURIComponent(slug)}`),
  myDonations: () => request<{ donations: DonationItem[] }>('/donations/mine'),
  getDonation: (id: string) => request<{ donation: DonationItem }>(`/donations/${encodeURIComponent(id)}`),
  getDonationReceipt: (id: string) => request<{ donation: DonationItem }>(`/donations/${encodeURIComponent(id)}/receipt`),
  updateDonationDonor: (id: string, body: { donorName?: string; donorEmail?: string; isAnonymous?: boolean; showOnWall?: boolean }) =>
    request<{ donation: DonationItem }>(`/donations/${encodeURIComponent(id)}`, { method: 'PATCH', body }),
  setDonationRecurring: (id: string, recurring: boolean) =>
    request<{ donation: DonationItem }>(`/donations/${encodeURIComponent(id)}/recurring`, { method: 'PATCH', body: { recurring } }),
  emailDonationReceipt: (id: string) =>
    request<{ ok: boolean }>(`/donations/${encodeURIComponent(id)}/receipts/email`, { method: 'POST' }),
  adminDonations: (filters: {
    status?: string;
    search?: string;
    from?: string;
    to?: string;
    minAmount?: string | number;
    maxAmount?: string | number;
    campaignId?: string;
    method?: string;
    recurring?: string | boolean;
    anonymous?: string | boolean;
    country?: string;
    page?: number;
  } = {}) => {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== 'ALL') params.set('status', filters.status);
    if (filters.search) params.set('search', filters.search);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.minAmount) params.set('minAmount', String(filters.minAmount));
    if (filters.maxAmount) params.set('maxAmount', String(filters.maxAmount));
    if (filters.campaignId) params.set('campaignId', filters.campaignId);
    if (filters.method) params.set('method', filters.method);
    if (filters.recurring !== undefined && filters.recurring !== '' && filters.recurring !== 'ALL')
      params.set('recurring', String(filters.recurring));
    if (filters.anonymous !== undefined && filters.anonymous !== '' && filters.anonymous !== 'ALL')
      params.set('anonymous', String(filters.anonymous));
    if (filters.country) params.set('country', filters.country);
    if (filters.page) params.set('page', String(filters.page));
    const qs = params.toString();
    return request<DonationsResult>(`/admin/donations${qs ? `?${qs}` : ''}`);
  },
  adminDonors: (opts: { search?: string; sort?: string } = {}) => {
    const params = new URLSearchParams();
    if (opts.search) params.set('search', opts.search);
    if (opts.sort) params.set('sort', opts.sort);
    const qs = params.toString();
    return request<{ donors: DonorItem[] }>(`/admin/donations/donors${qs ? `?${qs}` : ''}`);
  },
  adminDonationReports: () => request<DonationReports>('/admin/donations/reports'),
  adminDonationRefunds: () => request<{ refunds: DonationRefundItem[] }>('/admin/donations/refunds'),
  adminDonationMessage: (donationNumber: string, messageStatus: string) =>
    request<{ donation: DonationItem }>(`/admin/donations/${encodeURIComponent(donationNumber)}/message`, {
      method: 'PATCH',
      body: { messageStatus },
    }),
  adminRefundDonation: (donationNumber: string, reason?: string) =>
    request<{ donation: DonationItem }>(`/donations/${encodeURIComponent(donationNumber)}/refund`, {
      method: 'PATCH',
      body: { reason },
    }),
  adminCampaigns: () => request<{ campaigns: Campaign[] }>('/admin/campaigns'),
  adminCreateCampaign: (body: Record<string, unknown>) =>
    request<{ campaign: Campaign }>('/admin/campaigns', { method: 'POST', body }),
  adminUpdateCampaign: (id: string, body: Record<string, unknown>) =>
    request<{ campaign: Campaign }>(`/admin/campaigns/${encodeURIComponent(id)}`, { method: 'PUT', body }),
  adminDeleteCampaign: (id: string) => request<{ ok: boolean }>(`/admin/campaigns/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  subscribe: (body: { plan: string; period: string; email: string; nextBilling: string }) =>
    request<{ reference: string; plan: string; period: string; nextBilling?: string }>('/subscriptions', {
      method: 'POST',
      body,
    }),
  /* ----------------- Admin (ADMIN role only) ----------------- */
  adminStats: () => request<AdminStats>('/admin/stats'),
  adminBooks: (filters: AdminBookFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.category) params.set('category', filters.category);
    if (filters.author) params.set('author', filters.author);
    if (filters.isbn) params.set('isbn', filters.isbn);
    if (filters.featured != null) params.set('featured', String(filters.featured));
    if (filters.bestseller != null) params.set('bestseller', String(filters.bestseller));
    if (filters.published != null) params.set('published', String(filters.published));
    if (filters.sort) params.set('sort', filters.sort);
    const qs = params.toString();
    return request<BooksResult>(`/admin/books${qs ? `?${qs}` : ''}`);
  },
  adminCreateBook: (body: Record<string, unknown>) =>
    request<{ book: Book }>('/admin/books', { method: 'POST', body }),
  adminUpdateBook: (slug: string, body: Record<string, unknown>) =>
    request<{ book: Book }>(`/admin/books/${encodeURIComponent(slug)}`, { method: 'PUT', body }),
  adminDeleteBook: (slug: string) => request<{ ok: boolean }>(`/admin/books/${encodeURIComponent(slug)}`, { method: 'DELETE' }),
  adminOrders: (options?: { status?: string; fresh?: boolean; search?: string; page?: number; pageSize?: number }) => {
    const params = new URLSearchParams();
    if (options?.status) params.set('status', options.status);
    if (options?.fresh) params.set('fresh', 'true');
    if (options?.search) params.set('search', options.search);
    if (options?.page && options.page > 1) params.set('page', String(options.page));
    if (options?.pageSize) params.set('pageSize', String(options.pageSize));
    const qs = params.toString();
    return request<{ orders: Order[]; total: number; page: number; pageSize: number; totalPages: number }>(
      `/admin/orders${qs ? `?${qs}` : ''}`,
    );
  },
  adminSetOrderStatus: (orderId: string, status: string, note?: string) =>
    request<{ order: Order }>(`/admin/orders/${orderId}/status`, { method: 'PATCH', body: { status, note } }),
  adminSetOrderTracking: (orderId: string, body: { trackingNumber?: string; trackingProvider?: string; estimatedDelivery?: string }) =>
    request<{ order: Order }>(`/admin/orders/${orderId}/tracking`, { method: 'PATCH', body }),
  adminSetOrderNotes: (orderId: string, notes: string) =>
    request<{ order: Order }>(`/admin/orders/${orderId}/notes`, { method: 'PATCH', body: { notes } }),
  adminRefundOrder: (orderId: string, note?: string) =>
    request<{ order: Order }>(`/admin/orders/${orderId}/refund`, { method: 'POST', body: { note } }),
  adminUsers: (options?: { search?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (options?.search) params.set('search', options.search);
    if (options?.status) params.set('status', options.status);
    const qs = params.toString();
    return request<{ users: AdminUser[] }>(`/admin/users${qs ? `?${qs}` : ''}`);
  },
  adminBlockUser: (userId: string, blocked: boolean) =>
    request<{ ok: boolean; blocked: boolean }>(`/admin/users/${encodeURIComponent(userId)}/block`, { method: 'PATCH', body: { blocked } }),
  adminSetUserNotes: (userId: string, notes: string) =>
    request<{ ok: boolean; notes: string }>(`/admin/users/${encodeURIComponent(userId)}/notes`, { method: 'PATCH', body: { notes } }),
  adminAdjustStock: (slug: string, qty: number, reason: string) =>
    request<{ slug: string; stock: number; change: number }>('/admin/inventory/adjust', { method: 'POST', body: { slug, qty, reason } }),
  adminStockHistory: (limit = 50) =>
    request<{ logs: StockLogItem[] }>(`/admin/inventory/history?limit=${limit}`),
adminCarts: () =>
      request<{ carts: AdminCart[]; total: number; activeCount: number; abandonedCount: number; totalValue: number }>('/admin/carts'),
    adminPayments: () =>
      request<{ summary: { successful: number; pending: number; failed: number; refunded: number; unpaid: number; total: number; totalAmount: number; successfulAmount: number }; transactions: PaymentTransaction[] }>(
        '/admin/payments',
      ),
    adminAnalytics: (days = 14) => request<AnalyticsSummary>(`/admin/analytics?days=${days}`),
  adminCategories: () => request<{ categories: CategoryItem[] }>('/admin/categories'),
  adminCreateCategory: (body: { name: string; slug?: string; description?: string; image?: string; active?: boolean }) =>
    request<{ category: CategoryItem }>('/admin/categories', { method: 'POST', body }),
  adminUpdateCategory: (slug: string, body: { name: string; slug?: string; description?: string; image?: string; active?: boolean }) =>
    request<{ category: CategoryItem }>(`/admin/categories/${encodeURIComponent(slug)}`, { method: 'PUT', body }),
  adminToggleCategory: (slug: string, active?: boolean) =>
    request<{ category: CategoryItem }>(`/admin/categories/${encodeURIComponent(slug)}/toggle`, { method: 'PATCH', body: { active } }),
  adminDeleteCategory: (slug: string) =>
    request<{ ok: boolean }>(`/admin/categories/${encodeURIComponent(slug)}`, { method: 'DELETE' }),
  adminDiscounts: () => request<{ discounts: DiscountItem[] }>('/admin/discounts'),
  adminCreateDiscount: (body: { code: string; type: string; value: number; minOrder: number; maxUses?: number; expiresAt?: string }) =>
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
  adminDeleteReview: (id: string) => request<{ ok: boolean }>(`/admin/reviews/${id}`, { method: 'DELETE' }),
  adminShipping: () => request<ShippingInfo>('/admin/shipping'),
  adminCreateShippingMethod: (body: Partial<ShippingMethod>) => request<{ method: ShippingMethod }>('/admin/shipping/methods', { method: 'POST', body }),
  adminUpdateShippingMethod: (id: string, body: Partial<ShippingMethod>) => request<{ method: ShippingMethod }>(`/admin/shipping/methods/${id}`, { method: 'PUT', body }),
  adminDeleteShippingMethod: (id: string) => request<{ ok: boolean }>(`/admin/shipping/methods/${id}`, { method: 'DELETE' }),
  adminCreateShippingZone: (body: { name: string; countries: string[]; enabled: boolean }) => request<{ zone: ShippingZone }>('/admin/shipping/zones', { method: 'POST', body }),
  adminUpdateShippingZone: (id: string, body: Partial<ShippingZone>) => request<{ zone: ShippingZone }>(`/admin/shipping/zones/${id}`, { method: 'PUT', body }),
  adminDeleteShippingZone: (id: string) => request<{ ok: boolean }>(`/admin/shipping/zones/${id}`, { method: 'DELETE' }),
  adminSetShippingProvider: (id: string, body: { enabled?: boolean; weightLimitKg?: number }) => request<{ provider: ShippingProvider }>(`/admin/shipping/providers/${id}`, { method: 'PATCH', body }),
  adminWebsite: () => request<{ content: WebsiteContent }>('/admin/website'),
  adminUpdateWebsite: (body: Partial<WebsiteContent>) => request<{ content: WebsiteContent }>('/admin/website', { method: 'PUT', body }),
  adminNotifications: () => request<{ broadcasts: BroadcastNotification[]; totals: { total: number; enabled: number; sent: number; byCategory?: Record<string, number> } }>('/admin/notifications'),
  adminCreateNotification: (body: { audience: string; type: string; category?: string; priority?: string; title: string; message: string; send?: boolean }) => request<{ notification: BroadcastNotification }>('/admin/notifications', { method: 'POST', body }),
  adminUpdateNotification: (id: string, body: Partial<BroadcastNotification>) => request<{ notification: BroadcastNotification }>(`/admin/notifications/${id}`, { method: 'PATCH', body }),
  adminDeleteNotification: (id: string) => request<{ ok: boolean }>(`/admin/notifications/${id}`, { method: 'DELETE' }),
  adminTeam: () => request<{ users: TeamMember[]; roles: TeamRole[]; activityLogs: ActivityLogEntry[] }>('/admin/team'),
  adminCreateTeam: (body: { name: string; email: string; role: string; active?: boolean; permissions?: Record<string, boolean> }) => request<{ user: TeamMember }>('/admin/team', { method: 'POST', body }),
  adminUpdateTeam: (id: string, body: Partial<TeamMember>) => request<{ user: TeamMember }>(`/admin/team/${id}`, { method: 'PUT', body }),
  adminDeleteTeam: (id: string) => request<{ ok: boolean }>(`/admin/team/${id}`, { method: 'DELETE' }),
  adminSettings: () => request<{ settings: StoreSettings }>('/admin/settings'),
  adminUpdateSettings: (body: Partial<StoreSettings>) => request<{ settings: StoreSettings }>('/admin/settings', { method: 'PUT', body }),
  adminSystem: () => request<SystemStatus>('/admin/system'),
  adminBackup: () => request<{ backup: { id: string; at: string; sizeMB: number; status: string; entries: number } }>('/admin/system/backup', { method: 'POST' }),
  adminClearCache: () => request<{ ok: boolean; clearedAt: string }>('/admin/system/cache/clear', { method: 'POST' }),
  uploadCover: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return request<{ url: string; filename: string }>('/admin/upload', { method: 'POST', body: fd });
  },
  adminActivity: () =>
    request<{ events: AuthEvent[] }>('/admin/activity'),
  adminSessions: () =>
    request<{ sessions: SessionItem[] }>('/admin/sessions'),
  adminRevokeSession: (sessionId: string) =>
    request<{ ok: boolean }>(`/admin/sessions/${encodeURIComponent(sessionId)}/revoke`, { method: 'POST' }),
  adminUpdateUserRole: (userId: string, role: string) =>
    request<{ user: AdminUser }>(`/admin/users/${encodeURIComponent(userId)}/role`, { method: 'PATCH', body: { role } }),
};

export async function apiAvailable(): Promise<boolean> {
  try {
    await request<{ ok: boolean }>('/health', { method: 'GET' });
    return true;
  } catch {
    return false;
  }
}