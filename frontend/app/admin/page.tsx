'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import DonationsTab from '@/components/DonationsTab';
import { useAuth } from '@/components/providers';
import { formatAED, formatNumber } from '@/lib/format';
import {
  ORDER_STATUSES,
  ORDER_TRANSITIONS,
  ROLE_SPECS,
  TRACK_LABELS,
  VALID_ROLES,
  type ActivityLogEntry,
  type AdminCart,
  type AdminRole,
  type AdminStats,
  type AdminUser,
  type AnalyticsSummary,
  type AuthEvent,
  type Book,
  type BroadcastNotification,
  type CategoryItem,
  type DiscountItem,
  type HomepageContent,
  type HomepageSection,
  type HomepageSectionKey,
  type Order,
  type OrderStatus,
  type PaymentTransaction,
  type SessionItem,
  type ShippingInfo,
  type ShippingMethod,
  type ShippingProvider,
  type ShippingZone,
  type StockLogItem,
  type StoreSettings,
  type SystemStatus,
  type TeamMember,
  type TeamRole,
  type User,
  type WebsiteContent,
} from '@/lib/types';

type Tab =
  | 'overview'
  | 'analytics'
  | 'books'
  | 'categories'
  | 'inventory'
  | 'orders'
  | 'users'
  | 'payments'
  | 'donations'
  | 'shipping'
  | 'discounts'
  | 'reviews'
  | 'carts'
  | 'reports'
  | 'notifications'
  | 'website'
  | 'admin-users'
  | 'settings'
  | 'system'
  | 'account';

const TABS: Tab[] = [
  'overview',
  'analytics',
  'books',
  'categories',
  'inventory',
  'orders',
  'users',
  'payments',
  'donations',
  'shipping',
  'discounts',
  'reviews',
  'carts',
  'reports',
  'notifications',
  'website',
  'admin-users',
  'settings',
  'system',
  'account',
];

const TAB_LABELS: Record<Tab, string> = {
  overview: 'Dashboard',
  analytics: 'Analytics',
  books: 'Books',
  categories: 'Categories',
  inventory: 'Inventory',
  orders: 'Orders',
  users: 'Customers',
  payments: 'Payments',
  donations: 'Donations',
  shipping: 'Shipping',
  discounts: 'Coupons',
  reviews: 'Reviews',
  carts: 'Carts',
  reports: 'Reports',
  notifications: 'Notifications',
  website: 'Website',
  'admin-users': 'Admin Users',
  settings: 'Settings',
  system: 'Tools',
  account: 'Account',
};

interface BookRow extends Book {}

const EMPTY_FORM = {
  title: '',
  slug: '',
  author: '',
  publisher: '',
  isbn: '',
  language: '',
  edition: '',
  format: '',
  pages: '',
  rating: '',
  price: '',
  prevPrice: '',
  stock: '',
  description: '',
  coverImage: '',
  category: 'programming',
  featured: false,
  bestseller: false,
  published: true,
};

const BOOK_SORTS: { value: string; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'title', label: 'Title A → Z' },
  { value: 'price-asc', label: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High → Low' },
  { value: 'rating-desc', label: 'Rating: High → Low' },
];

function stockBadge(stock: number | undefined) {
  if (stock === 0) return <span className="text-xs font-bold text-red-600">🔴 Out of Stock</span>;
  if ((stock ?? 0) <= 10) return <span className="text-xs font-bold text-amber-600">🟡 Low Stock · {stock}</span>;
  return <span className="text-xs font-bold text-green-700">🟢 In Stock · {stock}</span>;
}

function Stars({ n, size = 'text-sm' }: { n: number; size?: string }) {
  return (
    <span className={`${size} text-amber-500`}>
      {[1, 2, 3, 4, 5].map((i) => (i <= Math.round(n) ? '★' : '☆'))}
    </span>
  );
}

export default function AdminPage() {
  const { user, login, logout } = useAuth();
  const [session, setSession] = useState(user);
  const [tab, setTab] = useState<Tab>('overview');
  const [gateMode, setGateMode] = useState<'login' | 'forgot'>('login');

  useEffect(() => setSession(user), [user]);

  if (!session || session.role !== 'ADMIN') {
    return (
      <section className="py-16 max-w-sm mx-auto px-4 text-center">
        <h1 className="text-2xl font-extrabold text-brand mb-2">Admin Access Only</h1>
        <p className="text-sm text-muted mb-6">Sign in with an administrator account to manage the store.</p>
        {session ? (
          <Link href="/login/" className="btn-flash btn-primary-flash">
            Switch Account
          </Link>
        ) : gateMode === 'login' ? (
          <form
            className="bg-white border border-line rounded-2xl p-6 text-left shadow-sm"
            onSubmit={async (e) => {
              e.preventDefault();
              const email = (document.getElementById('admin-email') as HTMLInputElement).value;
              const password = (document.getElementById('admin-password') as HTMLInputElement).value;
              const u = await login(email, password);
              setSession(u);
            }}
          >
            <label className="block text-sm mb-3">
              <span className="font-semibold">Email</span>
              <input
                id="admin-email"
                type="email"
                defaultValue="admin@aliostore.com"
                className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none"
              />
            </label>
            <label className="block text-sm mb-4">
              <span className="font-semibold">Password</span>
              <input
                id="admin-password"
                type="password"
                placeholder="••••••••"
                className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none"
              />
            </label>
            <button className="btn-flash btn-primary-flash w-full">Sign in as Admin</button>
            <p className="text-xs text-muted mt-3 text-center">Demo: admin@aliostore.com / admin123</p>
            <button
              type="button"
              onClick={() => setGateMode('forgot')}
              className="text-xs font-semibold text-accent-dark hover:underline mt-3 w-full text-center"
            >
              Forgot password?
            </button>
          </form>
        ) : (
          <AdminGateReset onBack={() => setGateMode('login')} />
        )}
      </section>
    );
  }

  return (
    <section className="py-10 md:py-14">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-brand">Admin Dashboard</h1>
            <p className="text-sm text-muted">Manage books, inventory, categories, coupons, reviews, orders, customers and reports.</p>
          </div>
          <span className="bg-brand text-accent text-xs font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wide">
            Alio
          </span>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition ${
                tab === t ? 'bg-brand text-white' : 'bg-white border border-line text-ink hover:border-brand'
              }`}
            >
              {TAB_LABELS[t] || t}
            </button>
          ))}
        </div>

        {tab === 'overview' && <Overview onGo={setTab} />}
        {tab === 'analytics' && <AnalyticsTab />}
        {tab === 'books' && <BooksTab onGoInventory={() => setTab('inventory')} />}
        {tab === 'categories' && <CategoriesTab />}
        {tab === 'inventory' && <InventoryTab />}
        {tab === 'orders' && <OrdersTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'payments' && <PaymentsTab />}
        {tab === 'donations' && <DonationsTab />}
        {tab === 'shipping' && <ShippingTab />}
        {tab === 'discounts' && <DiscountsTab />}
        {tab === 'reviews' && <ReviewsTab />}
        {tab === 'carts' && <CartsTab />}
        {tab === 'reports' && <ReportsTab />}
        {tab === 'notifications' && <NotificationsTab />}
        {tab === 'website' && <WebsiteTab />}
        {tab === 'admin-users' && <AdminUsersTab />}
        {tab === 'settings' && <SettingsTab />}
        {tab === 'system' && <SystemTab />}
        {tab === 'account' && <AccountTab currentUser={session} onLogout={logout} />}
      </div>
    </section>
  );
}

function AdminGateReset({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<'forgot' | 'reset' | 'done'>('forgot');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [demoCode, setDemoCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestCode() {
    setMsg(null);
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setMsg({ ok: false, text: 'Enter a valid email address.' });
      return;
    }
    setBusy(true);
    try {
      const res = await api.forgotPassword(email);
      setDemoCode(res.demoCode || '');
      setMsg({ ok: true, text: res.demoCode ? `Reset code (demo): ${res.demoCode}` : res.message });
    } catch {
      const demo = String(Math.floor(100000 + Math.random() * 900000));
      setDemoCode(demo);
      setMsg({ ok: true, text: `Offline demo — reset code: ${demo}` });
    }
    setStep('reset');
    setBusy(false);
  }

  async function doReset() {
    setMsg(null);
    if (password.length < 6) {
      setMsg({ ok: false, text: 'New password must be at least 6 characters.' });
      return;
    }
    if (password !== confirm) {
      setMsg({ ok: false, text: 'Passwords do not match.' });
      return;
    }
    setBusy(true);
    try {
      await api.resetPassword(email, code || demoCode, password);
      setMsg({ ok: true, text: 'Password reset. You can now sign in with your new password.' });
    } catch {
      setMsg({ ok: true, text: 'Password reset (offline demo). You can now sign in.' });
    }
    setStep('done');
    setBusy(false);
  }

  if (step === 'done') {
    return (
      <div className="bg-white border border-line rounded-2xl p-6 text-left shadow-sm">
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl p-3">
          {msg?.text || 'Password reset.'}
        </p>
        <button onClick={onBack} className="btn-flash btn-primary-flash w-full mt-4">
          Back to Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-line rounded-2xl p-6 text-left shadow-sm">
      <h2 className="font-bold text-ink mb-1">{step === 'forgot' ? 'Forgot Password' : 'Reset Password'}</h2>
      <p className="text-xs text-muted mb-4">
        {step === 'forgot'
          ? 'Enter the email for your admin account and we will generate a one-time reset code.'
          : 'Enter the reset code and choose a new password.'}
      </p>
      {msg && <p className={`text-sm mb-3 ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>}

      {step === 'forgot' ? (
        <div className="flex flex-col gap-3">
          <label className="block text-sm">
            <span className="font-semibold">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@aliostore.com"
              className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none"
            />
          </label>
          <button onClick={requestCode} disabled={busy} className="btn-flash btn-primary-flash w-full disabled:opacity-60">
            {busy ? 'Generating…' : 'Request Reset Code'}
          </button>
          <button onClick={onBack} className="text-xs font-semibold text-accent-dark hover:underline w-full text-center">
            ← Back to sign in
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <label className="block text-sm">
            <span className="font-semibold">Reset Code</span>
            <input
              value={code || demoCode}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 tracking-widest focus:border-brand focus:outline-none"
            />
          </label>
          <label className="block text-sm">
            <span className="font-semibold">New Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none"
            />
          </label>
          <label className="block text-sm">
            <span className="font-semibold">Confirm Password</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none"
            />
          </label>
          <button onClick={doReset} disabled={busy} className="btn-flash btn-primary-flash w-full disabled:opacity-60">
            {busy ? 'Resetting…' : 'Reset Password'}
          </button>
          <button onClick={() => { setStep('forgot'); setMsg(null); }} className="text-xs font-semibold text-accent-dark hover:underline w-full text-center">
            ← Back
          </button>
        </div>
      )}
    </div>
  );
}

/* --------------------- Overview --------------------- */

const QUICK_ACTIONS: { label: string; hint: string; tab: Tab; icon: string }[] = [
  { label: 'Add a Book', hint: 'Create a new title', tab: 'books', icon: '📚' },
  { label: 'Manage Inventory', hint: 'Adjust stock & prices', tab: 'inventory', icon: '📦' },
  { label: 'View Orders', hint: 'Fulfil & ship orders', tab: 'orders', icon: '🧾' },
  { label: 'Categories', hint: 'Organise the catalogue', tab: 'categories', icon: '🗂️' },
  { label: 'Coupons', hint: 'Create discounts', tab: 'discounts', icon: '🏷️' },
  { label: 'Moderate Reviews', hint: 'Approve customer feedback', tab: 'reviews', icon: '⭐' },
  { label: 'Customers', hint: 'Browse registered users', tab: 'users', icon: '👥' },
  { label: 'Reports', hint: 'Sales & performance', tab: 'reports', icon: '📈' },
];

function Overview({ onGo }: { onGo: (t: Tab) => void }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [books, setBooks] = useState<BookRow[] | null>(null);
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.adminStats(), api.adminOrders({ pageSize: 1000 }), api.adminBooks(), api.adminUsers()])
      .then(([s, o, b, u]) => {
        setStats(s);
        setOrders(o.orders);
        setBooks(b.books);
        setUsers(u.users);
      })
      .catch((e) => setError((e as Error).message));
  }, []);

  if (error) return <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">{error}</p>;

  const totalOrders = orders?.length || 0;
  const paid = (orders || []).filter((o) => !['CANCELLED', 'PENDING'].includes(o.status || ''));
  const revenue = stats?.revenue ?? paid.reduce((s, o) => s + o.total, 0);
  const avgOrder = paid.length ? revenue / paid.length : 0;

  const lowStock = (books || []).filter((b) => (b.stock ?? 0) <= 10);

  const recentUsers = (users || []).slice(0, 5);

  const days: { label: string; sum: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toDateString();
    const sum = paid
      .filter((o) => o.placedAt && new Date(o.placedAt).toDateString() === key)
      .reduce((s, o) => s + o.total, 0);
    days.push({ label: d.toLocaleDateString('en-US', { weekday: 'short' }), sum: Math.round(sum) });
  }
  const maxDay = Math.max(1, ...days.map((d) => d.sum));

  const statusCounts = ORDER_STATUSES.map((s) => ({
    status: s,
    count: (orders || []).filter((o) => o.status === s).length,
  }));

  const summary = [
    { label: 'Total Orders', value: formatNumber(totalOrders), icon: '🧾', tone: 'text-brand' },
    { label: 'Revenue', value: formatAED(revenue), icon: '💰', tone: 'text-accent-dark' },
    { label: 'Avg Order', value: avgOrder ? formatAED(avgOrder) : '—', icon: '📊', tone: 'text-brand' },
    { label: 'Total Books', value: books ? formatNumber(books.length) : '…', icon: '📚', tone: 'text-brand' },
    { label: 'Customers', value: users ? formatNumber(users.length) : '…', icon: '👥', tone: 'text-brand' },
    { label: 'Low Stock', value: books ? formatNumber(lowStock.length) : '…', icon: '⚠️', tone: 'text-red-600' },
  ];

  const statusTone: Record<string, string> = {
    PENDING: 'bg-slate-400',
    PAID: 'bg-green-500',
    SHIPPED: 'bg-blue-500',
    DELIVERED: 'bg-emerald-500',
    CANCELLED: 'bg-red-500',
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Sales Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {summary.map((c) => (
          <div key={c.label} className="bg-white border border-line rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-muted font-semibold uppercase tracking-wide">{c.label}</p>
            <p className={`text-xl md:text-2xl font-extrabold mt-1.5 ${c.tone}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Revenue Overview + Order Status Summary */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-ink">Revenue Overview</h2>
            <span className="text-xs font-bold text-accent-dark uppercase tracking-wide">Last 7 days</span>
          </div>
          {orders === null ? (
            <p className="text-sm text-muted">Loading charts…</p>
          ) : (
            <div className="flex items-end gap-3 h-44 mt-4">
              {days.map((d) => (
                <div key={d.label} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <span className="text-[10px] text-muted">{d.sum > 0 ? formatAED(d.sum) : ''}</span>
                  <div
                    className="w-full max-w-[44px] rounded-t-md bg-gradient-to-t from-accent to-accent-dark transition-all"
                    style={{ height: `${Math.max(4, (d.sum / maxDay) * 100)}%` }}
                  />
                  <span className="text-[10px] text-muted font-bold">{d.label}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted mt-4">Based on orders in paid states (PAID / SHIPPED / DELIVERED).</p>
        </div>

        <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-ink">Order Status Summary</h2>
            <button onClick={() => onGo('orders')} className="text-xs font-bold text-accent-dark hover:underline">
              View all →
            </button>
          </div>
          <div className="flex flex-col gap-4">
            {statusCounts.map((s) => {
              const pct = totalOrders ? Math.round(((s.count || 0) / totalOrders) * 100) : 0;
              return (
                <div key={s.status}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-bold text-ink">{s.status}</span>
                    <span className="text-muted">
                      {s.count} · {pct}%
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${statusTone[s.status] || 'bg-brand'}`}
                      style={{ width: `${Math.max(s.count ? 4 : 0, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {orders !== null && totalOrders === 0 && <p className="text-sm text-muted">No orders yet.</p>}
          </div>
        </div>
      </div>

      {/* Low Stock Alerts + Recent Orders */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white border border-red-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-ink">Low Stock Alerts</h2>
            <span className="text-xs font-extrabold text-red-600 bg-red-50 border border-red-200 rounded-full px-3 py-1">
              {books ? lowStock.length : '…'} {lowStock.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          {books === null ? (
            <p className="text-sm text-muted">Loading inventory…</p>
          ) : lowStock.length === 0 ? (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl p-4">
              ✅ No low stock items. All books are sufficiently stocked.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {lowStock.slice(0, 5).map((b) => {
                const slug = b.slug || b.id;
                const stock = b.stock ?? 0;
                return (
                  <div key={slug} className="flex items-center gap-3 border-b border-line last:border-0 pb-2">
                    <Image src={b.image} alt={b.title} width={32} height={43} className="object-contain rounded" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{b.title}</p>
                      <p className="text-xs text-muted truncate">{b.author}</p>
                    </div>
                    {stock === 0 ? (
                      <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1 shrink-0">
                        🔴 Out of Stock
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 shrink-0">
                        🟡 {stock} left
                      </span>
                    )}
                  </div>
                );
              })}
              {lowStock.length > 5 && (
                <button onClick={() => onGo('inventory')} className="text-xs font-bold text-brand hover:underline self-start">
                  + {lowStock.length - 5} more · manage inventory →
                </button>
              )}
            </div>
          )}
        </div>

        <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-ink">Recent Orders</h2>
            <button onClick={() => onGo('orders')} className="text-xs font-bold text-accent-dark hover:underline">
              View all →
            </button>
          </div>
          {stats && stats.recentOrders.length ? (
            <div className="flex flex-col gap-3">
              {stats.recentOrders.map((o) => {
                const badge =
                  'text-xs font-bold px-2.5 py-1 rounded-lg border ' +
                  (o.status === 'DELIVERED'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : o.status === 'CANCELLED'
                      ? 'bg-red-50 text-red-600 border-red-300'
                      : o.status === 'SHIPPED'
                        ? 'bg-blue-50 text-blue-700 border-blue-300'
                        : 'bg-green-50 text-green-700 border-green-300');
                return (
                  <div key={o.id} className="flex flex-wrap justify-between items-center gap-2 text-sm border-b border-line last:border-0 pb-3">
                    <div>
                      <p className="font-bold text-ink">{o.reference}</p>
                      <p className="text-xs text-muted">
                        {o.user?.name || o.contact?.name || 'Guest'} · {o.items.length} item(s)
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={badge}>{o.status}</span>
                      <span className="font-extrabold text-brand">{formatAED(o.total)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted">
              {stats ? 'No paid orders yet.' : 'Connect the database to see orders.'}
            </p>
          )}
        </div>
      </div>

      {/* Recent Customers */}
      <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-ink">Recent Customers</h2>
          <button onClick={() => onGo('users')} className="text-xs font-bold text-accent-dark hover:underline">
            View all →
          </button>
        </div>
        {users === null ? (
          <p className="text-sm text-muted">Loading customers…</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted">No customers yet.</p>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-3">
            {recentUsers.map((u) => (
              <div key={u.id} className="border border-line rounded-xl p-3">
                <p className="font-bold text-sm text-ink truncate">{u.name}</p>
                <p className="text-xs text-muted truncate">{u.email}</p>
                <p className="text-[11px] text-muted mt-1.5">
                  {formatNumber(u.ordersCount)} order{u.ordersCount === 1 ? '' : 's'} · joined {new Date(u.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
        <h2 className="font-bold text-ink mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map((a) => (
            <button
              key={a.tab}
              onClick={() => onGo(a.tab)}
              className="flex items-start gap-3 border border-line rounded-xl p-4 text-left hover:border-brand hover:shadow-sm transition group"
            >
              <span className="text-xl">{a.icon}</span>
              <span className="min-w-0">
                <span className="block font-bold text-sm text-ink group-hover:text-brand transition">
                  {a.label}
                </span>
                <span className="block text-xs text-muted mt-0.5">{a.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* --------------------- Books --------------------- */

function BooksTab({ onGoInventory }: { onGoInventory?: () => void }) {
  const [books, setBooks] = useState<BookRow[] | null>(null);
  const [cats, setCats] = useState<CategoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<{ category: string; author: string; featured: string; bestseller: string; published: string }>({
    category: '',
    author: '',
    featured: '',
    bestseller: '',
    published: '',
  });
  const [sort, setSort] = useState('newest');
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [openId, setOpenId] = useState('');

  const load = useCallback(() => {
    api
      .adminBooks({
        search: search.trim() || undefined,
        category: filters.category || undefined,
        author: filters.author || undefined,
        featured: filters.featured ? filters.featured === 'true' : undefined,
        bestseller: filters.bestseller ? filters.bestseller === 'true' : undefined,
        published: filters.published ? filters.published === 'true' : undefined,
        sort: sort || undefined,
      })
      .then((res) => setBooks(res.books))
      .catch((e) => setError((e as Error).message));
  }, [search, filters, sort]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    api
      .adminCategories()
      .then((res) => setCats(res.categories))
      .catch(() => undefined);
  }, []);

  function set(field: keyof typeof EMPTY_FORM, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function onUploadCover(file: File) {
    try {
      const res = await api.uploadCover(file);
      set('coverImage', res.url);
    } catch (e) {
      setError('Upload failed: ' + (e as Error).message);
    }
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: form.title,
        slug: form.slug || undefined,
        author: form.author,
        publisher: form.publisher || undefined,
        isbn: form.isbn || undefined,
        language: form.language || undefined,
        edition: form.edition || undefined,
        format: form.format || undefined,
        pages: form.pages !== '' ? Number(form.pages) : undefined,
        rating: form.rating !== '' ? Number(form.rating) : undefined,
        price: Number(form.price),
        prevPrice: form.prevPrice ? Number(form.prevPrice) : null,
        stock: Number(form.stock),
        description: form.description,
        coverImage: form.coverImage,
        category: form.category,
        featured: form.featured,
        bestseller: form.bestseller,
        published: form.published,
      };
      if (editing) await api.adminUpdateBook(editing, payload);
      else await api.adminCreateBook(payload);
      setForm(EMPTY_FORM);
      setEditing(null);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
    setSaving(false);
  }

  async function remove(slug: string) {
    if (!window.confirm('Delete this book permanently?')) return;
    setBusyId(slug);
    try {
      await api.adminDeleteBook(slug);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusyId('');
  }

  function edit(b: BookRow) {
    const slug = b.slug || b.id;
    setEditing(slug);
    setForm({
      title: b.title,
      slug: b.slug || '',
      author: b.author,
      publisher: b.publisher || '',
      isbn: b.isbn || '',
      language: b.language || '',
      edition: b.edition || '',
      format: b.format || '',
      pages: b.pages != null ? String(b.pages) : '',
      rating: b.rating != null ? String(b.rating) : '',
      price: String(b.price),
      stock: String(b.stock ?? 0),
      description: b.description || '',
      coverImage: b.coverImage || b.image || '',
      category: typeof b.category === 'object' && b.category ? b.category.slug || 'programming' : 'programming',
      featured: !!b.featured,
      bestseller: !!b.bestseller,
      published: b.published !== false,
      prevPrice: b.prevPrice != null ? String(b.prevPrice) : '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const authors = useMemo(() => Array.from(new Set((books || []).map((b) => b.author).filter(Boolean))).sort(), [books]);
  const total = books?.length || 0;
  const publishedCount = books?.filter((b) => b.published !== false).length || 0;
  const featuredCount = books?.filter((b) => b.featured).length || 0;

  function clearFilters() {
    setSearch('');
    setFilters({ category: '', author: '', featured: '', bestseller: '', published: '' });
    setSort('newest');
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-line rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-muted font-semibold uppercase">All Books</p>
          <p className="text-xl font-extrabold text-brand">{books ? total : '…'}</p>
        </div>
        <div className="bg-white border border-green-200 rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-muted font-semibold uppercase">✅ Published</p>
          <p className="text-xl font-extrabold text-green-700">{books ? publishedCount : '…'}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-muted font-semibold uppercase">📄 Unpublished</p>
          <p className="text-xl font-extrabold text-slate-600">{books ? total - publishedCount : '…'}</p>
        </div>
        <div className="bg-white border border-accent rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-muted font-semibold uppercase">⭐ Featured</p>
          <p className="text-xl font-extrabold text-accent-dark">{books ? featuredCount : '…'}</p>
        </div>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-5 gap-6 items-start">
        {/* Form */}
        <div className="lg:col-span-2 bg-white border border-line rounded-2xl p-6 shadow-sm w-full">
          <h2 className="font-bold text-ink mb-4">{editing ? `Edit: ${editing}` : 'Add New Book'}</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm col-span-2">
              <span className="font-semibold">Title *</span>
              <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. JavaScript Essentials" className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
            </label>
            <label className="block text-sm col-span-2">
              <span className="font-semibold">Slug</span>
              <input value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="auto-generated from title" className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
            </label>
            <label className="block text-sm col-span-2">
              <span className="font-semibold">Author *</span>
              <input value={form.author} onChange={(e) => set('author', e.target.value)} placeholder="e.g. Jane Doe" className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
              {authors.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {authors.slice(0, 8).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => set('author', a)}
                      className="text-[11px] font-bold bg-slate-100 border border-line rounded-full px-2 py-0.5 text-ink hover:border-brand"
                    >
                      {a}
                    </button>
                  ))}
                  {authors.length > 8 && <span className="text-[11px] text-muted self-center">+{authors.length - 8} more</span>}
                </div>
              )}
            </label>
            <label className="block text-sm">
              <span className="font-semibold">ISBN</span>
              <input value={form.isbn} onChange={(e) => set('isbn', e.target.value)} placeholder="e.g. 978-3-16-148410-0" className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
            </label>
            <label className="block text-sm">
              <span className="font-semibold">Publisher</span>
              <input value={form.publisher} onChange={(e) => set('publisher', e.target.value)} placeholder="AlioStore Publishing" className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
            </label>
            <label className="block text-sm">
              <span className="font-semibold">Language</span>
              <select value={form.language} onChange={(e) => set('language', e.target.value)} className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 bg-white focus:border-brand focus:outline-none">
                {['English', 'Arabic', 'Spanish', 'French', 'German'].map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-semibold">Format</span>
              <select value={form.format} onChange={(e) => set('format', e.target.value)} className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 bg-white focus:border-brand focus:outline-none">
                {['EPUB + PDF', 'EPUB', 'PDF', 'Paperback', 'Hardcover'].map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-semibold">Edition</span>
              <input value={form.edition} onChange={(e) => set('edition', e.target.value)} placeholder="1st Edition" className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
            </label>
            <label className="block text-sm">
              <span className="font-semibold">Pages</span>
              <input value={form.pages} onChange={(e) => set('pages', e.target.value)} type="number" min="1" placeholder="e.g. 320" className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
            </label>
            <label className="block text-sm">
              <span className="font-semibold">Price (AED) *</span>
              <input value={form.price} onChange={(e) => set('price', e.target.value)} type="number" min="0" step="0.01" className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
            </label>
            <label className="block text-sm">
              <span className="font-semibold">Discount Price (Was)</span>
              <input value={form.prevPrice} onChange={(e) => set('prevPrice', e.target.value)} type="number" min="0" step="0.01" placeholder="optional" className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
            </label>
            <label className="block text-sm">
              <span className="font-semibold">Stock Quantity *</span>
              <input value={form.stock} onChange={(e) => set('stock', e.target.value)} type="number" min="0" className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
            </label>
            <label className="block text-sm">
              <span className="font-semibold">Rating (0–5)</span>
              <input value={form.rating} onChange={(e) => set('rating', e.target.value)} type="number" min="0" max="5" step="0.1" placeholder="4.5" className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
            </label>
            <label className="block text-sm">
              <span className="font-semibold">Category</span>
              <select value={form.category} onChange={(e) => set('category', e.target.value)} className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none bg-white">
                {cats.length === 0 && <option value="programming">Programming</option>}
                {cats.map((c) => (
                  <option key={c.id} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm col-span-2">
              <span className="font-semibold">Book Cover / Image</span>
              <div className="flex gap-2">
                <input value={form.coverImage} onChange={(e) => set('coverImage', e.target.value)} placeholder="images/... or https://..." className="mt-1 flex-1 border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
                <label className="mt-1 border-2 border-brand rounded-xl px-3 py-2 text-xs font-bold text-brand cursor-pointer hover:bg-brand hover:text-white transition shrink-0 self-center">
                  Upload
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onUploadCover(e.target.files[0])} />
                </label>
              </div>
              {form.coverImage && (
                <div className="mt-2 flex items-center gap-2">
                  <Image src={form.coverImage} alt="Cover preview" width={36} height={48} className="object-contain rounded border border-line" />
                  <span className="text-[11px] text-muted break-all">{form.coverImage}</span>
                </div>
              )}
            </label>
            <label className="block text-sm col-span-2">
              <span className="font-semibold">Book Description</span>
              <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
            </label>
            <label className="flex items-center gap-2 text-sm col-span-1">
              <input type="checkbox" checked={form.published} onChange={(e) => set('published', e.target.checked)} className="accent-brand" />
              <span className="font-semibold">Published</span>
            </label>
            <label className="flex items-center gap-2 text-sm col-span-1">
              <input type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} className="accent-brand" />
              <span className="font-semibold">Featured</span>
            </label>
            <label className="flex items-center gap-2 text-sm col-span-1">
              <input type="checkbox" checked={form.bestseller} onChange={(e) => set('bestseller', e.target.checked)} className="accent-brand" />
              <span className="font-semibold">Bestseller</span>
            </label>
          </div>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
          <div className="flex gap-2 mt-5">
            <button onClick={save} disabled={saving} className="btn-flash btn-primary-flash flex-1 disabled:opacity-60">
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Book'}
            </button>
            {editing && (
              <button
                onClick={() => {
                  setEditing(null);
                  setForm(EMPTY_FORM);
                }}
                className="btn-flash btn-outline-flash text-brand border-brand"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="lg:col-span-3 bg-white border border-line rounded-2xl p-6 shadow-sm w-full">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-bold text-ink">All Books ({books ? books.length : '…'})</h2>
            <div className="flex flex-wrap items-center gap-2">
              {onGoInventory && (
                <button onClick={onGoInventory} className="text-xs font-bold text-accent-dark hover:underline shrink-0">
                  Inventory →
                </button>
              )}
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search books (title, author, ISBN)…"
                className="border-2 border-line rounded-xl px-3 py-1.5 text-sm focus:border-brand focus:outline-none w-full sm:w-56"
              />
            </div>
          </div>

          {/* Filter & sort toolbar */}
          <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-line bg-slate-50 rounded-xl p-3">
            <select
              value={filters.category}
              onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
              className="border-2 border-line rounded-lg px-2 py-1.5 text-xs font-bold bg-white focus:border-brand focus:outline-none"
            >
              <option value="">All Categories</option>
              {cats.map((c) => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </select>
            <select
              value={filters.author}
              onChange={(e) => setFilters((f) => ({ ...f, author: e.target.value }))}
              className="border-2 border-line rounded-lg px-2 py-1.5 text-xs font-bold bg-white focus:border-brand focus:outline-none"
            >
              <option value="">All Authors</option>
              {authors.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <select
              value={filters.published}
              onChange={(e) => setFilters((f) => ({ ...f, published: e.target.value }))}
              className="border-2 border-line rounded-lg px-2 py-1.5 text-xs font-bold bg-white focus:border-brand focus:outline-none"
            >
              <option value="">All Status</option>
              <option value="true">✅ Published</option>
              <option value="false">📄 Unpublished</option>
            </select>
            <select
              value={filters.featured}
              onChange={(e) => setFilters((f) => ({ ...f, featured: e.target.value }))}
              className="border-2 border-line rounded-lg px-2 py-1.5 text-xs font-bold bg-white focus:border-brand focus:outline-none"
            >
              <option value="">All Featured</option>
              <option value="true">⭐ Featured</option>
              <option value="false">Not featured</option>
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="border-2 border-line rounded-lg px-2 py-1.5 text-xs font-bold bg-white focus:border-brand focus:outline-none"
            >
              {BOOK_SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            {(search || filters.category || filters.author || filters.published || filters.featured) && (
              <button onClick={clearFilters} className="text-xs font-bold text-accent-dark hover:underline px-1">
                Clear filters ✕
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {books === null && <p className="text-sm text-muted">Loading books…</p>}
            {books && !books.length && <p className="text-sm text-muted">No books match your filters.</p>}
            {books?.map((b) => {
              const slug = b.slug || b.id;
              const expanded = openId === slug;
              const published = b.published !== false;
              return (
                <div key={slug} className={`border ${expanded ? 'border-brand' : 'border-line'} rounded-xl p-3`}>
                  <div className="flex items-center gap-3">
                    <Image src={b.image} alt={b.title} width={40} height={53} className="object-contain rounded" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate flex items-center gap-2">
                        {b.title}
                        {b.featured && <span className="text-[10px] font-bold bg-accent text-brand rounded-full px-1.5 py-0.5">FEATURED</span>}
                        {!published && <span className="text-[10px] font-bold bg-slate-200 text-slate-600 rounded-full px-1.5 py-0.5">UNPUBLISHED</span>}
                      </p>
                      <p className="text-xs text-muted truncate">
                        {b.author} · {formatAED(b.price)}
                        {b.isbn ? ` · ISBN ${b.isbn}` : ''} · stock {b.stock ?? 0}
                      </p>
                    </div>
                    <button
                      onClick={() => setOpenId(expanded ? '' : slug)}
                      className="text-xs font-bold text-accent-dark hover:underline shrink-0"
                    >
                      {expanded ? 'Hide details ↑' : 'Details ↓'}
                    </button>
                    <button
                      onClick={() => edit(b)}
                      className="text-xs font-bold text-brand hover:underline shrink-0"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => remove(slug)}
                      disabled={busyId === slug}
                      className="text-xs font-bold text-red-600 hover:underline shrink-0 disabled:opacity-50"
                    >
                      {busyId === slug ? '…' : 'Delete'}
                    </button>
                  </div>

                  {expanded && (
                    <div className="mt-3 pt-3 border-t border-line grid sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                      {[
                        ['ISBN', b.isbn || '—'],
                        ['Author', b.author],
                        ['Publisher', b.publisher || '—'],
                        ['Language', b.language || '—'],
                        ['Edition', b.edition || '—'],
                        ['Format', b.format || '—'],
                        ['Pages', b.pages != null ? String(b.pages) : '—'],
                        ['Rating', b.rating != null ? `${b.rating} / 5` : '—'],
                        ['Price', b.prevPrice ? `${formatAED(b.prevPrice)} → ${formatAED(b.price)}` : formatAED(b.price)],
                        ['Stock', String(b.stock ?? 0)],
                        ['Category', typeof b.category === 'object' && b.category ? b.category.name : '—'],
                        ['Published', published ? 'Yes' : 'No'],
                        ['Featured', b.featured ? 'Yes' : 'No'],
                        ['Bestseller', b.bestseller ? 'Yes' : 'No'],
                        ['Published on', b.publishedAt ? new Date(b.publishedAt).toLocaleDateString() : '—'],
                        ['Slug', slug],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-3 border-b border-dashed border-line pb-1">
                          <span className="text-muted font-bold uppercase tracking-wide">{k}</span>
                          <span className="text-ink font-semibold text-right break-all">{v}</span>
                        </div>
                      ))}
                      {b.description && (
                        <div className="sm:col-span-2">
                          <span className="text-muted font-bold uppercase tracking-wide">Description</span>
                          <p className="text-ink mt-1">{b.description}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------- Orders --------------------- */

const PAGE_SIZE = 10;

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-slate-100 text-slate-700 border-slate-300',
  PAID: 'bg-green-50 text-green-700 border-green-300',
  CONFIRMED: 'bg-amber-50 text-amber-700 border-amber-300',
  PROCESSING: 'bg-indigo-50 text-indigo-700 border-indigo-300',
  SHIPPED: 'bg-blue-50 text-blue-700 border-blue-300',
  OUT_FOR_DELIVERY: 'bg-purple-50 text-purple-700 border-purple-300',
  DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  CANCELLED: 'bg-red-50 text-red-600 border-red-300',
  REFUNDED: 'bg-rose-50 text-rose-600 border-rose-300',
};

const ACTION_LABEL: Record<string, string> = {
  CONFIRMED: 'Confirm Order',
  PROCESSING: 'Start Processing',
  SHIPPED: 'Mark Shipped',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Mark Delivered',
  CANCELLED: 'Cancel Order',
  REFUNDED: 'Refund Order',
};

const ACTION_STYLE: Record<string, string> = {
  CONFIRMED: 'bg-amber-600 hover:bg-amber-700',
  PROCESSING: 'bg-indigo-600 hover:bg-indigo-700',
  SHIPPED: 'bg-blue-600 hover:bg-blue-700',
  OUT_FOR_DELIVERY: 'bg-purple-600 hover:bg-purple-700',
  DELIVERED: 'bg-emerald-600 hover:bg-emerald-700',
  CANCELLED: 'bg-red-600 hover:bg-red-700',
  REFUNDED: 'bg-rose-600 hover:bg-rose-700',
};

function orderInvoiceHtml(o: Order): string {
  const currency = (n: number) =>
    'AED ' + (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const rows = (o.items || [])
    .map(
      (it) =>
        `<tr><td>${it.name || it.id}</td><td>${it.qty}</td><td>${currency(it.price || 0)}</td><td style="text-align:right">${currency((it.qty || 0) * (it.price || 0))}</td></tr>`,
    )
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${o.reference || ''}</title>
<style>
body{font-family:Arial,Helvetica,sans-serif;color:#1b2733;margin:32px;font-size:13px}
h1{color:#142a56;margin:0 0 4px}.brand{color:#e0a800;font-weight:bold}
table{width:100%;border-collapse:collapse;margin-top:16px}
th,td{border-bottom:1px solid #e3e8ef;padding:8px 6px;text-align:left}
th{color:#142a56;text-transform:uppercase;font-size:11px}
.meta{display:flex;justify-content:space-between;margin-top:16px;gap:24px}
.box{border:1px solid #e3e8ef;border-radius:8px;padding:12px;flex:1}
.totals{margin-top:16px;margin-left:auto;width:280px}
.totals div{display:flex;justify-content:space-between;padding:4px 0}
.grand{font-size:16px;font-weight:bold;color:#142a56;border-top:2px solid #142a56;margin-top:6px;padding-top:8px}
.status{color:#e0a800;font-weight:bold}
</style></head><body>
<h1>AlioStore</h1><div class="brand">Smart Book Store</div>
<h2 style="margin-top:12px">ORDER / INVOICE ${o.reference || ''}</h2>
<div class="meta">
<div class="box"><b>Billing / Customer</b><br>${o.contact?.name || o.user?.name || ''}<br>${o.contact?.email || o.user?.email || ''}<br>${o.contact?.phone || ''}</div>
<div class="box"><b>Ship To</b><br>${o.contact?.address || 'N/A'}<br><b>Order Date:</b> ${o.placedAt ? new Date(o.placedAt).toLocaleString() : ''}</div>
<div class="box"><b>Payment</b><br>Method: ${(o.paymentProvider || '—').toUpperCase()}<br>Status: <span class="status">${o.paymentStatus || 'UNPAID'}</span><br>Ref: ${o.paymentReference || '—'}</div>
</div>
<table><thead><tr><th>Book</th><th>Qty</th><th>Unit Price</th><th style="text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table>
<div class="totals">
<div><span>Subtotal</span><span>${currency(o.subtotal != null ? o.subtotal : o.total)}</span></div>
<div><span>Shipping</span><span>${currency(o.shippingCost || 0)}</span></div>
<div><span>Tax</span><span>${currency(o.tax || 0)}</span></div>
${(o.discountAmount ?? 0) > 0 ? `<div><span>Discount ${o.couponCode ? '(' + o.couponCode + ')' : ''}</span><span>-${currency(o.discountAmount || 0)}</span></div>` : ''}
<div class="grand"><span>Total</span><span>${currency(o.total)}</span></div>
</div>
<p style="margin-top:24px;color:#6b7a8d;font-size:11px">Thank you for shopping at AlioStore.</p>
</body></html>`;
}

function OrdersTab() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [fresh, setFresh] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [openId, setOpenId] = useState('');
  const [trackForm, setTrackForm] = useState<Record<string, { trackingNumber: string; trackingProvider: string; estimatedDelivery: string; notesValue: string }>>({});

  const load = useCallback(() => {
    api
      .adminOrders({ status, fresh, search, page, pageSize: PAGE_SIZE })
      .then((res) => {
        setOrders(res.orders);
        setTotalPages(res.totalPages);
        setTotal(res.total);
      })
      .catch((e) => setError((e as Error).message));
  }, [status, fresh, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  function applyFilter(nextStatus: string) {
    setFresh(false);
    setStatus(nextStatus);
    setPage(1);
  }

  function runSearch() {
    setPage(1);
    setSearch(searchInput.trim());
  }

  function resetPage() {
    setPage(1);
  }

  async function changeStatus(id: string, next: string, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusyId(id);
    try {
      await api.adminSetOrderStatus(id, next);
      setOpenId('');
      load();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusyId('');
  }

  async function saveTracking(o: Order) {
    const f = trackForm[o.id!] || {};
    setBusyId(o.id as string);
    try {
      await api.adminSetOrderTracking(o.id as string, {
        trackingNumber: f.trackingNumber || undefined,
        trackingProvider: f.trackingProvider || undefined,
        estimatedDelivery: f.estimatedDelivery || undefined,
      });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusyId('');
  }

  async function saveNotes(o: Order) {
    const f = trackForm[o.id!] || {};
    setBusyId(o.id as string);
    try {
      await api.adminSetOrderNotes(o.id as string, f.notesValue || '');
      load();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusyId('');
  }

  function trackSet(o: Order, key: 'trackingNumber' | 'trackingProvider' | 'estimatedDelivery' | 'notesValue', value: string) {
    setTrackForm((t) => {
      const prev = t[o.id!];
      return { ...t, [o.id!]: { trackingNumber: prev?.trackingNumber || '', trackingProvider: prev?.trackingProvider || '', estimatedDelivery: prev?.estimatedDelivery || '', notesValue: prev?.notesValue || '', [key]: value } };
    });
  }

  function printOrder(o: Order) {
    const w = window.open('', '_blank', 'width=820,height=1000');
    if (!w) return;
    w.document.write(orderInvoiceHtml(o));
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  }

  function downloadInvoice(o: Order) {
    const blob = new Blob([orderInvoiceHtml(o)], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AlioStore-Invoice-${o.reference || o.id}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const FILTERS: { key: string; label: string }[] = [
    { key: '', label: 'All Orders' },
    { key: 'fresh', label: 'New (today)' },
    ...['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUNDED'].map((k) => ({
      key: k,
      label: (TRACK_LABELS[k] || k) + ` (${k})`,
    })),
  ];

  return (
    <div>
      <div className="flex flex-col gap-3 mb-5">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => {
            const active = f.key === 'fresh' ? fresh : status === f.key;
            return (
              <button
                key={f.key || 'ALL'}
                onClick={() => (f.key === 'fresh' ? (setFresh(!fresh), setPage(1), setStatus('')) : applyFilter(f.key))}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                  active ? 'bg-brand text-white' : 'bg-white border border-line text-ink'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            placeholder="Search by reference, name, email or tracking number"
            className="flex-1 border-2 border-line rounded-xl px-3 py-2 text-sm focus:border-brand focus:outline-none"
          />
          <button onClick={runSearch} className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-bold hover:bg-accent-dark transition">
            Search
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4 mb-4">{error}</p>}

      <div className="flex flex-col gap-4">
        {orders === null && <p className="text-sm text-muted">Loading orders…</p>}
        {orders !== null && !orders.length && <p className="text-sm text-muted">No orders found.</p>}
        {orders?.map((o) => {
          const expanded = openId === o.id;
          const currentStatus = (o.status || 'PENDING') as OrderStatus;
          const nextMoves = ORDER_TRANSITIONS[currentStatus] || [];
          return (
            <div key={o.id} className="bg-white border border-line rounded-2xl p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-bold text-ink">
                    Order #{o.reference || o.id}
                  </p>
                  <p className="text-xs text-muted">
                    {o.user?.name || o.contact?.name || 'Guest'} · {o.user?.email || o.contact?.email || ''} ·{' '}
                    {o.placedAt ? new Date(o.placedAt).toLocaleString() : ''}
                  </p>
                  {o.trackingNumber ? (
                    <p className="text-xs text-muted mt-1">
                      📦 Tracking: <span className="font-semibold text-ink">{o.trackingNumber}</span>{' '}
                      {o.trackingProvider ? `· ${o.trackingProvider}` : ''}
                      {o.estimatedDelivery ? ` · ETA ${new Date(o.estimatedDelivery).toLocaleDateString()}` : ''}
                    </p>
                  ) : (
                    <p className="text-xs text-muted mt-1">Ship to: {o.contact?.name} · {o.contact?.phone} · {o.contact?.address || 'n/a'}</p>
                  )}
                </div>
                <p className="font-extrabold text-brand">{formatAED(o.total)}</p>
              </div>
              <p className="text-sm text-ink mb-3">
                {o.items.map((it) => `${it.name || it.id} × ${it.qty}`).join(', ')}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`border text-xs font-bold px-2.5 py-1 rounded-lg uppercase ${STATUS_COLOR[currentStatus] || ''}`}>
                  {TRACK_LABELS[currentStatus] || currentStatus}
                </span>
                {nextMoves.map((next) => (
                  <button
                    key={next}
                    disabled={busyId === o.id}
                    onClick={() => changeStatus(o.id || '', next, next === 'CANCELLED' ? `Cancel order ${o.reference}?` : next === 'REFUNDED' ? `Refund order ${o.reference}?` : undefined)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold text-white transition disabled:opacity-50 ${ACTION_STYLE[next] || 'bg-slate-400'}`}
                  >
                    {busyId === o.id ? '…' : ACTION_LABEL[next] || next}
                  </button>
                ))}
                <button
                  onClick={() => setOpenId(expanded ? '' : (o.id as string))}
                  className="ml-auto text-xs font-bold text-accent-dark hover:underline"
                >
                  {expanded ? 'Hide details ↑' : 'View details ↓'}
                </button>
              </div>

              {expanded && (
                <div className="mt-4 border-t border-line pt-4 flex flex-col gap-5">
                  {/* Order details */}
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div>
                      <p className="text-xs font-bold text-muted uppercase tracking-wide mb-2">Ordered Books</p>
                      <ul className="space-y-1.5 text-sm">
                        {o.items.map((it, i) => (
                          <li key={i} className="flex justify-between gap-3">
                            <span className="text-ink">
                              {it.name || it.id} × {it.qty}
                            </span>
                            <span className="font-semibold whitespace-nowrap">
                              {formatAED((it.qty || 0) * (it.price || 0))}{' '}
                              <span className="text-xs text-muted font-normal">({formatAED(it.price || 0)} each)</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 text-sm space-y-1">
                        <p className="flex justify-between gap-3">
                          <span className="text-muted">Subtotal</span>
                          <span className="font-semibold">{formatAED(o.subtotal != null ? o.subtotal : o.total)}</span>
                        </p>
                        <p className="flex justify-between gap-3">
                          <span className="text-muted">Shipping Cost</span>
                          <span className="font-semibold">{o.shippingCost ? formatAED(o.shippingCost) : 'Free'}</span>
                        </p>
                        <p className="flex justify-between gap-3">
                          <span className="text-muted">Tax</span>
                          <span className="font-semibold">{formatAED(o.tax || 0)}</span>
                        </p>
                        {(o.discountAmount ?? 0) > 0 && (
                          <p className="flex justify-between gap-3 text-green-600">
                            <span>Discount {o.couponCode ? `(${o.couponCode})` : ''}</span>
                            <span>−{formatAED(o.discountAmount as number)}</span>
                          </p>
                        )}
                        <p className="flex justify-between gap-3 font-extrabold text-brand border-t border-line pt-2">
                          <span>Total Amount</span>
                          <span>{formatAED(o.total)}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 text-sm">
                      <div>
                        <p className="text-xs font-bold text-muted uppercase tracking-wide mb-1">Customer Information</p>
                        <p className="text-ink font-semibold">{o.user?.name || o.contact?.name || 'Guest'}</p>
                        <p className="text-ink">Email: {o.user?.email || o.contact?.email || '—'}</p>
                        <p className="text-ink">Phone: {o.contact?.phone || o.user?.mobile || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-muted uppercase tracking-wide mb-1">Shipping Address</p>
                        <p className="text-ink">{o.contact?.address || 'No shipping address recorded.'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-muted uppercase tracking-wide mb-1">Payment</p>
                        <p className="text-ink">Method: <span className="font-semibold">{o.paymentProvider || '—'}</span></p>
                        <p className="text-ink">
                          Status:{' '}
                          <span className={`font-bold ${o.paymentStatus === 'PAID' ? 'text-green-600' : o.paymentStatus === 'REFUNDED' ? 'text-rose-600' : o.paymentStatus ? 'text-amber-600' : ''}`}>
                            {o.paymentStatus || 'UNPAID'}
                          </span>
                        </p>
                        <p className="text-ink">Transaction: {o.paymentReference || '—'}</p>
                        <p className="text-ink">{o.paidAt ? `Paid at ${new Date(o.paidAt).toLocaleString()}` : 'Not paid yet'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-muted uppercase tracking-wide mb-1">Order Date</p>
                        <p className="text-ink">{o.placedAt ? new Date(o.placedAt).toLocaleString() : '—'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Tracking timeline */}
                  {(o.trackingEvents || []).length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-muted uppercase tracking-wide mb-2">📦 Delivery History / Tracking</p>
                      <div className="flex flex-col gap-2">
                        {o.trackingEvents!.map((t, i) => {
                          const isLast = i === o.trackingEvents!.length - 1;
                          const timelineSteps = ['PENDING', 'PAID', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
                          const idx = timelineSteps.indexOf(t.status);
                          return (
                            <div key={t.id || i} className="flex items-start gap-2 text-sm">
                              <span className={`text-xs w-4 text-center ${idx < 0 ? 'text-slate-300' : isLast ? 'text-accent-dark' : 'text-green-600'}`}>
                                {isLast ? '→' : '✓'}
                              </span>
                              <div className="flex-1">
                                <p className={`font-semibold ${isLast ? 'text-accent-dark' : 'text-ink'}`}>{t.label}</p>
                                <p className="text-xs text-muted">{t.note} · {new Date(t.at).toLocaleString()}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Tracking + notes + actions */}
                  <div className="grid gap-4 lg:grid-cols-2 border-t border-line pt-4">
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs font-bold text-ink uppercase tracking-wide mb-2">Create Tracking Update</p>
                      <div className="flex flex-col gap-2">
                        <input value={trackForm[o.id!]?.trackingNumber ?? o.trackingNumber ?? ''} onChange={(e) => trackSet(o, 'trackingNumber', e.target.value)} placeholder="Tracking number" className="border-2 border-line rounded-lg px-2 py-1.5 text-sm focus:border-brand focus:outline-none bg-white" />
                        <div className="flex gap-2">
                          <input value={trackForm[o.id!]?.trackingProvider ?? o.trackingProvider ?? ''} onChange={(e) => trackSet(o, 'trackingProvider', e.target.value)} placeholder="Shipping provider (e.g. Aramex)" className="flex-1 border-2 border-line rounded-lg px-2 py-1.5 text-sm focus:border-brand focus:outline-none bg-white" />
                          <input value={trackForm[o.id!]?.estimatedDelivery ?? (o.estimatedDelivery ? o.estimatedDelivery.slice(0, 10) : '') ?? ''} onChange={(e) => trackSet(o, 'estimatedDelivery', e.target.value)} type="date" className="flex-1 border-2 border-line rounded-lg px-2 py-1.5 text-sm focus:border-brand focus:outline-none bg-white" />
                        </div>
                        <button onClick={() => saveTracking(o)} disabled={busyId === o.id} className="text-xs font-bold bg-brand text-white rounded-lg px-3 py-2 hover:bg-accent-dark transition disabled:opacity-50">
                          {busyId === o.id ? '…' : 'Save Tracking'}
                        </button>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs font-bold text-ink uppercase tracking-wide mb-2">Add Order Notes</p>
                      <textarea value={trackForm[o.id!]?.notesValue ?? o.notes ?? ''} onChange={(e) => trackSet(o, 'notesValue', e.target.value)} rows={2} placeholder="Internal note for this order…" className="border-2 border-line rounded-lg px-2 py-1.5 text-sm focus:border-brand focus:outline-none w-full bg-white" />
                      <div className="flex items-center gap-2 mt-2">
                        <button onClick={() => saveNotes(o)} disabled={busyId === o.id} className="text-xs font-bold bg-accent text-brand rounded-lg px-3 py-2 hover:bg-accent-dark hover:text-white transition disabled:opacity-50">
                          {busyId === o.id ? '…' : 'Save Notes'}
                        </button>
                        {o.notes && <p className="text-[11px] text-muted truncate">Current: {o.notes}</p>}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:col-span-2">
                      <button onClick={() => printOrder(o)} className="text-xs font-bold border border-brand text-brand rounded-lg px-3 py-2 hover:bg-brand hover:text-white transition">🖨️ Print Order</button>
                      <button onClick={() => downloadInvoice(o)} className="text-xs font-bold border border-brand text-brand rounded-lg px-3 py-2 hover:bg-brand hover:text-white transition">⬇️ Download Invoice</button>
                      {currentStatus === 'DELIVERED' && (
                        <button onClick={() => changeStatus(o.id || '', 'REFUNDED', `Issue a refund for order ${o.reference}?`)} disabled={busyId === o.id} className="text-xs font-bold bg-rose-600 text-white rounded-lg px-3 py-2 hover:bg-rose-700 transition disabled:opacity-50">
                          {busyId === o.id ? '…' : '↩︎ Refund Order'}
                        </button>
                      )}
                      {currentStatus === 'PENDING' && (
                        <button onClick={() => changeStatus(o.id || '', 'CANCELLED', `Reject/Cancel order ${o.reference}?`)} disabled={busyId === o.id} className="text-xs font-bold bg-red-600 text-white rounded-lg px-3 py-2 hover:bg-red-700 transition disabled:opacity-50">
                          {busyId === o.id ? '…' : '✕ Reject Order'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6 text-sm">
          <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 rounded-lg border border-line font-semibold disabled:opacity-40 hover:bg-slate-50">
            ← Prev
          </button>
          <span className="text-muted">
            Page <span className="font-bold text-ink">{page}</span> of <span className="font-bold text-ink">{totalPages}</span>
            <span className="ml-2">({total} total)</span>
          </span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1 rounded-lg border border-line font-semibold disabled:opacity-40 hover:bg-slate-50">
            Next →
          </button>
        </div>
      )}
      {totalPages <= 1 && page > 1 && (
        <button onClick={resetPage} className="text-xs font-bold text-accent-dark hover:underline mt-4">
          ← Back to first page
        </button>
      )}
    </div>
  );
}

/* --------------------- Users --------------------- */

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    api
      .adminUsers({ search: search.trim() || undefined, status: status || undefined })
      .then((res) => setUsers(res.users))
      .catch((e) => setError((e as Error).message));
  }, [search, status]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  async function toggleBlock(u: AdminUser) {
    setBusyId(u.id);
    try {
      await api.adminBlockUser(u.id, !u.blocked);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusyId('');
  }

  async function saveNotes(u: AdminUser) {
    setBusyId(u.id);
    try {
      await api.adminSetUserNotes(u.id, notesDraft[u.id] ?? u.notes ?? '');
      load();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusyId('');
  }

  const blocked = users?.filter((u) => u.blocked).length ?? 0;
  const active = users ? users.length - blocked : 0;
  const totalSpent = users?.reduce((s, u) => s + (u.totalSpent || 0), 0) ?? 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Customer stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-line rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-muted font-semibold uppercase">All Customers</p>
          <p className="text-xl font-extrabold text-brand">{users ? users.length : '…'}</p>
        </div>
        <div className="bg-white border border-green-200 rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-muted font-semibold uppercase">✅ Active</p>
          <p className="text-xl font-extrabold text-green-700">{users ? active : '…'}</p>
        </div>
        <div className="bg-white border border-red-200 rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-muted font-semibold uppercase">⛔ Blocked</p>
          <p className="text-xl font-extrabold text-red-600">{users ? blocked : '…'}</p>
        </div>
        <div className="bg-white border border-accent rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-muted font-semibold uppercase">💰 Total Spending</p>
          <p className="text-xl font-extrabold text-accent-dark">{users ? formatAED(totalSpent) : '…'}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-line rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {[{ key: '', label: 'All' }, { key: 'active', label: '🟢 Active' }, { key: 'blocked', label: '⛔ Blocked' }].map((f) => (
            <button
              key={f.key}
              onClick={() => setStatus(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${status === f.key ? 'bg-brand text-white' : 'bg-slate-50 border border-line text-ink hover:border-brand'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email or phone…" className="border-2 border-line rounded-xl px-3 py-1.5 text-sm focus:border-brand focus:outline-none w-56" />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">{error}</p>}

      {/* Customer list */}
      <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
        <h2 className="font-bold text-ink mb-3">Customer Profiles ({users ? users.length : '…'})</h2>
        <div className="flex flex-col gap-3">
          {users === null && <p className="text-sm text-muted">Loading customers…</p>}
          {users && !users.length && <p className="text-sm text-muted">No customers found.</p>}
          {users?.map((u) => (
            <div key={u.id} className={`border ${u.blocked ? 'border-red-200 bg-red-50/40' : 'border-line'} rounded-xl p-3`}>
              <div className="flex flex-wrap items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="font-bold text-ink flex items-center gap-2">
                    {u.name}
                    {u.blocked && <span className="text-[10px] font-bold bg-red-100 text-red-600 rounded-full px-1.5 py-0.5">BLOCKED</span>}
                  </p>
                  <p className="text-xs text-muted">📧 {u.email} · 📱 {u.mobile || '—'}</p>
                  <p className="text-xs text-muted">🎂 Registered {(u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—')} · 🕓 Last active {u.lastActive ? new Date(u.lastActive).toLocaleString() : '—'}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2 py-1 rounded-lg border font-bold bg-brand text-white border-brand">{u.role}</span>
                  <span className={`px-2 py-1 rounded-lg border ${u.blocked ? 'bg-red-100 text-red-600 border-red-300' : 'bg-green-100 text-green-700 border-green-300'}`}>{u.blocked ? 'Blocked' : 'Active'}</span>
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-3 mt-3 text-xs bg-slate-50 rounded-xl p-3">
                <div>
                  <p className="text-muted font-bold uppercase tracking-wide">Orders</p>
                  <p className="font-bold text-ink">{u.ordersCount} order(s) · last {u.lastOrderAt ? new Date(u.lastOrderAt!).toLocaleDateString() : 'n/a'}</p>
                </div>
                <div>
                  <p className="text-muted font-bold uppercase tracking-wide">Order History</p>
                  <p className="font-bold text-ink">{u.totalSpent ? formatAED(u.totalSpent) + ' spent' : 'No purchases yet'}</p>
                </div>
                <div>
                  <p className="text-muted font-bold uppercase tracking-wide">Spending</p>
                  <p className="font-bold text-ink">{formatAED(u.totalSpent || 0)}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <input
                  value={notesDraft[u.id] ?? u.notes ?? ''}
                  onChange={(e) => setNotesDraft((n) => ({ ...n, [u.id]: e.target.value }))}
                  placeholder="Customer notes (internal)…"
                  className="flex-1 min-w-[180px] border-2 border-line rounded-lg px-2 py-1.5 text-xs focus:border-brand focus:outline-none bg-white"
                />
                <button onClick={() => saveNotes(u)} disabled={busyId === u.id} className="text-[11px] font-bold bg-accent text-brand rounded-lg px-2.5 py-1.5 hover:bg-accent-dark hover:text-white transition disabled:opacity-50">
                  {busyId === u.id ? '…' : 'Save Notes'}
                </button>
                <button
                  onClick={() => toggleBlock(u)}
                  disabled={busyId === u.id}
                  className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition disabled:opacity-50 ${u.blocked ? 'bg-green-100 text-green-700 hover:bg-green-600 hover:text-white' : 'bg-red-100 text-red-600 hover:bg-red-600 hover:text-white'}`}
                >
                  {busyId === u.id ? '…' : u.blocked ? 'Unblock Customer' : 'Block Customer'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* --------------------- Categories --------------------- */

const CATEGORY_EMPTY = { name: '', slug: '', description: '', image: '', active: true };

function slugifyName(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function CategoriesTab() {
  const [cats, setCats] = useState<CategoryItem[] | null>(null);
  const [form, setForm] = useState(CATEGORY_EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState('');

  const load = useCallback(() => {
    api
      .adminCategories()
      .then((res) => setCats(res.categories))
      .catch((e) => setError((e as Error).message));
  }, []);

  useEffect(load, [load]);

  function set(field: keyof typeof CATEGORY_EMPTY, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value, ...(field === 'name' && !f.slug ? { slug: slugifyName(String(value)) } : {}) }));
  }

  function startEdit(c: CategoryItem) {
    setEditing(c.slug);
    setForm({ name: c.name, slug: c.slug, description: c.description || '', image: c.image || '', active: c.active !== false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function reset() {
    setEditing(null);
    setForm(CATEGORY_EMPTY);
  }

  async function onUploadImage(file: File) {
    try {
      const res = await api.uploadCover(file);
      set('image', res.url);
    } catch (e) {
      setError('Upload failed: ' + (e as Error).message);
    }
  }

  async function save() {
    if (!form.name.trim()) {
      setError('Category name is required.');
      return;
    }
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || slugifyName(form.name),
      description: form.description.trim(),
      image: form.image.trim(),
      active: form.active,
    };
    setSaving(true);
    setError('');
    try {
      if (editing) await api.adminUpdateCategory(editing, payload);
      else await api.adminCreateCategory(payload);
      reset();
      load();
    } catch (e) {
      setError((e as Error).message);
    }
    setSaving(false);
  }

  async function toggle(c: CategoryItem) {
    try {
      await api.adminToggleCategory(c.slug, c.active !== false ? false : true);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remove(c: CategoryItem) {
    if (!window.confirm(`Delete category "${c.name}"?`)) return;
    setBusy(c.id);
    try {
      await api.adminDeleteCategory(c.slug);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy('');
  }

  const total = cats?.length || 0;
  const activeCount = cats?.filter((c) => c.active !== false).length || 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-line rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-muted font-semibold uppercase">All Categories</p>
          <p className="text-xl font-extrabold text-brand">{cats ? total : '…'}</p>
        </div>
        <div className="bg-white border border-green-200 rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-muted font-semibold uppercase">✅ Active</p>
          <p className="text-xl font-extrabold text-green-700">{cats ? activeCount : '…'}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-muted font-semibold uppercase">⛔ Inactive</p>
          <p className="text-xl font-extrabold text-slate-600">{cats ? total - activeCount : '…'}</p>
        </div>
        <div className="bg-white border border-accent rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-muted font-semibold uppercase">📚 Total Books</p>
          <p className="text-xl font-extrabold text-accent-dark">{cats ? cats.reduce((s, c) => s + (c.booksCount || 0), 0) : '…'}</p>
        </div>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-5 gap-6 items-start">
        {/* Form */}
        <div className="lg:col-span-2 bg-white border border-line rounded-2xl p-6 shadow-sm w-full">
          <h2 className="font-bold text-ink mb-4">{editing ? `Edit Category: ${editing}` : 'Add New Category'}</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm col-span-2">
              <span className="font-semibold">Category Name *</span>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Web Development" className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
            </label>
            <label className="block text-sm col-span-2">
              <span className="font-semibold">Category Slug</span>
              <input value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="web-development" className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
              <span className="text-[11px] text-muted">Auto-generated from the name. Used in storefront URLs.</span>
            </label>
            <label className="block text-sm col-span-2">
              <span className="font-semibold">Category Description</span>
              <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} placeholder="Short description shown on the category page…" className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
            </label>
            <label className="block text-sm col-span-2">
              <span className="font-semibold">Category Image</span>
              <div className="flex gap-2">
                <input value={form.image} onChange={(e) => set('image', e.target.value)} placeholder="images/... or https://..." className="mt-1 flex-1 border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
                <label className="mt-1 border-2 border-brand rounded-xl px-3 py-2 text-xs font-bold text-brand cursor-pointer hover:bg-brand hover:text-white transition shrink-0 self-center">
                  Upload
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onUploadImage(e.target.files[0])} />
                </label>
              </div>
              {form.image && (
                <div className="mt-2 flex items-center gap-2">
                  <Image src={form.image} alt="Category preview" width={48} height={32} className="object-cover rounded border border-line" />
                  <span className="text-[11px] text-muted break-all">{form.image}</span>
                </div>
              )}
            </label>
            <label className="flex items-center gap-2 text-sm col-span-2">
              <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} className="accent-brand" />
              <span className="font-semibold">Active (visible on the storefront)</span>
            </label>
          </div>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
          <div className="flex gap-2 mt-5">
            <button onClick={save} disabled={saving} className="btn-flash btn-primary-flash flex-1 disabled:opacity-60">
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Category'}
            </button>
            {editing && (
              <button onClick={reset} className="btn-flash btn-outline-flash text-brand border-brand">
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="lg:col-span-3 bg-white border border-line rounded-2xl p-6 shadow-sm w-full">
          <h2 className="font-bold text-ink mb-4">All Categories ({cats ? cats.length : '…'})</h2>
          <div className="flex flex-col gap-3">
            {cats === null && <p className="text-sm text-muted">Loading categories…</p>}
            {cats && !cats.length && <p className="text-sm text-muted">No categories yet. Add your first one on the left.</p>}
            {cats?.map((c) => {
              const active = c.active !== false;
              return (
                <div key={c.id} className={`border ${active ? 'border-line' : 'border-red-200 bg-red-50/40'} rounded-xl p-3`}>
                  <div className="flex flex-wrap items-center gap-3">
                    {c.image ? (
                      <Image src={c.image} alt={c.name} width={48} height={32} className="object-cover rounded" />
                    ) : (
                      <div className="w-12 h-8 rounded bg-slate-100 border border-line flex items-center justify-center text-xs">📚</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate flex items-center gap-2">
                        {c.name}
                        {active ? (
                          <span className="text-[10px] font-bold bg-green-100 text-green-700 rounded-full px-1.5 py-0.5">ACTIVE</span>
                        ) : (
                          <span className="text-[10px] font-bold bg-red-100 text-red-600 rounded-full px-1.5 py-0.5">INACTIVE</span>
                        )}
                      </p>
                      <p className="text-xs text-muted truncate">
                        /{c.slug} · {c.booksCount ?? 0} book(s)
                        {c.description ? ` · ${c.description.length > 40 ? c.description.slice(0, 40) + '…' : c.description}` : ''}
                      </p>
                    </div>
                    <button onClick={() => toggle(c)} className={`text-xs font-bold px-3 py-1 rounded-full border-2 transition shrink-0 ${active ? 'text-red-600 border-red-200 hover:border-red-400' : 'text-green-700 border-green-200 hover:border-green-400'}`}>
                      {active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => startEdit(c)} className="text-xs font-bold text-brand hover:underline shrink-0">
                      Edit
                    </button>
                    <button
                      onClick={() => remove(c)}
                      disabled={busy === c.id}
                      className="text-xs font-bold text-red-600 hover:underline shrink-0 disabled:opacity-50"
                    >
                      {busy === c.id ? '…' : 'Delete'}
                    </button>
                  </div>
                  {(c.booksCount ?? 0) > 0 && (
                    <p className="text-[11px] text-muted mt-1 ml-[60px]">
                      ⚠️ Delete is disabled while {c.booksCount} book(s) use this category — reassign or delete those books first.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------- Inventory --------------------- */

function InventoryTab() {
  const [books, setBooks] = useState<BookRow[] | null>(null);
  const [logs, setLogs] = useState<StockLogItem[] | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [qtys, setQtys] = useState<Record<string, string>>({});
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(() => {
    api
      .adminBooks()
      .then((res) => {
        setBooks(res.books);
        const p: Record<string, string> = {};
        res.books.forEach((b) => (p[b.slug || b.id] = String(b.price)));
        setPrices(p);
      })
      .catch((e) => setError((e as Error).message));
    api
      .adminStockHistory()
      .then((res) => setLogs(res.logs))
      .catch(() => undefined);
  }, []);

  useEffect(load, [load]);

  async function adjust(slug: string, qty: number, reason: string) {
    setBusy(slug);
    try {
      await api.adminAdjustStock(slug, qty, reason);
      const k = qty > 0 ? 'stock-in' : 'stock-out';
      load();
      return k;
    } catch (e) {
      setError((e as Error).message);
      return null;
    }
  }

  async function addStock(b: BookRow) {
    const slug = b.slug || b.id;
    const qty = Math.max(1, Number(qtys[slug]) || 1);
    const reason = window.prompt(`Add ${qty} unit(s) to "${b.title}" — reason?`, 'New shipment received');
    if (reason === null) return;
    await adjust(slug, qty, reason || 'Stock added');
  }

  async function removeStock(b: BookRow) {
    const slug = b.slug || b.id;
    const qty = Math.max(1, Number(qtys[slug]) || 1);
    if (qty > (b.stock ?? 0)) {
      setError('Cannot remove more than the available stock.');
      return;
    }
    const reason = window.prompt(`Remove ${qty} unit(s) from "${b.title}" — reason?`, 'Damaged / return');
    if (reason === null) return;
    await adjust(slug, -qty, reason || 'Stock removed');
  }

  async function savePrice(slug: string) {
    const v = Number(prices[slug]);
    if (!Number.isFinite(v) || v <= 0) return;
    setBusy(slug);
    try {
      await api.adminUpdateBook(slug, { price: v });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy('');
  }

  const filtered = useMemo(() => {
    if (!books) return null;
    const q = search.trim().toLowerCase();
    return books.filter((b) => {
      if (status === 'in' && (b.stock ?? 0) === 0) return false;
      if (status === 'in' && (b.stock ?? 0) <= 10) return false;
      if (status === 'low' && !((b.stock ?? 0) > 0 && (b.stock ?? 0) <= 10)) return false;
      if (status === 'out' && (b.stock ?? 0) !== 0) return false;
      if (q) {
        const hay = `${b.title} ${b.author} ${b.isbn || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [books, search, status]);

  const out = books?.filter((b) => (b.stock ?? 0) === 0).length ?? 0;
  const low = books?.filter((b) => (b.stock ?? 0) > 0 && (b.stock ?? 0) <= 10).length ?? 0;
  const healthy = books ? books.length - out - low : 0;
  const totalUnits = books?.reduce((s, b) => s + (b.stock ?? 0), 0) ?? 0;
  const inventoryValue = books?.reduce((s, b) => s + (b.stock ?? 0) * Number(b.price || 0), 0) ?? 0;
  const list = filtered ?? [];

  function exportCsv() {
    if (!books || !books.length) return;
    const rows = ['Title,Author,ISBN,Category,Price (AED),Stock,Status'];
    for (const b of books) {
      const cat = typeof b.category === 'object' && b.category ? b.category.name : '';
      const st = (b.stock ?? 0) === 0 ? 'Out of Stock' : (b.stock ?? 0) <= 10 ? 'Low Stock' : 'In Stock';
      rows.push(`"${b.title}","${b.author}","${b.isbn || ''}","${cat}",${b.price},${b.stock ?? 0},"${st}"`);
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alistore-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const chips = [
    { key: 'all', label: `All (${books ? books.length : '…'})` },
    { key: 'in', label: `🟢 In Stock (${books ? healthy : '…'})` },
    { key: 'low', label: `🟡 Low Stock (${books ? low : '…'})` },
    { key: 'out', label: `🔴 Out of Stock (${books ? out : '…'})` },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Inventory Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-line rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-muted font-semibold uppercase">All Titles</p>
          <p className="text-xl font-extrabold text-brand">{books ? books.length : '…'}</p>
        </div>
        <div className="bg-white border border-line rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-muted font-semibold uppercase">All Units</p>
          <p className="text-xl font-extrabold text-brand">{books ? formatNumber(totalUnits) : '…'}</p>
        </div>
        <div className="bg-white border border-line rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-muted font-semibold uppercase">Inventory Value</p>
          <p className="text-xl font-extrabold text-accent-dark">{books ? formatAED(inventoryValue) : '…'}</p>
        </div>
        <div className="bg-white border border-green-200 rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-muted font-semibold uppercase">🟢 In Stock</p>
          <p className="text-xl font-extrabold text-green-700">{books ? healthy : '…'}</p>
        </div>
        <div className="bg-white border border-amber-300 rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-muted font-semibold uppercase">🟡 Low Stock</p>
          <p className="text-xl font-extrabold text-amber-600">{books ? low : '…'}</p>
        </div>
        <div className="bg-white border border-red-300 rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-muted font-semibold uppercase">🔴 Out of Stock</p>
          <p className="text-xl font-extrabold text-red-600">{books ? out : '…'}</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">{error}</p>}

      {/* Toolbar */}
      <div className="bg-white border border-line rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <button
              key={c.key}
              onClick={() => setStatus(c.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${status === c.key ? 'bg-brand text-white' : 'bg-slate-50 border border-line text-ink hover:border-brand'}`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title, author or ISBN…" className="border-2 border-line rounded-xl px-3 py-1.5 text-sm focus:border-brand focus:outline-none w-56" />
          <button onClick={exportCsv} className="text-xs font-bold bg-accent text-brand px-3 py-2 rounded-xl hover:bg-accent-dark hover:text-white transition">
            📥 Export CSV (Inventory Report)
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-5 gap-5 items-start">
        {/* Stock Levels */}
        <div className="lg:col-span-3 bg-white border border-line rounded-2xl p-5 shadow-sm w-full">
          <h2 className="font-bold text-ink mb-3">Stock Levels ({list.length})</h2>
          <div className="flex flex-col gap-3">
            {list.length === 0 && books !== null && <p className="text-sm text-muted">No books match this view.</p>}
            {list.map((b) => {
              const slug = b.slug || b.id;
              const stock = b.stock ?? 0;
              const pct = stock >= 100 ? 100 : stock;
              return (
                <div key={slug} className="border border-line rounded-xl p-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <Image src={b.image} alt={b.title} width={32} height={43} className="object-contain rounded" />
                    <div className="flex-1 min-w-[140px]">
                      <p className="font-bold text-sm truncate">{b.title}</p>
                      <p className="text-xs text-muted truncate">{b.author} · {formatAED(b.price)}</p>
                    </div>
                    <div className="w-28 text-right">{stockBadge(b.stock)}</div>
                    <div className="flex items-center gap-1">
                      <input
                        value={qtys[slug] ?? ''}
                        onChange={(e) => setQtys((q) => ({ ...q, [slug]: e.target.value }))}
                        type="number"
                        min="1"
                        placeholder="1"
                        className="w-16 border-2 border-line rounded-lg px-2 py-1 text-sm focus:border-brand focus:outline-none"
                      />
                      <button onClick={() => addStock(b)} disabled={busy === slug} className="text-[11px] font-bold bg-green-100 text-green-700 rounded-lg px-2 py-1.5 hover:bg-green-600 hover:text-white transition disabled:opacity-50">
                        {busy === slug ? '…' : '+ Add'}
                      </button>
                      <button onClick={() => removeStock(b)} disabled={busy === slug || stock <= 0} className="text-[11px] font-bold bg-red-100 text-red-600 rounded-lg px-2 py-1.5 hover:bg-red-600 hover:text-white transition disabled:opacity-50">
                        {busy === slug ? '…' : '− Remove'}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input value={prices[slug] ?? ''} onChange={(e) => setPrices((p) => ({ ...p, [slug]: e.target.value }))} type="number" min="0" step="0.01" className="w-20 border-2 border-line rounded-lg px-2 py-1 text-sm focus:border-brand focus:outline-none" />
                      <button onClick={() => savePrice(slug)} disabled={busy === slug} className="text-xs font-bold text-brand hover:underline disabled:opacity-50">
                        Save
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${stock === 0 ? 'bg-red-500' : stock <= 10 ? 'bg-amber-400' : 'bg-green-500'}`} style={{ width: `${Math.max(pct, stock > 0 ? 4 : 0)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stock History + Report */}
        <div className="lg:col-span-2 flex flex-col gap-5 w-full">
          <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-ink mb-3">📊 Inventory Report</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['All Titles', books ? String(books.length) : '…'],
                ['All Units', books ? formatNumber(totalUnits) : '…'],
                ['Inventory Value', books ? formatAED(inventoryValue) : '…'],
                ['Avg Price', books && books.length ? formatAED(inventoryValue / books.length) : '…'],
                ['In Stock Titles', String(healthy)],
                ['Low Stock Titles', String(low)],
                ['Out of Stock Titles', String(out)],
                ['Stock at Risk', String(low + out)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-dashed border-line pb-1">
                  <span className="text-muted font-semibold uppercase tracking-wide">{k}</span>
                  <span className="font-bold text-ink">{v}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted mt-3">Report date: {new Date().toLocaleDateString()}. Use “Export CSV” for a full inventory report.</p>
          </div>

          <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-ink mb-3">🕘 Stock History</h2>
            <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
              {logs === null && <p className="text-sm text-muted">Loading history…</p>}
              {logs && !logs.length && <p className="text-sm text-muted">No stock adjustments yet. Use Add/Remove to record one.</p>}
              {logs?.map((l) => (
                <div key={l.id} className="flex items-start justify-between gap-3 border-b border-line last:border-0 py-1.5 text-xs">
                  <div className="min-w-0">
                    <p className="font-bold text-ink truncate">{l.title}</p>
                    <p className="text-muted truncate">{l.reason} · {l.createdBy || 'admin'} · {new Date(l.createdAt).toLocaleString()}</p>
                  </div>
                  <span className={`font-extrabold shrink-0 ${l.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {l.change > 0 ? `+${l.change}` : l.change}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------- Discounts / Coupons --------------------- */

function DiscountsTab() {
  const [discounts, setDiscounts] = useState<DiscountItem[] | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ code: '', type: 'PERCENT', value: '10', minOrder: '0', maxUses: '', expiresAt: '' });
  const [busy, setBusy] = useState('');

  const load = useCallback(() => {
    api
      .adminDiscounts()
      .then((res) => setDiscounts(res.discounts))
      .catch((e) => setError((e as Error).message));
  }, []);

  useEffect(load, [load]);

  async function add() {
    setError('');
    try {
      await api.adminCreateDiscount({
        code: form.code,
        type: form.type,
        value: Number(form.value),
        minOrder: Number(form.minOrder),
        maxUses: form.maxUses ? Number(form.maxUses) : undefined,
        expiresAt: form.expiresAt || undefined,
      });
      setForm({ code: '', type: 'PERCENT', value: '10', minOrder: '0', maxUses: '', expiresAt: '' });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function toggle(d: DiscountItem) {
    try {
      await api.adminUpdateDiscount(d.id, { active: !d.active });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remove(d: DiscountItem) {
    if (!window.confirm(`Delete coupon ${d.code}?`)) return;
    setBusy(d.id);
    try {
      await api.adminDeleteDiscount(d.id);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy('');
  }

  const expired = (d: DiscountItem) => d.expiresAt && new Date(d.expiresAt) < new Date();
  const maxed = (d: DiscountItem) => d.maxUses != null && (d.usedCount || 0) >= d.maxUses;

  return (
    <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
      <h2 className="font-bold text-ink mb-4">Discount / Coupon System</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
        <input
          value={form.code}
          onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
          placeholder="CODE e.g. ALIO10"
          className="border-2 border-line rounded-xl px-3 py-2 text-sm uppercase focus:border-brand focus:outline-none"
        />
        <select
          value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
          className="border-2 border-line rounded-xl px-3 py-2 text-sm bg-white focus:border-brand focus:outline-none"
        >
          <option value="PERCENT">Percent (%)</option>
          <option value="FIXED">Fixed (AED)</option>
        </select>
        <input
          value={form.value}
          onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
          type="number"
          min="0"
          step="0.01"
          placeholder={form.type === 'PERCENT' ? '% off' : 'AED off'}
          className="border-2 border-line rounded-xl px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
        <input
          value={form.minOrder}
          onChange={(e) => setForm((f) => ({ ...f, minOrder: e.target.value }))}
          type="number"
          min="0"
          step="0.01"
          placeholder="Min order (AED)"
          className="border-2 border-line rounded-xl px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
        <input
          value={form.maxUses}
          onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
          type="number"
          min="0"
          placeholder="Max uses (blank = ∞)"
          className="border-2 border-line rounded-xl px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
        <input
          value={form.expiresAt}
          onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
          type="date"
          placeholder="Expires"
          className="border-2 border-line rounded-xl px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
        <button onClick={add} className="btn-flash btn-primary-flash lg:col-span-6">Create Coupon</button>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">{error}</p>}

      <div className="flex flex-col gap-2">
        {discounts === null && <p className="text-sm text-muted">Loading coupons…</p>}
        {discounts?.map((d) => {
          const eff = d.type === 'PERCENT' ? (d.value >= 100 ? 100 : d.value) : Math.min(d.value, 100);
          const isExpired = expired(d);
          const isMaxed = maxed(d);
          const dead = !d.active || isExpired || isMaxed;
          return (
            <div key={d.id} className="flex flex-wrap justify-between items-center gap-2 text-sm border-b border-line last:border-0 pb-2">
              <div>
                <p className="font-bold text-ink">
                  {d.code}{' '}
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${
                    dead ? 'bg-slate-100 text-slate-500 border-slate-300' : 'bg-green-50 text-green-700 border-green-300'
                  }`}>
                    {isExpired ? 'EXPIRED' : isMaxed ? 'MAX USES' : d.active ? 'ACTIVE' : 'PAUSED'}
                  </span>
                </p>
                <p className="text-xs text-muted">
                  {d.type === 'PERCENT' ? `${d.value}% off` : `AED ${d.value} off`} · min order {formatAED(d.minOrder)} · e.g. AED 100 → −{formatAED(eff)} → {formatAED(100 - eff)}
                </p>
                <p className="text-xs text-muted">
                  🎫 Used {d.usedCount || 0}{d.maxUses != null ? ` / ${d.maxUses}` : ' (unlimited)'} · {d.expiresAt ? `⏰ expires ${new Date(d.expiresAt).toLocaleDateString()}` : 'Never expires'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => toggle(d)} className="text-xs font-bold text-accent-dark hover:underline">
                  {d.active ? 'Pause' : 'Activate'}
                </button>
                <button
                  onClick={() => remove(d)}
                  disabled={busy === d.id}
                  className="text-xs font-bold text-red-600 hover:underline disabled:opacity-50"
                >
                  {busy === d.id ? '…' : 'Delete'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {discounts && discounts.length === 0 && (
        <p className="text-sm text-muted mt-3">No coupons yet. Create e.g. <strong>ALIO10</strong> for 10% off.</p>
      )}
    </div>
  );
}

/* --------------------- Reviews --------------------- */

function ReviewsTab() {
  const [rows, setRows] = useState<{ id: string; rating: number; text: string; status: string; createdAt: string; book: { slug: string; title: string; image: string } | null; user: { id: string; name: string; email: string } | null }[] | null>(null);
  const [pending, setPending] = useState(0);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(() => {
    api
      .adminReviews(filter || undefined)
      .then((res) => {
        setRows(res.reviews);
        setPending(res.pending);
      })
      .catch((e) => setError((e as Error).message));
  }, [filter]);

  useEffect(load, [load]);

  async function moderate(id: string, status: 'APPROVED' | 'REJECTED') {
    setBusy(id);
    try {
      await api.adminModerateReview(id, status);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy('');
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this review permanently?')) return;
    setBusy(id);
    try {
      await api.adminDeleteReview(id);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy('');
  }

  return (
    <div>
      <div className="flex gap-2 mb-5 overflow-x-auto">
        {['', 'PENDING', 'APPROVED', 'REJECTED'].map((s) => (
          <button
            key={s || 'ALL'}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
              filter === s ? 'bg-brand text-white' : 'bg-white border border-line text-ink'
            }`}
          >
            {s || 'All'}
            {s === 'PENDING' && pending > 0 && <span className="ml-1.5 bg-amber-400 text-brand rounded-full px-1.5 text-[10px]">{pending}</span>}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4 mb-4">{error}</p>}
      <div className="flex flex-col gap-3">
        {rows === null && <p className="text-sm text-muted">Loading reviews…</p>}
        {rows && !rows.length && <p className="text-sm text-muted">No reviews here.</p>}
        {rows?.map((r) => (
          <div key={r.id} className="bg-white border border-line rounded-2xl p-5 shadow-sm">
            <div className="flex flex-wrap justify-between gap-2 mb-1">
              <div>
                <p className="font-bold text-ink text-sm">{r.book?.title || 'Book'}</p>
                <p className="text-xs text-muted">
                  {r.user?.name} ({r.user?.email}) · <Stars n={r.rating} /> {r.rating}/5 · {new Date(r.createdAt).toLocaleDateString()}
                </p>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border self-start ${
                r.status === 'APPROVED'
                  ? 'bg-green-50 text-green-700 border-green-300'
                  : r.status === 'REJECTED'
                    ? 'bg-red-50 text-red-600 border-red-300'
                    : 'bg-amber-50 text-amber-700 border-amber-300'
              }`}>
                {r.status}
              </span>
            </div>
            {r.text && <p className="text-sm text-ink mt-2">{r.text}</p>}
            {r.status !== 'APPROVED' && (
              <div className="flex gap-2 mt-3">
                <button onClick={() => moderate(r.id, 'APPROVED')} disabled={busy === r.id} className="text-xs font-bold bg-green-600 text-white rounded-lg px-3 py-1.5 hover:bg-green-700 disabled:opacity-50">
                  ✓ Approve
                </button>
                <button onClick={() => moderate(r.id, 'REJECTED')} disabled={busy === r.id} className="text-xs font-bold bg-red-500 text-white rounded-lg px-3 py-1.5 hover:bg-red-600 disabled:opacity-50">
                  ✕ Reject
                </button>
                <button onClick={() => remove(r.id)} disabled={busy === r.id} className="text-xs font-bold border border-red-200 text-red-600 rounded-lg px-3 py-1.5 hover:bg-red-50 disabled:opacity-50">
                  🗑 Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* --------------------- Analytics --------------------- */

function AnalyticsTab() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [days, setDays] = useState(14);
  const [error, setError] = useState('');

  useEffect(() => {
    setData(null);
    Promise.all([api.adminAnalytics(days), api.adminOrders({ pageSize: 1000 })])
      .then(([a, o]) => {
        setData(a);
        setOrders(o.orders);
      })
      .catch((e) => setError((e as Error).message));
  }, [days]);

  if (error) return <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">{error}</p>;
  if (!data) return <p className="text-sm text-muted">Loading analytics…</p>;

  const ov = data.overview;
  const paidOrders = (orders || []).filter((o) => !['CANCELLED', 'PENDING'].includes(o.status || ''));
  const orderCountBySlug = new Map<string, number>();
  for (const o of paidOrders) {
    for (const it of o.items || []) {
      const key = it.id || '';
      if (key) orderCountBySlug.set(key, (orderCountBySlug.get(key) || 0) + 1);
    }
  }

  const cards = [
    { label: 'Page Views', value: formatNumber(ov.pageViews), icon: '👁️' },
    { label: 'Unique Visitors', value: formatNumber(ov.uniqueVisitors), icon: '🧑‍🤝‍🧑' },
    { label: 'Product Views', value: formatNumber(ov.productViews), icon: '📚' },
    { label: 'Add to Cart', value: formatNumber(ov.addToCarts ?? 0), icon: '🛒' },
    { label: 'Avg. Time on Site', value: `${ov.avgSessionMinutes ?? 0}m`, icon: '⏱️' },
    { label: 'Products Viewed', value: formatNumber(ov.distinctProducts), icon: '🎯' },
    { label: 'Returning Visitors', value: formatNumber(ov.returningVisitors), icon: '🔁' },
    { label: 'Visits Today', value: formatNumber(ov.visitsToday), icon: '⚡' },
  ];

  const charts = [
    { title: 'Page views', total: data.perDay.reduce((s, p) => s + p.pageViews, 0), points: data.perDay.map((p) => ({ label: p.label, value: p.pageViews })), color: 'from-accent to-accent-dark' },
    { title: 'Product views', total: data.perDay.reduce((s, p) => s + p.productViews, 0), points: data.perDay.map((p) => ({ label: p.label, value: p.productViews })), color: 'from-brand to-accent-dark' },
    { title: 'Add to cart', total: data.perDay.reduce((s, p) => s + (p.addToCarts ?? 0), 0), points: data.perDay.map((p) => ({ label: p.label, value: p.addToCarts ?? 0 })), color: 'from-amber-400 to-amber-500' },
  ];
  const topViews = data.topProducts[0]?.views || 1;

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    return Math.floor(h / 24) + 'd ago';
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-extrabold text-brand text-lg">Visitors & Activity</h2>
          <p className="text-xs text-muted">Anonymous, privacy-safe tracking — no personal data is collected.</p>
        </div>
        <div className="flex gap-1.5">
          {[7, 14, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${days === d ? 'bg-brand text-white border-brand' : 'bg-white border-line text-ink hover:border-brand'}`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="bg-white border border-line rounded-2xl p-4 shadow-sm">
            <p className="text-[11px] text-muted font-semibold">{c.icon} {c.label}</p>
            <p className="text-xl font-extrabold text-brand mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {charts.map((chart) => {
          const max = Math.max(1, ...chart.points.map((p) => p.value));
          return (
            <div key={chart.title} className="bg-white border border-line rounded-2xl p-5 shadow-sm">
              <div className="flex items-baseline justify-between mb-1">
                <h3 className="text-sm font-bold text-ink">{chart.title}</h3>
                <span className="text-xs font-extrabold text-brand">{formatNumber(chart.total)}</span>
              </div>
              <div className="flex items-end gap-1.5 h-32 mt-2">
                {chart.points.map((p) => (
                  <div key={p.label} className="flex-1 flex flex-col items-center justify-end gap-0.5 h-full min-w-0">
                    <div
                      className={`w-full rounded-t-md bg-gradient-to-t ${chart.color}`}
                      style={{ height: `${Math.max(3, (p.value / max) * 100)}%` }}
                      title={`${p.label}: ${p.value}`}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5 mt-1">
                {chart.points.map((p) => (
                  <span key={p.label} className="flex-1 text-center text-[9px] text-muted truncate">{p.label}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-ink mb-3">Most viewed products</h2>
          {data.topProducts.length ? (
            <div className="flex flex-col divide-y divide-line">
              {data.topProducts.map((p, i) => (
                <div key={p.bookId} className="flex items-center gap-3 py-2.5">
                  <span className="w-5 text-xs font-extrabold text-muted">{i + 1}</span>
                  {p.image ? (
                    <Image src={p.image} alt={p.title} width={28} height={38} className="object-contain rounded" />
                  ) : (
                    <div className="w-7 h-9 bg-slate-100 rounded" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink truncate">{p.title}</p>
                    <p className="text-[11px] text-muted">
                      /books/{p.slug} · <span className="text-green-700 font-semibold">{orderCountBySlug.get(p.slug) || 0} purchased</span>
                      <span className="ml-2">🛒 {p.carts ?? 0} added</span>
                    </p>
                  </div>
                  <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                    <div className="h-full bg-accent rounded-full" style={{ width: `${Math.round((p.views / topViews) * 100)}%` }} />
                  </div>
                  <span className="text-xs font-extrabold text-brand w-14 text-right">{p.views}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No product views this period yet.</p>
          )}
        </div>

        <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-ink mb-3">Top pages</h2>
          {data.topPages.length ? (
            <div className="flex flex-col divide-y divide-line">
              {data.topPages.map((p) => (
                <div key={p.path} className="flex items-center gap-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">{p.path || '/'}</p>
                  </div>
                  <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                    <div className="h-full bg-brand rounded-full" style={{ width: `${Math.round((p.views / data.topPages[0].views) * 100)}%` }} />
                  </div>
                  <span className="text-xs font-extrabold text-brand w-10 text-right">{p.views}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No page views recorded this period.</p>
          )}

          <h2 className="font-bold text-ink mt-6 mb-3">Traffic sources</h2>
          {data.referrers.length ? (
            <div className="flex flex-wrap gap-2">
              {data.referrers.map((r) => (
                <span key={r.referrer} className="text-xs font-bold bg-accent/10 text-brand rounded-lg px-2.5 py-1.5 border border-line">
                  {r.referrer} · {r.count}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No referrer data yet.</p>
          )}

          <h2 className="font-bold text-ink mt-6 mb-3">Devices</h2>
          {data.devices.length ? (
            <div className="flex flex-col gap-2">
              {data.devices.map((d) => {
                const total = data.devices.reduce((s, x) => s + x.count, 0) || 1;
                const pct = Math.round(((d.count || 0) / total) * 100);
                return (
                  <div key={d.device}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-bold text-ink">{d.device}</span>
                      <span className="text-muted">{d.count} · {pct}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted">No device data yet.</p>
          )}
        </div>
      </div>

      <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
        <h2 className="font-bold text-ink mb-3">Recent visitors</h2>
        {data.recent.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-muted uppercase tracking-wide border-b border-line">
                  <th className="py-2 pr-3">Visitor</th>
                  <th className="py-2 pr-3">Action</th>
                  <th className="py-2 pr-3">Page</th>
                  <th className="py-2 pr-3">Device</th>
                  <th className="py-2 text-right">When</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((r) => (
                  <tr key={r.id} className="border-b border-line/60 last:border-0">
                    <td className="py-2 pr-3 font-mono text-xs text-ink">{r.visitorId.slice(0, 8)}…</td>
<td className="py-2 pr-3">
  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${r.event === 'product_view' ? 'bg-accent/15 text-brand' : r.event === 'add_to_cart' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
    {r.event === 'product_view' ? '📚 Product view' : r.event === 'add_to_cart' ? '🛒 Add to cart' : '👁️ Page view'}
  </span>
</td>
                    <td className="py-2 pr-3 text-xs text-ink truncate max-w-[220px]">
                      {r.event === 'product_view' && r.bookTitle ? r.bookTitle : r.path || '/'}
                    </td>
                    <td className="py-2 pr-3 text-xs text-muted">{r.device || '—'}</td>
                    <td className="py-2 text-xs text-muted text-right whitespace-nowrap">{timeAgo(r.at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">No visits recorded yet. Open the storefront to start collecting data.</p>
        )}
      </div>
    </div>
  );
}

/* --------------------- Reports --------------------- */

function ReportsTab() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.adminStats(), api.adminOrders({ pageSize: 1000 })])
      .then(([s, o]) => {
        setStats(s);
        setOrders(o.orders);
      })
      .catch((e) => setError((e as Error).message));
  }, []);

  if (error) return <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">{error}</p>;

  const paid = (orders || []).filter((o) => !['CANCELLED', 'PENDING'].includes(o.status || ''));
  const revenue = stats?.revenue ?? paid.reduce((s, o) => s + o.total, 0);
  const avg = paid.length ? revenue / paid.length : 0;

  const days: { label: string; sum: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toDateString();
    const sum = paid
      .filter((o) => o.placedAt && new Date(o.placedAt).toDateString() === key)
      .reduce((s, o) => s + o.total, 0);
    days.push({ label: d.toLocaleDateString('en-US', { weekday: 'short' }), sum: Math.round(sum) });
  }
  const maxDay = Math.max(1, ...days.map((d) => d.sum));

  const statusCounts = ORDER_STATUSES.map((s) => ({
    status: s,
    count: (orders || []).filter((o) => o.status === s).length,
  }));

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Orders', value: formatNumber(orders?.length || 0) },
          { label: 'Total Revenue', value: formatAED(stats?.revenue || 0) },
          { label: 'Avg Order (AED)', value: avg ? formatAED(avg) : '—' },
          { label: 'Books', value: formatNumber(stats?.bookCount || 0) },
          { label: 'Customers', value: formatNumber(stats?.userCount || 0) },
        ].map((c) => (
          <div key={c.label} className="bg-white border border-line rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-muted font-semibold uppercase tracking-wide">{c.label}</p>
            <p className="text-xl font-extrabold text-brand mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-ink mb-2">Revenue — last 7 days</h2>
          {orders === null ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : (
            <div className="flex items-end gap-3 h-40 mt-4">
              {days.map((d) => (
                <div key={d.label} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <span className="text-[10px] text-muted">{d.sum > 0 ? formatAED(d.sum) : ''}</span>
                  <div
                    className="w-full max-w-[40px] rounded-t-md bg-gradient-to-t from-accent to-accent-dark"
                    style={{ height: `${Math.max(4, (d.sum / maxDay) * 100)}%` }}
                  />
                  <span className="text-[10px] text-muted">{d.label}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted mt-4">Based on orders in paid states (PAID / SHIPPED / DELIVERED).</p>
        </div>

        <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-ink mb-4">Orders by status</h2>
          <div className="flex flex-col gap-2">
            {statusCounts.map((s) => {
              const total = orders?.length || 1;
              const pct = Math.round(((s.count || 0) / total) * 100);
              return (
                <div key={s.status}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-bold text-ink">{s.status}</span>
                    <span className="text-muted">{s.count} · {pct}%</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------- Carts --------------------- */

function CartsTab() {
  const [data, setData] = useState<{ carts: AdminCart[]; total: number; activeCount: number; abandonedCount: number; totalValue: number } | null>(null);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState('');

  const load = useCallback(() => {
    api
      .adminCarts()
      .then(setData)
      .catch((e) => setError((e as Error).message));
  }, []);

  useEffect(load, [load]);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Carts', value: data ? formatNumber(data.total) : '…' },
          { label: '🛒 Active', value: data ? formatNumber(data.activeCount) : '…' },
          { label: '🕓 Abandoned (>24h)', value: data ? formatNumber(data.abandonedCount) : '…' },
          { label: '💰 Cart Value', value: data ? formatAED(data.totalValue) : '…' },
        ].map((c) => (
          <div key={c.label} className="bg-white border border-line rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-muted font-semibold uppercase">{c.label}</p>
            <p className="text-xl font-extrabold text-brand mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">{error}</p>}

      <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
        <h2 className="font-bold text-ink mb-3">Shopping Carts ({data ? data.carts.length : '…'})</h2>
        <div className="flex flex-col gap-3">
          {data === null && <p className="text-sm text-muted">Loading carts…</p>}
          {data && !data.carts.length && <p className="text-sm text-muted">No carts found.</p>}
          {data?.carts.map((c) => {
            const expanded = openId === c.id;
            return (
              <div key={c.id} className={`border ${expanded ? 'border-brand' : 'border-line'} rounded-xl p-3`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-ink">{c.name || 'Guest cart'}</p>
                    <p className="text-xs text-muted">
                      📧 {c.email || 'no email'} · 🕓 last active {new Date(c.lastActive).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-brand">{formatAED(c.value)}</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg border ${c.lastActive && Date.now() - new Date(c.lastActive).getTime() > 86400000 ? 'bg-amber-50 text-amber-700 border-amber-300' : 'bg-green-50 text-green-700 border-green-300'}`}>
                      {c.lastActive && Date.now() - new Date(c.lastActive).getTime() > 86400000 ? 'Abandoned' : 'Active'}
                    </span>
                    <button onClick={() => setOpenId(expanded ? '' : c.id)} className="text-xs font-bold text-accent-dark hover:underline">
                      {expanded ? 'Hide' : 'View'}
                    </button>
                  </div>
                </div>
                {expanded && (
                  <div className="mt-3 border-t border-line pt-3">
                    <ul className="space-y-1.5 text-sm">
                      {c.items.length === 0 && <li className="text-muted">Empty cart.</li>}
                      {c.items.map((it, i) => (
                        <li key={i} className="flex justify-between gap-3">
                          <span className="text-ink">{it.title} × {it.qty}</span>
                          <span className="font-semibold whitespace-nowrap">{formatAED(it.qty * it.price)}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-muted mt-3 italic">Tip: reach out to this customer to recover an abandoned cart.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* --------------------- Payments --------------------- */

function PaymentsTab() {
  const [data, setData] = useState<{ summary: { successful: number; pending: number; failed: number; refunded: number; unpaid: number; total: number; totalAmount: number; successfulAmount: number }; transactions: PaymentTransaction[] } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .adminPayments()
      .then(setData)
      .catch((e) => setError((e as Error).message));
  }, []);

  const cards = [
    { label: 'Successful', value: data ? formatNumber(data.summary.successful) : '…', sub: data ? formatAED(data.summary.successfulAmount) : '', style: 'bg-green-50 text-green-700 border-green-300' },
    { label: 'Pending', value: data ? formatNumber(data.summary.pending) : '…', sub: '', style: 'bg-amber-50 text-amber-700 border-amber-300' },
    { label: 'Failed', value: data ? formatNumber(data.summary.failed) : '…', sub: '', style: 'bg-red-50 text-red-600 border-red-300' },
    { label: 'Refunded', value: data ? formatNumber(data.summary.refunded) : '…', sub: '', style: 'bg-rose-50 text-rose-600 border-rose-300' },
    { label: 'Unpaid / COD', value: data ? formatNumber(data.summary.unpaid) : '…', sub: '', style: 'bg-slate-50 text-slate-700 border-slate-300' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="bg-white border border-line rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-muted font-semibold uppercase">{c.label}</p>
            <p className={`text-xl font-extrabold mt-1 ${c.style.split(' ')[1]}`}>{c.value}</p>
            {c.sub && <p className={`text-xs font-bold ${c.style.split(' ')[1]}`}>{c.sub}</p>}
          </div>
        ))}
      </div>
      <div className="flex items-end justify-end gap-4 bg-white border border-line rounded-2xl p-4 shadow-sm">
        <div>
          <p className="text-xs text-muted uppercase font-semibold">Total Transactions</p>
          <p className="text-lg font-extrabold text-brand">{data ? formatNumber(data.summary.total) : '…'}</p>
        </div>
        <div>
          <p className="text-xs text-muted uppercase font-semibold">Total Value</p>
          <p className="text-lg font-extrabold text-accent-dark">{data ? formatAED(data.summary.totalAmount) : '…'}</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">{error}</p>}

      <div className="bg-white border border-line rounded-2xl p-5 shadow-sm overflow-x-auto">
        <h2 className="font-bold text-ink mb-3">Payment Transactions ({data ? data.transactions.length : '…'})</h2>
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-line">
              <th className="py-2 pr-3">Reference</th>
              <th className="py-2 pr-3">Method</th>
              <th className="py-2 pr-3">Provider</th>
              <th className="py-2 pr-3">Transaction ID</th>
              <th className="py-2 pr-3">Amount</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {data === null && <tr><td colSpan={7} className="py-4 text-muted">Loading…</td></tr>}
            {data && !data.transactions.length && <tr><td colSpan={7} className="py-4 text-muted">No transactions.</td></tr>}
            {data?.transactions.map((t) => (
              <tr key={t.id} className="border-b border-line last:border-0">
                <td className="py-2 pr-3 font-bold text-ink">{t.reference || '—'}</td>
                <td className="py-2 pr-3">{t.method || '—'}</td>
                <td className="py-2 pr-3">{t.provider || '—'}</td>
                <td className="py-2 pr-3 text-muted text-xs">{t.transactionId || '—'}</td>
                <td className="py-2 pr-3 font-bold">{formatAED(t.amount)}</td>
                <td className="py-2 pr-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${STATUS_COLOR[t.status] || 'bg-slate-50 text-slate-600 border-slate-300'}`}>
                    {t.status || '—'}
                  </span>
                </td>
                <td className="py-2 text-muted text-xs">{t.date ? new Date(t.date).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* --------------------- Shipping --------------------- */

const SHIPPING_EMPTY_METHOD = { name: '', description: '', cost: '0', freeThreshold: '0', estimatedDays: '3–5 days', active: true };

function ShippingTab() {
  const [data, setData] = useState<ShippingInfo | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState(SHIPPING_EMPTY_METHOD);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [zoneInput, setZoneInput] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(() => {
    api
      .adminShipping()
      .then(setData)
      .catch((e) => setError((e as Error).message));
  }, []);

  useEffect(load, [load]);

  function reset() {
    setEditingId(null);
    setForm(SHIPPING_EMPTY_METHOD);
  }

  async function saveMethod() {
    setError('');
    if (!form.name.trim()) {
      setError('Shipping method name is required.');
      return;
    }
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      cost: Number(form.cost) || 0,
      freeThreshold: Number(form.freeThreshold) || 0,
      estimatedDays: form.estimatedDays,
      active: form.active,
    };
    try {
      if (editingId) await api.adminUpdateShippingMethod(editingId, payload);
      else await api.adminCreateShippingMethod(payload);
      reset();
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function startEdit(m: ShippingMethod) {
    setEditingId(m.id);
    setForm({ name: m.name, description: m.description, cost: String(m.cost), freeThreshold: String(m.freeThreshold), estimatedDays: m.estimatedDays, active: m.active });
  }

  async function toggleMethod(m: ShippingMethod) {
    try {
      await api.adminUpdateShippingMethod(m.id, { active: !m.active });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function deleteMethod(m: ShippingMethod) {
    if (!window.confirm(`Delete shipping method "${m.name}"?`)) return;
    setBusy(m.id);
    try {
      await api.adminDeleteShippingMethod(m.id);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy('');
  }

  async function addZone() {
    if (!zoneInput.trim()) return;
    try {
      await api.adminCreateShippingZone({ name: zoneInput.trim(), countries: [zoneInput.trim()], enabled: true });
      setZoneInput('');
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function toggleZone(z: ShippingZone) {
    try {
      await api.adminUpdateShippingZone(z.id, { enabled: !z.enabled });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function deleteZone(z: ShippingZone) {
    if (!window.confirm(`Delete shipping zone "${z.name}"?`)) return;
    try {
      await api.adminDeleteShippingZone(z.id);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function toggleProvider(p: ShippingProvider) {
    try {
      await api.adminSetShippingProvider(p.id, { enabled: !p.enabled });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Shipping Methods', value: data ? formatNumber(data.methods.length) : '…' },
          { label: 'Active Methods', value: data ? formatNumber(data.methods.filter((m) => m.active).length) : '…' },
          { label: 'Shipping Zones', value: data ? formatNumber(data.zones.length) : '…' },
          { label: 'Providers', value: data ? formatNumber(data.providers.filter((p) => p.enabled).length) + ' / ' + formatNumber(data.providers.length) : '…' },
        ].map((c) => (
          <div key={c.label} className="bg-white border border-line rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-muted font-semibold uppercase">{c.label}</p>
            <p className="text-xl font-extrabold text-brand mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">{error}</p>}

      <div className="grid lg:grid-cols-2 gap-5 items-start">
        {/* Methods */}
        <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-ink mb-3">🚚 Shipping Methods</h2>
          <div className="flex flex-col gap-2 border-b border-line pb-3 mb-3">
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Method name e.g. Express Delivery" className="border-2 border-line rounded-lg px-2 py-1.5 text-sm focus:border-brand focus:outline-none" />
            <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Description" className="border-2 border-line rounded-lg px-2 py-1.5 text-sm focus:border-brand focus:outline-none" />
            <div className="grid grid-cols-3 gap-2">
              <input value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} type="number" min="0" step="0.01" placeholder="Cost AED" className="border-2 border-line rounded-lg px-2 py-1.5 text-sm focus:border-brand focus:outline-none" />
              <input value={form.freeThreshold} onChange={(e) => setForm((f) => ({ ...f, freeThreshold: e.target.value }))} type="number" min="0" step="0.01" placeholder="Free ≥ AED" className="border-2 border-line rounded-lg px-2 py-1.5 text-sm focus:border-brand focus:outline-none" />
              <input value={form.estimatedDays} onChange={(e) => setForm((f) => ({ ...f, estimatedDays: e.target.value }))} placeholder="ETA e.g. 1–2 days" className="border-2 border-line rounded-lg px-2 py-1.5 text-sm focus:border-brand focus:outline-none" />
            </div>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
              Active method (available at checkout)
            </label>
            <div className="flex gap-2">
              <button onClick={saveMethod} className="btn-flash btn-primary-flash">{editingId ? 'Update Method' : 'Add Method'}</button>
              {editingId && <button onClick={reset} className="text-xs font-bold text-muted hover:underline">Cancel</button>}
            </div>
          </div>
          {data?.methods.map((m) => (
            <div key={m.id} className="flex flex-wrap justify-between items-center gap-2 border-b border-line last:border-0 py-2 text-sm">
              <div>
                <p className="font-bold text-ink">
                  {m.name} <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${m.active ? 'bg-green-50 text-green-700 border-green-300' : 'bg-slate-100 text-slate-500 border-slate-300'}`}>{m.active ? 'ACTIVE' : 'PAUSED'}</span>
                </p>
                <p className="text-xs text-muted">{m.description} · {m.estimatedDays}</p>
                <p className="text-xs text-ink font-semibold">{m.cost ? formatAED(m.cost) : 'FREE'} {m.freeThreshold > 0 ? `· free over ${formatAED(m.freeThreshold)}` : ''}</p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button onClick={() => toggleMethod(m)} className="font-bold text-accent-dark hover:underline">{m.active ? 'Pause' : 'Activate'}</button>
                <button onClick={() => startEdit(m)} className="font-bold text-brand hover:underline">Edit</button>
                <button onClick={() => deleteMethod(m)} disabled={busy === m.id} className="font-bold text-red-600 hover:underline disabled:opacity-50">{busy === m.id ? '…' : 'Delete'}</button>
              </div>
            </div>
          ))}
        </div>

        {/* Zones + Providers */}
        <div className="flex flex-col gap-5">
          <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-ink mb-3">🌍 Shipping Zones</h2>
            <div className="flex gap-2 mb-3">
              <input value={zoneInput} onChange={(e) => setZoneInput(e.target.value)} placeholder="New zone e.g. GCC" className="flex-1 border-2 border-line rounded-lg px-2 py-1.5 text-sm focus:border-brand focus:outline-none" />
              <button onClick={addZone} className="btn-flash btn-primary-flash">Add Zone</button>
            </div>
            {data?.zones.map((z) => (
              <div key={z.id} className="flex flex-wrap justify-between items-center gap-2 border-b border-line last:border-0 py-2 text-sm">
                <div>
                  <p className="font-bold text-ink">{z.name}</p>
                  <p className="text-xs text-muted">{z.countries.length ? z.countries.join(', ') : 'No countries yet'}</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${z.enabled ? 'bg-green-50 text-green-700 border-green-300' : 'bg-slate-100 text-slate-500 border-slate-300'}`}>{z.enabled ? 'Enabled' : 'Disabled'}</span>
                  <button onClick={() => toggleZone(z)} className="font-bold text-accent-dark hover:underline">{z.enabled ? 'Disable' : 'Enable'}</button>
                  <button onClick={() => deleteZone(z)} className="font-bold text-red-600 hover:underline">Delete</button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-ink mb-3">📦 Shipping Providers</h2>
            {data?.providers.map((p) => (
              <div key={p.id} className="flex flex-wrap justify-between items-center gap-2 border-b border-line last:border-0 py-2 text-sm">
                <div>
                  <p className="font-bold text-ink">{p.name}</p>
                  <p className="text-xs text-muted">Max weight {p.weightLimitKg} kg</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${p.enabled ? 'bg-green-50 text-green-700 border-green-300' : 'bg-slate-100 text-slate-500 border-slate-300'}`}>{p.enabled ? 'Connected' : 'Paused'}</span>
                  <button onClick={() => toggleProvider(p)} className="font-bold text-accent-dark hover:underline">{p.enabled ? 'Pause' : 'Connect'}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted bg-accent/20 border border-accent rounded-xl p-3">
        💡 Tracking numbers, provider and estimated delivery are managed per order from the <b>Orders</b> tab. Delivery status follows the order pipeline.
      </p>
    </div>
  );
}

/* --------------------- Notifications --------------------- */

const NOTIF_FILTERS: { key: string; label: string; icon: string; match: (n: BroadcastNotification) => boolean }[] = [
  { key: 'all', label: 'All Notifications', icon: '🔔', match: () => true },
  { key: 'orders', label: 'New Orders', icon: '🛒', match: (n) => n.category === 'orders' },
  { key: 'payments', label: 'Payments', icon: '💳', match: (n) => n.category === 'payments' },
  { key: 'shipping', label: 'Shipping', icon: '🚚', match: (n) => n.category === 'shipping' },
  { key: 'low-stock', label: 'Low Stock', icon: '⚠️', match: (n) => n.category === 'low-stock' },
  { key: 'customers', label: 'Customers', icon: '👥', match: (n) => n.category === 'customers' },
  { key: 'system', label: 'System Alerts', icon: '🛠️', match: (n) => n.category === 'system' },
];

const NOTIF_CAT_META: Record<string, { icon: string; label: string }> = {
  orders: { icon: '🛒', label: 'New Order' },
  payments: { icon: '💳', label: 'Payment' },
  shipping: { icon: '🚚', label: 'Shipping' },
  'low-stock': { icon: '⚠️', label: 'Low Stock' },
  customers: { icon: '👥', label: 'Customer' },
  system: { icon: '🛠️', label: 'System' },
  general: { icon: '🔔', label: 'General' },
};

const NOTIF_PRIORITIES: { value: string; label: string; badge: string; icon: string }[] = [
  { value: 'LOW', label: 'Low', badge: 'bg-slate-100 text-slate-600 border-slate-300', icon: '🔵' },
  { value: 'NORMAL', label: 'Normal', badge: 'bg-sky-50 text-sky-700 border-sky-300', icon: '⚪' },
  { value: 'HIGH', label: 'High', badge: 'bg-amber-50 text-amber-700 border-amber-300', icon: '🟠' },
  { value: 'URGENT', label: 'Urgent', badge: 'bg-red-50 text-red-700 border-red-300', icon: '🔴' },
];

const NOTIF_AUDIENCES: { value: string; label: string }[] = [
  { value: 'all', label: 'All Customers' },
  { value: 'customers', label: 'Active Customers' },
  { value: 'staff', label: 'Only Staff' },
];

const NOTIF_TYPES: { value: string; label: string; category: string; icon: string }[] = [
  { value: 'SYSTEM', label: 'System Announcement', category: 'system', icon: '🛠️' },
  { value: 'INFO', label: 'Announcement / Info', category: 'general', icon: '📢' },
  { value: 'PROMO', label: 'Promotion', category: 'customers', icon: '🎉' },
  { value: 'SALE', label: 'Sale', category: 'customers', icon: '🏷️' },
  { value: 'SECURITY', label: 'Security', category: 'system', icon: '🔐' },
  { value: 'ORDER', label: 'Order Update', category: 'orders', icon: '🛒' },
  { value: 'PAYMENT', label: 'Payment', category: 'payments', icon: '💳' },
  { value: 'SHIPPING', label: 'Shipping', category: 'shipping', icon: '🚚' },
  { value: 'STOCK', label: 'Stock Alert', category: 'low-stock', icon: '⚠️' },
  { value: 'USER', label: 'Customer Activity', category: 'customers', icon: '👥' },
];

const NOTIF_TEMPLATES: { icon: string; category: string; type: string; priority: string; title: string; message: string; hint: string }[] = [
  { icon: '🛒', category: 'orders', type: 'ORDER', priority: 'HIGH', title: 'New Order Received', message: 'A new order has been placed. Please review the order details and begin processing.', hint: 'A customer places a new order' },
  { icon: '🚚', category: 'shipping', type: 'SHIPPING', priority: 'NORMAL', title: 'Order Shipped', message: "The customer's order has been shipped successfully. Tracking information is available.", hint: 'An order is marked as shipped' },
  { icon: '💳', category: 'payments', type: 'PAYMENT', priority: 'NORMAL', title: 'Payment Successful', message: "Payment has been successfully received for the customer's order.", hint: 'A payment clears successfully' },
  { icon: '⚠️', category: 'low-stock', type: 'STOCK', priority: 'URGENT', title: 'Low Stock Alert', message: 'Stock is running low for one or more books. Please review inventory and restock when necessary.', hint: 'Inventory falls below threshold' },
  { icon: '👥', category: 'customers', type: 'USER', priority: 'LOW', title: 'New Customer Registered', message: 'A new customer has successfully created an account on AlioStore.', hint: 'A new account is created' },
  { icon: '🛠️', category: 'system', type: 'SYSTEM', priority: 'NORMAL', title: 'System Maintenance', message: 'Scheduled system maintenance will take place soon. Some services may be temporarily unavailable.', hint: 'Planned maintenance window' },
];

function NotificationsTab() {
  const [data, setData] = useState<{ broadcasts: BroadcastNotification[]; totals: { total: number; enabled: number; sent: number; byCategory?: Record<string, number> } } | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ audience: 'all', type: 'SYSTEM', priority: 'NORMAL', title: '', message: '', send: true });
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState('');
  const [draftNote, setDraftNote] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const composeRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    api
      .adminNotifications()
      .then(setData)
      .catch((e) => setError((e as Error).message));
  }, []);

  useEffect(load, [load]);

  async function create(sendImmediately?: boolean) {
    setError('');
    if (!form.title.trim() || !form.message.trim()) {
      setError('Title and message are required.');
      return;
    }
    const type = NOTIF_TYPES.find((t) => t.value === form.type) || NOTIF_TYPES[0];
    try {
      await api.adminCreateNotification({
        audience: form.audience,
        type: form.type,
        category: type.category,
        priority: form.priority,
        title: form.title.trim(),
        message: form.message.trim(),
        send: sendImmediately ?? form.send,
      });
      setForm({ audience: 'all', type: 'SYSTEM', priority: 'NORMAL', title: '', message: '', send: true });
      setDraftNote('');
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function useTemplate(t: (typeof NOTIF_TEMPLATES)[number]) {
    setForm((f) => ({ ...f, type: t.type, priority: t.priority, title: t.title, message: t.message }));
    setFilter(t.category);
    setDraftNote(`Template loaded: "${t.title}". Review the draft below, then press SEND NOTIFICATION.`);
    composeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function toggle(n: BroadcastNotification) {
    try {
      await api.adminUpdateNotification(n.id, { enabled: !n.enabled });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remove(n: BroadcastNotification) {
    if (!window.confirm(`Delete notification "${n.title}"?`)) return;
    setBusy(n.id);
    try {
      await api.adminDeleteNotification(n.id);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy('');
  }

  const byCategory = data?.totals.byCategory || {};
  const broadcasts = data?.broadcasts || [];
  const shown = filter === 'all' ? broadcasts : broadcasts.filter((n) => NOTIF_FILTERS.find((f) => f.key === filter)?.match(n) || (n.category || 'general') === filter);
  const reading = broadcasts.find((n) => n.id === openId) || null;
  const priorityBadge = (p?: string) => NOTIF_PRIORITIES.find((x) => x.value === p) || NOTIF_PRIORITIES[1];

  return (
    <div className="flex flex-col gap-5">
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">{error}</p>}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Notifications', value: data ? formatNumber(data.totals.total) : '…' },
          { label: 'Active', value: data ? formatNumber(data.totals.enabled) : '…' },
          { label: 'Messages Sent', value: data ? formatNumber(data.totals.sent) : '…' },
          { label: 'Pending Review', value: data ? formatNumber(broadcasts.filter((n) => n.priority === 'URGENT' || n.priority === 'HIGH').length) : '…' },
        ].map((c) => (
          <div key={c.label} className="bg-white border border-line rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-muted font-semibold uppercase">{c.label}</p>
            <p className="text-xl font-extrabold text-brand mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tree */}
      <div className="bg-white border border-line rounded-2xl p-4 shadow-sm">
        <h2 className="font-bold text-ink mb-3">📂 Notification Categories</h2>
        <div className="flex flex-wrap gap-2">
          {NOTIF_FILTERS.map((f) => {
            const count = f.key === 'all' ? broadcasts.length : broadcasts.filter((n) => (n.category || 'general') === f.key).length;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3.5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition flex items-center gap-2 ${
                  filter === f.key ? 'bg-brand text-white' : 'bg-white border border-line text-ink hover:border-brand'
                }`}
              >
                <span>{f.icon}</span>
                {f.label}
                <span className={`text-xs font-extrabold rounded-full px-2 py-0.5 ${filter === f.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Compose */}
      <div ref={composeRef} className="bg-white border border-brand/30 rounded-2xl p-6 shadow-sm">
        <h2 className="font-bold text-ink mb-1">🔔 Compose Notification</h2>
        <p className="text-xs text-muted mb-4">Send an announcement to customers or staff. Picks the category folder automatically from the type.</p>
        {draftNote && <p className="text-sm text-brand bg-brand/5 border border-brand/20 rounded-xl px-3 py-2 mb-4">{draftNote}</p>}

        <div className="flex flex-col gap-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="block text-sm">
              <span className="font-semibold">Recipient</span>
              <select value={form.audience} onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))} className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 text-sm bg-white focus:border-brand focus:outline-none">
                {NOTIF_AUDIENCES.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-semibold">Notification Type</span>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 text-sm bg-white focus:border-brand focus:outline-none">
                {NOTIF_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-semibold">Priority</span>
              <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 text-sm bg-white focus:border-brand focus:outline-none">
                {NOTIF_PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.icon} {p.label}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-sm">
            <span className="font-semibold">Title</span>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Weekend mega sale is live"
              className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </label>

          <label className="block text-sm">
            <span className="font-semibold">Message</span>
            <textarea
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              rows={3}
              placeholder="Write the notification message here…"
              className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={form.send} onChange={(e) => setForm((f) => ({ ...f, send: e.target.checked }))} className="accent-brand" />
              Send immediately
            </label>
            <button onClick={() => create()} className="btn-flash btn-primary-flash font-extrabold uppercase tracking-wide">
              Send Notification
            </button>
          </div>
        </div>
      </div>

      {/* Quick templates */}
      <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
        <h2 className="font-bold text-ink mb-1">⚡ Quick Templates</h2>
        <p className="text-xs text-muted mb-4">One click to pre-fill a notification for a common store event.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {NOTIF_TEMPLATES.map((t) => (
            <button
              key={t.title}
              onClick={() => useTemplate(t)}
              className="flex items-start gap-3 border border-line rounded-xl p-3 text-left hover:border-brand hover:shadow-sm transition group"
            >
              <span className="text-xl shrink-0 mt-0.5">{t.icon}</span>
              <span className="min-w-0">
                <span className="block font-bold text-sm text-ink group-hover:text-brand transition">{t.title}</span>
                <span className="block text-xs text-muted mt-0.5">{t.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="font-bold text-ink">
            {NOTIF_FILTERS.find((f) => f.key === filter)?.icon} {NOTIF_FILTERS.find((f) => f.key === filter)?.label || 'Notifications'} ({shown.length})
          </h2>
          <span className="text-xs text-muted">Channels: Email · In-app · Push</span>
        </div>
        <div className="flex flex-col gap-2">
          {data === null && <p className="text-sm text-muted">Loading…</p>}
          {data && !shown.length && <p className="text-sm text-muted">No notifications in this category yet.</p>}
          {shown.map((n) => {
            const cat = NOTIF_CAT_META[n.category || 'general'] || NOTIF_CAT_META.general;
            const pr = priorityBadge(n.priority);
            return (
              <div key={n.id} className="flex flex-wrap justify-between items-start gap-2 border-b border-line last:border-0 py-3 text-sm">
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => setOpenId(n.id)}
                    className="font-bold text-ink flex flex-wrap items-center gap-2 text-left hover:text-brand transition"
                  >
                    <span>{cat.icon}</span>
                    {n.title}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${n.enabled ? 'bg-green-50 text-green-700 border-green-300' : 'bg-slate-100 text-slate-500 border-slate-300'}`}>
                      {n.enabled ? 'ACTIVE' : 'PAUSED'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${pr.badge}`}>
                      {pr.icon} {pr.label}
                    </span>
                  </button>
                  <p className="text-xs text-muted mt-1 line-clamp-2">{n.message}</p>
                  <p className="text-xs text-muted mt-1">
                    {cat.label} · To: {n.audience} · Sent to {n.sent} · {new Date(n.at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs shrink-0">
                  <button onClick={() => setOpenId(n.id)} className="font-bold text-brand hover:underline">Read</button>
                  <button onClick={() => toggle(n)} className="font-bold text-accent-dark hover:underline">{n.enabled ? 'Pause' : 'Activate'}</button>
                  <button onClick={() => remove(n)} disabled={busy === n.id} className="font-bold text-red-600 hover:underline disabled:opacity-50">{busy === n.id ? '…' : 'Delete'}</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {reading && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
          onClick={() => setOpenId(null)}
        >
          <div
            className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-line px-6 py-4 flex items-start justify-between gap-3 rounded-t-3xl">
              <div className="min-w-0">
                <p className="text-xs font-bold text-accent-dark uppercase tracking-wide">
                  {(NOTIF_CAT_META[reading.category || 'general'] || NOTIF_CAT_META.general).icon}{' '}
                  {(NOTIF_CAT_META[reading.category || 'general'] || NOTIF_CAT_META.general).label}
                </p>
                <h2 className="text-xl font-extrabold text-brand mt-1 break-words">{reading.title}</h2>
              </div>
              <button
                onClick={() => setOpenId(null)}
                aria-label="Close notification"
                className="shrink-0 w-9 h-9 rounded-full border border-line text-ink hover:bg-slate-100 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5">
              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${reading.enabled ? 'bg-green-50 text-green-700 border-green-300' : 'bg-slate-100 text-slate-500 border-slate-300'}`}>
                  {reading.enabled ? '● ACTIVE' : '● PAUSED'}
                </span>
                {(() => {
                  const pr = priorityBadge(reading.priority);
                  return (
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${pr.badge}`}>
                      {pr.icon} {pr.label} priority
                    </span>
                  );
                })()}
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border border-line bg-slate-50 text-slate-600">
                  👥 {reading.audience}
                </span>
              </div>

              <div className="bg-[#f7f9fc] border border-line rounded-2xl p-4">
                <p className="text-[11px] font-bold text-muted uppercase tracking-wide mb-2">Message</p>
                <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{reading.message}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 text-sm">
                <div className="bg-white border border-line rounded-xl p-3">
                  <p className="text-[11px] text-muted font-semibold uppercase">Type</p>
                  <p className="font-bold text-ink mt-0.5">{reading.type || '—'}</p>
                </div>
                <div className="bg-white border border-line rounded-xl p-3">
                  <p className="text-[11px] text-muted font-semibold uppercase">Sent to</p>
                  <p className="font-bold text-ink mt-0.5">{formatNumber(reading.sent)} recipients</p>
                </div>
                <div className="bg-white border border-line rounded-xl p-3 col-span-2 sm:col-span-1">
                  <p className="text-[11px] text-muted font-semibold uppercase">Created</p>
                  <p className="font-bold text-ink mt-0.5">{new Date(reading.at).toLocaleString()}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-6">
                <button
                  onClick={() => toggle(reading)}
                  className="btn-flash btn-outline-flash text-brand border-brand hover:bg-brand hover:text-white text-sm"
                >
                  {reading.enabled ? 'Pause' : 'Activate'}
                </button>
                <button
                  onClick={() => {
                    const target = reading;
                    setOpenId(null);
                    void remove(target);
                  }}
                  disabled={busy === reading.id}
                  className="btn-flash text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {busy === reading.id ? 'Deleting…' : 'Delete'}
                </button>
                <button
                  onClick={() => setOpenId(null)}
                  className="text-sm font-bold text-muted hover:text-ink ml-auto"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const CONTENT_PAGES: { key: 'privacy' | 'terms' | 'shippingPolicy' | 'refundPolicy'; label: string }[] = [
  { key: 'privacy', label: 'Privacy Policy' },
  { key: 'terms', label: 'Terms & Conditions' },
  { key: 'shippingPolicy', label: 'Shipping Policy' },
  { key: 'refundPolicy', label: 'Refund Policy' },
];

/* --------------------- Website / Content --------------------- */

function WebsiteTab() {
  const [content, setContent] = useState<WebsiteContent | null>(null);
  const [bookOptions, setBookOptions] = useState<Book[]>([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const load = useCallback(() => {
    api
      .adminWebsite()
      .then((res) => setContent(res.content))
      .catch((e) => setError((e as Error).message));
  }, []);

  useEffect(load, [load]);

  useEffect(() => {
    api
      .adminBooks({ sort: 'title' })
      .then((res) => setBookOptions(res.books))
      .catch(() => setBookOptions([]));
  }, []);

  function setHome<K extends keyof HomepageContent>(key: K, value: HomepageContent[K]) {
    setContent((c) => (c ? { ...c, homepage: { ...c.homepage, [key]: value } } : c));
  }

  function setSection<K extends 'featured' | 'newBooks' | 'bestsellers'>(key: K, patch: Partial<HomepageSection>) {
    setContent((c) => (c ? { ...c, homepage: { ...c.homepage, [key]: { ...c.homepage?.[key], ...patch } } } : c));
  }

  function toggleBook(key: 'featured' | 'newBooks' | 'bestsellers', id: string) {
    const cur: string[] = content?.homepage?.[key]?.bookIds || [];
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    setSection(key, { bookIds: next });
  }

  function moveOrder(from: number, to: number) {
    setContent((c) => {
      const order = c?.homepage?.order;
      if (!c || !order) return c;
      const next = order.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { ...c, homepage: { ...c.homepage, order: next } };
    });
  }

  function setPage(key: 'privacy' | 'terms' | 'shippingPolicy' | 'refundPolicy', value: string) {
    setContent((c) => {
      if (!c) return c;
      const pages = c.pages || {};
      return { ...c, pages: { ...pages, [key]: value } };
    });
  }

  function setFaq(index: number, side: 0 | 1, value: string) {
    setContent((c) => {
      if (!c) return c;
      const faq = (c.pages?.faq || []).slice();
      if (!faq[index]) faq[index] = ['', ''];
      faq[index] = side === 0 ? [value, faq[index][1]] : [faq[index][0], value];
      return { ...c, pages: { ...c.pages, faq } };
    });
  }

  function addFaq() {
    setContent((c) => {
      if (!c) return c;
      const faq = (c.pages?.faq || []).slice();
      faq.push(['', '']);
      return { ...c, pages: { ...c.pages, faq } };
    });
  }

  async function save() {
    if (!content) return;
    setBusy(true);
    setMsg(null);
    setError('');
    try {
      await api.adminUpdateWebsite(content);
      setMsg({ ok: true, text: 'Website content saved.' });
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  }

  const h = content?.homepage;
  const sectionOrder = h?.order || ['hero', 'categories', 'featured', 'newBooks', 'bestsellers', 'promotion', 'newsletter'];
  const sectionMeta: Record<HomepageSectionKey, string> = {
    hero: 'Hero',
    categories: 'Categories',
    featured: 'Featured Books',
    newBooks: 'New Books',
    bestsellers: 'Best Sellers',
    promotion: 'Promotion',
    newsletter: 'Newsletter',
  };

  return (
    <div className="flex flex-col gap-5">
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">{error}</p>}
      {msg && <p className={`text-sm ${msg.ok ? 'text-green-700 bg-green-50 border border-green-200' : 'text-red-600 bg-red-50 border border-red-200'} rounded-xl p-4`}>{msg.text}</p>}
      {content === null ? (
        <p className="text-sm text-muted">Loading website content…</p>
      ) : (
        <>
          {/* Section ordering */}
          <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-ink mb-1">☰ Homepage Section Ordering</h2>
            <p className="text-xs text-muted mb-3">Drag the handles (or use the arrows) to reorder what customers see, top to bottom.</p>
            <div className="flex flex-col gap-2">
              {sectionOrder.map((k, i) => (
                <div
                  key={k}
                  draggable
                  onDragStart={() => setDragIndex(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex !== null && dragIndex !== i) moveOrder(dragIndex, i);
                    setDragIndex(null);
                  }}
                  onDragEnd={() => setDragIndex(null)}
                  className={`flex items-center justify-between gap-3 border border-line rounded-xl px-3 py-2.5 cursor-grab active:cursor-grabbing bg-[#f7f9fc] ${dragIndex === i ? 'opacity-60 border-brand' : ''}`}
                >
                  <span className="font-bold text-sm text-ink select-none">☰ {k === 'hero' ? 'Hero — ' : ''}{sectionMeta[k]}</span>
                  <span className="flex items-center gap-1">
                    <button onClick={() => moveOrder(i, Math.max(0, i - 1))} disabled={i === 0} className="w-7 h-7 rounded-lg border border-line text-xs font-bold text-brand hover:bg-brand hover:text-white disabled:opacity-30">↑</button>
                    <button onClick={() => moveOrder(i, Math.min(sectionOrder.length - 1, i + 1))} disabled={i === sectionOrder.length - 1} className="w-7 h-7 rounded-lg border border-line text-xs font-bold text-brand hover:bg-brand hover:text-white disabled:opacity-30">↓</button>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Hero */}
          <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-ink">1. 🎯 Hero Section</h2>
              <Toggle label="Show / Hide" checked={h?.hero?.show !== false} onChange={(v) => setHome('hero', { ...h?.hero, show: v } as HomepageContent['hero'])} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="font-semibold block mb-1">Hero Title</span>
                <input value={h?.hero?.title || ''} onChange={(e) => setHome('hero', { ...h?.hero, title: e.target.value } as HomepageContent['hero'])} className="w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
              </label>
              <label className="block text-sm">
                <span className="font-semibold block mb-1">Hero Image</span>
                <input value={h?.hero?.image || ''} placeholder="/alistore/images/….jpg (optional)" onChange={(e) => setHome('hero', { ...h?.hero, image: e.target.value } as HomepageContent['hero'])} className="w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="font-semibold block mb-1">Hero Subtitle</span>
                <textarea rows={2} value={h?.hero?.subtitle || ''} onChange={(e) => setHome('hero', { ...h?.hero, subtitle: e.target.value } as HomepageContent['hero'])} className="w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
              </label>
              <label className="block text-sm">
                <span className="font-semibold block mb-1">Button Text</span>
                <input value={h?.hero?.buttonText || ''} onChange={(e) => setHome('hero', { ...h?.hero, buttonText: e.target.value } as HomepageContent['hero'])} className="w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
              </label>
              <label className="block text-sm">
                <span className="font-semibold block mb-1">Button Link</span>
                <input value={h?.hero?.buttonLink || ''} placeholder="/books/" onChange={(e) => setHome('hero', { ...h?.hero, buttonLink: e.target.value } as HomepageContent['hero'])} className="w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
              </label>
            </div>
          </div>

          {/* Categories */}
          <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-ink">2. 📚 Categories Section</h2>
              <Toggle label="Show / Hide" checked={h?.categories?.show !== false} onChange={(v) => setHome('categories', { ...h?.categories, show: v } as HomepageContent['categories'])} />
            </div>
            <p className="text-xs text-muted">Category list links automatically from the store catalogue — just use the toggle to show or hide it.</p>
          </div>

          {/* Featured Books */}
          <BookSectionEditor
            title="3. ⭐ Featured Books"
            section={h?.featured}
            options={bookOptions}
            onChange={(patch) => setSection('featured', patch)}
            onToggleBook={(id) => toggleBook('featured', id)}
          />

          {/* New Books */}
          <BookSectionEditor
            title="4. 🆕 New Books"
            section={h?.newBooks}
            options={bookOptions}
            onChange={(patch) => setSection('newBooks', patch)}
            onToggleBook={(id) => toggleBook('newBooks', id)}
          />

          {/* Best Sellers */}
          <BookSectionEditor
            title="5. 🔥 Best Sellers"
            section={h?.bestsellers}
            options={bookOptions}
            onChange={(patch) => setSection('bestsellers', patch)}
            onToggleBook={(id) => toggleBook('bestsellers', id)}
          />

          {/* Promotion */}
          <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-ink">6. 🏷️ Promotional Banner</h2>
              <Toggle label="Show / Hide" checked={h?.promotion?.show !== false} onChange={(v) => setHome('promotion', { ...h?.promotion, show: v } as HomepageContent['promotion'])} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="font-semibold block mb-1">Banner Title</span>
                <input value={h?.promotion?.title || ''} onChange={(e) => setHome('promotion', { ...h?.promotion, title: e.target.value } as HomepageContent['promotion'])} className="w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
              </label>
              <label className="block text-sm">
                <span className="font-semibold block mb-1">Banner Image</span>
                <input value={h?.promotion?.image || ''} placeholder="/alistore/images/….jpg (optional)" onChange={(e) => setHome('promotion', { ...h?.promotion, image: e.target.value } as HomepageContent['promotion'])} className="w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="font-semibold block mb-1">Banner Description</span>
                <textarea rows={2} value={h?.promotion?.description || ''} onChange={(e) => setHome('promotion', { ...h?.promotion, description: e.target.value } as HomepageContent['promotion'])} className="w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
              </label>
              <label className="block text-sm">
                <span className="font-semibold block mb-1">Button Text</span>
                <input value={h?.promotion?.buttonText || ''} onChange={(e) => setHome('promotion', { ...h?.promotion, buttonText: e.target.value } as HomepageContent['promotion'])} className="w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
              </label>
              <label className="block text-sm">
                <span className="font-semibold block mb-1">Button Link</span>
                <input value={h?.promotion?.buttonLink || ''} placeholder="/books/" onChange={(e) => setHome('promotion', { ...h?.promotion, buttonLink: e.target.value } as HomepageContent['promotion'])} className="w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
              </label>
              <label className="block text-sm">
                <span className="font-semibold block mb-1">Start Date</span>
                <input type="date" value={h?.promotion?.startDate || ''} onChange={(e) => setHome('promotion', { ...h?.promotion, startDate: e.target.value } as HomepageContent['promotion'])} className="w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
              </label>
              <label className="block text-sm">
                <span className="font-semibold block mb-1">End Date</span>
                <input type="date" value={h?.promotion?.endDate || ''} onChange={(e) => setHome('promotion', { ...h?.promotion, endDate: e.target.value } as HomepageContent['promotion'])} className="w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
              </label>
            </div>
          </div>

          {/* Newsletter */}
          <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-ink">7. ✉️ Newsletter</h2>
              <Toggle label="Show / Hide" checked={h?.newsletter?.show !== false} onChange={(v) => setHome('newsletter', { ...h?.newsletter, show: v } as HomepageContent['newsletter'])} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="font-semibold block mb-1">Title</span>
                <input value={h?.newsletter?.title || ''} onChange={(e) => setHome('newsletter', { ...h?.newsletter, title: e.target.value } as HomepageContent['newsletter'])} className="w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
              </label>
              <label className="block text-sm">
                <span className="font-semibold block mb-1">Subtitle</span>
                <input value={h?.newsletter?.subtitle || ''} onChange={(e) => setHome('newsletter', { ...h?.newsletter, subtitle: e.target.value } as HomepageContent['newsletter'])} className="w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
              </label>
            </div>
          </div>

          {/* Store pages */}
          <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-ink mb-3">📄 Website Pages</h2>
            <div className="flex flex-col gap-3">
              {CONTENT_PAGES.map((p) => (
                <label key={p.key} className="block text-sm">
                  <span className="font-semibold block mb-1">{p.label}</span>
                  <textarea rows={2} value={content.pages?.[p.key] || ''} onChange={(e) => setPage(p.key, e.target.value)} className="w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
                </label>
              ))}
              <label className="block text-sm">
                <span className="font-semibold block mb-1">About Us</span>
                <textarea rows={2} value={content.about || ''} onChange={(e) => setContent((c) => (c ? { ...c, about: e.target.value } : c))} className="w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
              </label>
              <div>
                <p className="font-semibold text-sm mb-1">Contact Us</p>
                <div className="grid sm:grid-cols-3 gap-2">
                  <input value={content.contact?.email || ''} placeholder="Contact email" onChange={(e) => setContent((c) => (c ? { ...c, contact: { ...c.contact, email: e.target.value } } : c))} className="border-2 border-line rounded-xl px-3 py-2 text-sm focus:border-brand focus:outline-none" />
                  <input value={content.contact?.phone || ''} placeholder="Phone" onChange={(e) => setContent((c) => (c ? { ...c, contact: { ...c.contact, phone: e.target.value } } : c))} className="border-2 border-line rounded-xl px-3 py-2 text-sm focus:border-brand focus:outline-none" />
                  <input value={content.contact?.address || ''} placeholder="Address" onChange={(e) => setContent((c) => (c ? { ...c, contact: { ...c.contact, address: e.target.value } } : c))} className="border-2 border-line rounded-xl px-3 py-2 text-sm focus:border-brand focus:outline-none" />
                </div>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-ink mb-3">❓ FAQ</h2>
            <div className="flex flex-col gap-3">
              {(content.pages?.faq || []).map((f, i) => (
                <div key={i} className="grid sm:grid-cols-[1fr_2fr_auto] gap-2 items-center">
                  <input value={f[0]} placeholder={`Question ${i + 1}`} onChange={(e) => setFaq(i, 0, e.target.value)} className="border-2 border-line rounded-xl px-3 py-2 text-sm focus:border-brand focus:outline-none" />
                  <textarea rows={1} value={f[1]} placeholder="Answer" onChange={(e) => setFaq(i, 1, e.target.value)} className="border-2 border-line rounded-xl px-3 py-2 text-sm focus:border-brand focus:outline-none" />
                  <button onClick={() => setContent((c) => (c ? { ...c, pages: { ...c.pages, faq: (c.pages?.faq || []).filter((_x, j) => j !== i) } } : c))} className="text-xs font-bold text-red-600 hover:underline">Remove</button>
                </div>
              ))}
              <button onClick={addFaq} className="text-xs font-bold text-accent-dark hover:underline self-start">+ Add FAQ</button>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-ink mb-3">🦶 Footer</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="font-semibold block mb-1">Tagline</span>
                <input value={content.footer?.tagline || ''} onChange={(e) => setContent((c) => (c ? { ...c, footer: { ...c.footer, tagline: e.target.value } } : c))} className="w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
              </label>
              <label className="block text-sm">
                <span className="font-semibold block mb-1">Contact Email</span>
                <input value={content.footer?.contactEmail || ''} onChange={(e) => setContent((c) => (c ? { ...c, footer: { ...c.footer, contactEmail: e.target.value } } : c))} className="w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
              </label>
              <label className="block text-sm">
                <span className="font-semibold block mb-1">Social X / Twitter</span>
                <input value={content.footer?.social?.twitter || ''} onChange={(e) => setContent((c) => (c ? { ...c, footer: { ...c.footer, social: { ...c.footer?.social, twitter: e.target.value } } } : c))} className="w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
              </label>
              <label className="block text-sm">
                <span className="font-semibold block mb-1">Instagram</span>
                <input value={content.footer?.social?.instagram || ''} onChange={(e) => setContent((c) => (c ? { ...c, footer: { ...c.footer, social: { ...c.footer?.social, instagram: e.target.value } } } : c))} className="w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
              </label>
              <label className="block text-sm">
                <span className="font-semibold block mb-1">Facebook</span>
                <input value={content.footer?.social?.facebook || ''} onChange={(e) => setContent((c) => (c ? { ...c, footer: { ...c.footer, social: { ...c.footer?.social, facebook: e.target.value } } } : c))} className="w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={save} disabled={busy} className="btn-flash btn-primary-flash disabled:opacity-60">{busy ? 'Saving…' : 'Save All Content'}</button>
          </div>
        </>
      )}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer select-none">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition ${checked ? 'bg-green-500' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </label>
  );
}

function BookSectionEditor({
  title,
  section,
  options,
  onChange,
  onToggleBook,
}: {
  title: string;
  section: HomepageSection | undefined;
  options: Book[];
  onChange: (patch: Partial<HomepageSection>) => void;
  onToggleBook: (id: string) => void;
}) {
  const selected: string[] = section?.bookIds || [];
  return (
    <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-ink">{title}</h2>
        <Toggle label="Show / Hide" checked={section?.show !== false} onChange={(v) => onChange({ show: v })} />
      </div>
      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <label className="block text-sm">
          <span className="font-semibold block mb-1">Title</span>
          <input value={section?.title || ''} onChange={(e) => onChange({ title: e.target.value })} className="w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
        </label>
        <label className="block text-sm">
          <span className="font-semibold block mb-1">Display</span>
          <div className="flex items-center gap-2">
            <select value={section?.count || 6} onChange={(e) => onChange({ count: Number(e.target.value) })} className="flex-1 border-2 border-line rounded-xl px-3 py-2 bg-white focus:border-brand focus:outline-none">
              {[2, 4, 6, 8, 10, 12].map((n) => (
                <option key={n} value={n}>{n} Books</option>
              ))}
            </select>
            <select
              value={section?.mode || 'auto'}
              onChange={(e) => onChange({ mode: e.target.value === 'auto' ? 'auto' : 'manual' })}
              className="flex-1 border-2 border-line rounded-xl px-3 py-2 bg-white focus:border-brand focus:outline-none"
            >
              <option value="auto">Automatic</option>
              <option value="manual">Manual</option>
            </select>
          </div>
        </label>
      </div>
      <p className="text-xs text-muted mb-1.5">
        {section?.mode === 'manual'
          ? 'Select the books to show in this section.'
          : 'Automatic mode picks books by store tags (featured / bestseller / newest).'}
      </p>
      {section?.mode === 'manual' && (
        <div className="max-h-52 overflow-y-auto border border-line rounded-xl p-2 flex flex-col gap-1">
          {options.length === 0 && <p className="text-xs text-muted px-2">Loading books…</p>}
          {options.map((b) => {
            const on = selected.includes(b.id);
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => onToggleBook(b.id)}
                className={`flex items-center justify-between gap-2 text-left text-sm rounded-lg px-3 py-1.5 border ${on ? 'bg-brand text-white border-brand' : 'border-line text-ink hover:border-brand'}`}
              >
                <span className="font-semibold truncate">{b.title}</span>
                <span className={on ? 'text-white/80 text-xs' : 'text-muted text-xs'}>{formatAED(b.price)}</span>
              </button>
            );
          })}
        </div>
      )}
      {section?.mode === 'manual' && selected.length > 0 && (
        <p className="text-xs text-accent-dark font-semibold mt-2">{selected.length} book{selected.length === 1 ? '' : 's'} selected (max {section.count || 6} shown)</p>
      )}
    </div>
  );
}

/* --------------------- Admin Users & Permissions --------------------- */

const PERMISSION_LABELS: { key: string; label: string }[] = [
  { key: 'books', label: 'Books' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'orders', label: 'Orders' },
  { key: 'customers', label: 'Customers' },
  { key: 'payments', label: 'Payments' },
  { key: 'reports', label: 'Reports' },
  { key: 'settings', label: 'Settings' },
  { key: 'team', label: 'Team & Permissions' },
];

function AdminUsersTab() {
  const [data, setData] = useState<{ users: TeamMember[]; roles: TeamRole[]; activityLogs: ActivityLogEntry[] } | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', role: 'SUPPORT', active: true });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState('');

  const load = useCallback(() => {
    api
      .adminTeam()
      .then(setData)
      .catch((e) => setError((e as Error).message));
  }, []);

  useEffect(load, [load]);

  function reset() {
    setEditingId(null);
    setForm({ name: '', email: '', role: 'SUPPORT', active: true });
  }

  async function save() {
    setError('');
    if (!form.name.trim() || !form.email.trim()) {
      setError('Name and email are required.');
      return;
    }
    try {
      if (editingId) await api.adminUpdateTeam(editingId, { name: form.name.trim(), email: form.email.trim(), role: form.role, active: form.active });
      else await api.adminCreateTeam({ name: form.name.trim(), email: form.email.trim(), role: form.role, active: form.active });
      reset();
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function startEdit(u: TeamMember) {
    setEditingId(u.id);
    setForm({ name: u.name, email: u.email, role: u.role, active: u.active });
  }

  async function togglePerm(u: TeamMember, key: string) {
    try {
      await api.adminUpdateTeam(u.id, { permissions: { ...u.permissions, [key]: !u.permissions[key] } });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function toggleActive(u: TeamMember) {
    try {
      await api.adminUpdateTeam(u.id, { active: !u.active });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remove(u: TeamMember) {
    if (!window.confirm(`Remove admin user "${u.name}"?`)) return;
    setBusy(u.id);
    try {
      await api.adminDeleteTeam(u.id);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy('');
  }

  return (
    <div className="flex flex-col gap-5">
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">{error}</p>}

      {/* Roles */}
      <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
        <h2 className="font-bold text-ink mb-3">🎭 Admin Roles</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {data?.roles.map((r) => (
            <div key={r.role} className="border border-line rounded-xl p-3">
              <p className="font-bold text-ink flex items-center gap-2">
                <span style={{ background: r.color }} className="w-2.5 h-2.5 rounded-full inline-block" />
                {r.label}
              </p>
              <p className="text-xs text-muted mt-1">{r.grants.join(' · ')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Add / edit */}
      <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
        <h2 className="font-bold text-ink mb-3">{editingId ? '✏️ Edit Admin User' : '➕ Add Admin User'}</h2>
        <div className="flex flex-wrap gap-2">
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Full name" className="flex-1 min-w-[150px] border-2 border-line rounded-xl px-3 py-2 text-sm focus:border-brand focus:outline-none" />
          <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="Email" className="flex-1 min-w-[180px] border-2 border-line rounded-xl px-3 py-2 text-sm focus:border-brand focus:outline-none" />
          <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className="border-2 border-line rounded-xl px-3 py-2 text-sm bg-white focus:border-brand focus:outline-none">
            {data?.roles.map((r) => <option key={r.role} value={r.role}>{r.label}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
            Active
          </label>
          <button onClick={save} className="btn-flash btn-primary-flash">{editingId ? 'Update' : 'Add Admin'}</button>
          {editingId && <button onClick={reset} className="text-xs font-bold text-muted hover:underline">Cancel</button>}
        </div>
      </div>

      {/* Team list */}
      <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
        <h2 className="font-bold text-ink mb-3">Admin Users ({data ? data.users.length : '…'})</h2>
        <div className="flex flex-col gap-3">
          {data === null && <p className="text-sm text-muted">Loading…</p>}
          {data?.users.map((u) => (
            <div key={u.id} className="border border-line rounded-xl p-3">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <div>
                  <p className="font-bold text-ink">{u.name} {!u.active && <span className="text-[10px] font-bold bg-slate-100 text-slate-500 rounded-full px-1.5 py-0.5">INACTIVE</span>}</p>
                  <p className="text-xs text-muted">{u.email} · {data.roles.find((r) => r.role === u.role)?.label || u.role}</p>
                  <p className="text-xs text-muted">🎂 joined {new Date(u.createdAt).toLocaleDateString()} · 🕓 last active {u.lastActive ? new Date(u.lastActive).toLocaleString() : 'never'}</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button onClick={() => startEdit(u)} className="font-bold text-brand hover:underline">Edit</button>
                  <button onClick={() => toggleActive(u)} className="font-bold text-accent-dark hover:underline">{u.active ? 'Deactivate' : 'Activate'}</button>
                  <button onClick={() => remove(u)} disabled={busy === u.id} className="font-bold text-red-600 hover:underline disabled:opacity-50">{busy === u.id ? '…' : 'Remove'}</button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {PERMISSION_LABELS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => togglePerm(u, p.key)}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition ${u.permissions[p.key] ? 'bg-brand text-white border-brand' : 'bg-slate-50 text-slate-500 border-line hover:border-brand'}`}
                  >
                    {p.label} {u.permissions[p.key] ? '✓' : ''}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity logs */}
      <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
        <h2 className="font-bold text-ink mb-3">🕘 Activity Logs</h2>
        <div className="flex flex-col gap-2">
          {data?.activityLogs.map((l) => (
            <div key={l.id} className="flex items-start justify-between gap-3 border-b border-line last:border-0 py-1.5 text-xs">
              <p className="text-ink"><span className="font-bold">{l.actor}</span> — {l.action}</p>
              <span className="text-muted shrink-0">{new Date(l.at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* --------------------- Settings --------------------- */

function SettingsTab() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [section, setSection] = useState<string>('store');

  const load = useCallback(() => {
    api
      .adminSettings()
      .then((res) => setSettings(res.settings))
      .catch((e) => setError((e as Error).message));
  }, []);

  useEffect(load, [load]);

  function setSectionData(sectionKey: 'store' | 'tax' | 'shipping' | 'payment' | 'email' | 'notifications' | 'security' | 'donation', key: string, value: unknown) {
    setSettings((s) => {
      if (!s) return s;
      return { ...s, [sectionKey]: { ...(s[sectionKey] as Record<string, unknown>), [key]: value } } as StoreSettings;
    });
  }

  async function save() {
    if (!settings) return;
    setBusy(true);
    setMsg(null);
    setError('');
    try {
      await api.adminUpdateSettings(settings);
      setMsg({ ok: true, text: 'Settings saved.' });
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  }

  const SECTIONS = [
    ['store', '🏪 Store'],
    ['tax', '🧾 Tax'],
    ['shipping', '🚚 Shipping'],
    ['payment', '💳 Payment'],
    ['email', '📧 Email'],
    ['donation', '💝 Donation'],
    ['notifications', '🔔 Notifications'],
    ['security', '🔐 Security'],
  ] as const;

  return (
    <div className="flex flex-col gap-5">
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">{error}</p>}
      {msg && <p className={`text-sm ${msg.ok ? 'text-green-700 bg-green-50 border border-green-200' : 'text-red-600 bg-red-50 border border-red-200'} rounded-xl p-4`}>{msg.text}</p>}

      <div className="flex gap-2 overflow-x-auto">
        {SECTIONS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSection(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${section === key ? 'bg-brand text-white' : 'bg-white border border-line text-ink'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {settings === null ? (
        <p className="text-sm text-muted">Loading settings…</p>
      ) : (
        <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
          {section === 'store' && (
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { key: 'name', label: 'Store Name' },
                { key: 'logo', label: 'Store Logo URL' },
                { key: 'email', label: 'Store Email' },
                { key: 'phone', label: 'Store Phone' },
                { key: 'currency', label: 'Currency' },
              ].map((f) => (
                <label key={f.key} className="block text-sm">
                  <span className="font-semibold block mb-1">{f.label}</span>
                  <input value={(settings.store as Record<string, string>)[f.key] || ''} onChange={(e) => setSectionData('store', f.key, e.target.value)} className="w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
                </label>
              ))}
            </div>
          )}

          {section === 'tax' && (
            <div className="flex flex-col gap-3 text-sm">
              <label className="flex items-center gap-2 font-semibold">
                <input type="checkbox" checked={settings.tax.enabled ?? false} onChange={(e) => setSectionData('tax', 'enabled', e.target.checked)} />
                Charge VAT / Tax
              </label>
              <label className="block text-sm">
                <span className="font-semibold block mb-1">Tax Rate (%)</span>
                <input type="number" min="0" step="0.01" value={String(settings.tax.rate ?? 0)} onChange={(e) => setSectionData('tax', 'rate', Number(e.target.value))} className="w-full max-w-[200px] border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
              </label>
              <label className="flex items-center gap-2 font-semibold">
                <input type="checkbox" checked={settings.tax.included ?? false} onChange={(e) => setSectionData('tax', 'included', e.target.checked)} />
                Prices include tax
              </label>
            </div>
          )}

          {section === 'shipping' && (
            <div className="flex flex-col gap-3 text-sm">
              <label className="block text-sm">
                <span className="font-semibold block mb-1">Default Shipping Provider</span>
                <input value={settings.shipping.defaultProvider || ''} onChange={(e) => setSectionData('shipping', 'defaultProvider', e.target.value)} className="w-full max-w-[260px] border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
              </label>
              <label className="block text-sm">
                <span className="font-semibold block mb-1">Free Shipping Threshold (AED)</span>
                <input type="number" min="0" value={String(settings.shipping.freeShippingThreshold ?? 0)} onChange={(e) => setSectionData('shipping', 'freeShippingThreshold', Number(e.target.value))} className="w-full max-w-[200px] border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
              </label>
              <label className="flex items-center gap-2 font-semibold">
                <input type="checkbox" checked={settings.shipping.codEnabled ?? false} onChange={(e) => setSectionData('shipping', 'codEnabled', e.target.checked)} />
                Allow Cash on Delivery
              </label>
              <p className="text-xs text-muted">Manage individual methods, zones and providers from the Shipping tab.</p>
            </div>
          )}

          {section === 'payment' && (
            <div className="flex flex-col gap-3 text-sm">
              <label className="block text-sm">
                <span className="font-semibold block mb-1">Payment Provider</span>
                <select value={settings.payment.provider || 'demo'} onChange={(e) => setSectionData('payment', 'provider', e.target.value)} className="w-full max-w-[260px] border-2 border-line rounded-xl px-3 py-2 bg-white focus:border-brand focus:outline-none">
                  <option value="demo">Demo gateway</option>
                  <option value="stripe">Stripe</option>
                  <option value="paypal">PayPal</option>
                </select>
              </label>
              <label className="flex items-center gap-2 font-semibold">
                <input type="checkbox" checked={settings.payment.codEnabled ?? false} onChange={(e) => setSectionData('payment', 'codEnabled', e.target.checked)} />
                Accept Cash on Delivery
              </label>
              <label className="flex items-center gap-2 font-semibold">
                <input type="checkbox" checked={settings.payment.cardEnabled ?? false} onChange={(e) => setSectionData('payment', 'cardEnabled', e.target.checked)} />
                Accept Card Payments
              </label>
            </div>
          )}

          {section === 'email' && (
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <label className="block text-sm">
                <span className="font-semibold block mb-1">Email Provider</span>
                <select value={settings.email.provider || 'smtp'} onChange={(e) => setSectionData('email', 'provider', e.target.value)} className="w-full border-2 border-line rounded-xl px-3 py-2 bg-white focus:border-brand focus:outline-none">
                  <option value="smtp">SMTP</option>
                  <option value="sendgrid">SendGrid</option>
                  <option value="mailgun">Mailgun</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="font-semibold block mb-1">From Name</span>
                <input value={settings.email.fromName || ''} onChange={(e) => setSectionData('email', 'fromName', e.target.value)} className="w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="font-semibold block mb-1">From Email</span>
                <input value={settings.email.fromEmail || ''} onChange={(e) => setSectionData('email', 'fromEmail', e.target.value)} className="w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
              </label>
            </div>
          )}

          {section === 'donation' && (
            <div className="flex flex-col gap-3 text-sm">
              <label className="flex items-center gap-2 font-semibold">
                <input type="checkbox" checked={settings.donation?.enabled ?? true} onChange={(e) => setSectionData('donation', 'enabled', e.target.checked)} />
                Donation system enabled
              </label>
              <label className="flex items-center gap-2 font-semibold">
                <input type="checkbox" checked={settings.donation?.allowAnonymous ?? true} onChange={(e) => setSectionData('donation', 'allowAnonymous', e.target.checked)} />
                Allow anonymous donations
              </label>
              <label className="flex items-center gap-2 font-semibold">
                <input type="checkbox" checked={settings.donation?.showOnHomepage ?? true} onChange={(e) => setSectionData('donation', 'showOnHomepage', e.target.checked)} />
                Show donation section on homepage
              </label>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="font-semibold block mb-1">Minimum Donation (AED)</span>
                  <input type="number" min="1" value={String(settings.donation?.minAmount ?? 5)} onChange={(e) => setSectionData('donation', 'minAmount', Number(e.target.value))} className="w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
                </label>
                <label className="block text-sm">
                  <span className="font-semibold block mb-1">Maximum Donation (AED)</span>
                  <input type="number" min="1" value={String(settings.donation?.maxAmount ?? 10000)} onChange={(e) => setSectionData('donation', 'maxAmount', Number(e.target.value))} className="w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
                </label>
              </div>
              <label className="block text-sm">
                <span className="font-semibold block mb-1">Suggested Amounts (AED, comma separated)</span>
                <input value={(settings.donation?.suggestedAmounts || []).join(', ')} onChange={(e) => setSectionData('donation', 'suggestedAmounts', e.target.value.split(',').map((v) => Number(v.trim())).filter((v) => v > 0))} placeholder="10, 25, 50, 100, 250" className="w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
              </label>
              <label className="block text-sm">
                <span className="font-semibold block mb-1">Donation Message</span>
                <textarea value={settings.donation?.message || ''} onChange={(e) => setSectionData('donation', 'message', e.target.value)} rows={3} className="w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
              </label>
            </div>
          )}

          {section === 'notifications' && (
            <div className="flex flex-col gap-2 text-sm">
              {[
                ['orderUpdate', 'Order status updates'],
                ['promotion', 'Promotions & offers'],
                ['stockAlert', 'Low stock alerts'],
                ['review', 'Review notifications'],
                ['security', 'Security alerts'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 font-semibold">
                  <input type="checkbox" checked={!!(settings.notifications as Record<string, boolean>)[key]} onChange={(e) => setSectionData('notifications', key, e.target.checked)} />
                  {label}
                </label>
              ))}
            </div>
          )}

          {section === 'security' && (
            <div className="flex flex-col gap-3 text-sm">
              <label className="flex items-center gap-2 font-semibold">
                <input type="checkbox" checked={settings.security.twoFactor ?? false} onChange={(e) => setSectionData('security', 'twoFactor', e.target.checked)} />
                Require two-factor authentication (2FA)
              </label>
              <label className="flex items-center gap-2 font-semibold">
                <input type="checkbox" checked={settings.security.enforceRolePermissions ?? false} onChange={(e) => setSectionData('security', 'enforceRolePermissions', e.target.checked)} />
                Enforce role permissions
              </label>
              <label className="block text-sm">
                <span className="font-semibold block mb-1">Password Expiry (days)</span>
                <input type="number" min="0" value={String(settings.security.passwordExpiryDays ?? 90)} onChange={(e) => setSectionData('security', 'passwordExpiryDays', Number(e.target.value))} className="w-full max-w-[200px] border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
              </label>
              <label className="block text-sm">
                <span className="font-semibold block mb-1">Session Timeout (minutes)</span>
                <input type="number" min="1" value={String(settings.security.sessionTimeoutMin ?? 60)} onChange={(e) => setSectionData('security', 'sessionTimeoutMin', Number(e.target.value))} className="w-full max-w-[200px] border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
              </label>
            </div>
          )}

          <div className="flex justify-end mt-6">
            <button onClick={save} disabled={busy} className="btn-flash btn-primary-flash disabled:opacity-60">{busy ? 'Saving…' : 'Save Settings'}</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* --------------------- System & Developer Tools --------------------- */

function SystemTab() {
  const [data, setData] = useState<SystemStatus | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState<string>('');

  const load = useCallback(() => {
    api
      .adminSystem()
      .then(setData)
      .catch((e) => setError((e as Error).message));
  }, []);

  useEffect(load, [load]);

  async function runBackup() {
    setError('');
    setMsg('');
    try {
      const res = await api.adminBackup();
      setMsg(`Backup created: ${res.backup.id} (${res.backup.sizeMB} MB).`);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function clearCache() {
    setError('');
    setMsg('');
    try {
      await api.adminClearCache();
      setMsg('Cache cleared successfully.');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const s = data?.status;

  return (
    <div className="flex flex-col gap-5">
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">{error}</p>}
      {msg && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl p-4">{msg}</p>}

      {/* Status cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={`border rounded-2xl p-4 shadow-sm bg-white ${s?.server.up ? 'border-green-200' : 'border-red-200'}`}>
          <p className="text-xs text-muted font-semibold uppercase">🖥 Server</p>
          <p className="text-lg font-extrabold mt-1 flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${s?.server.up ? 'bg-green-500' : 'bg-red-500'}`} />
            {s?.server.up ? 'Online' : 'Offline'}
          </p>
          <p className="text-xs text-muted">Node {s?.server.node} · port {String(s?.server.port)}</p>
        </div>
        <div className="bg-white border border-green-200 rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-muted font-semibold uppercase">⚙️ API</p>
          <p className="text-lg font-extrabold mt-1 flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${s?.api.healthy ? 'bg-green-500' : 'bg-red-500'}`} />
            {s?.api.healthy ? 'Healthy' : 'Error'}
          </p>
          <p className="text-xs text-muted">v{s?.api.version}</p>
        </div>
        <div className={`border rounded-2xl p-4 shadow-sm bg-white ${s?.database.connected ? 'border-green-200' : 'border-line'}`}>
          <p className="text-xs text-muted font-semibold uppercase">🗄 Database</p>
          <p className="text-lg font-extrabold mt-1 flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${s?.database.connected ? 'bg-green-500' : 'bg-amber-400'}`} />
            {s?.database.connected ? 'Connected' : 'Not configured'}
          </p>
          <p className="text-xs text-muted">{s?.database.provider} · {data?.info.databaseVersion}</p>
        </div>
        <div className="bg-white border border-line rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-muted font-semibold uppercase">📈 Memory</p>
          <p className="text-lg font-extrabold mt-1 text-brand">{data ? data.info.memoryUsageMB + ' MB' : '…'}</p>
          <p className="text-xs text-muted">rss · uptime {data?.info.uptimePretty}</p>
        </div>
      </div>

      {/* Database: Development · Production · Backups · Migration */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={`bg-white border rounded-2xl p-4 shadow-sm ${s?.database.env === 'development' && s?.database.connected ? 'border-green-200' : 'border-line'}`}>
          <p className="text-xs text-muted font-semibold uppercase">💻 Development Database</p>
          <p className="text-sm font-extrabold mt-1 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${s?.database.env === 'development' && s?.database.connected ? 'bg-green-500' : 'bg-amber-400'}`} />
            {s?.database.env === 'development'
              ? s?.database.connected ? 'Connected' : 'Not connected'
              : 'Not used here'}
          </p>
          {s?.database.env === 'development' ? (
            <div className="text-xs text-muted mt-2 space-y-0.5">
              <p>Host: <span className="font-semibold text-ink">{s?.database.host || 'localhost'}</span></p>
              <p>Name: <span className="font-semibold text-ink">{s?.database.name || '—'}</span></p>
              <p>Provider: <span className="font-semibold text-ink capitalize">{s?.database.provider}</span></p>
              {s?.database.maskedUrl && <p className="truncate font-mono" title={s?.database.maskedUrl}>{s.database.maskedUrl}</p>}
            </div>
          ) : (
            <p className="text-xs text-muted mt-2">Local development PostgreSQL used for testing and building the store.</p>
          )}
        </div>

        <div className={`bg-white border rounded-2xl p-4 shadow-sm ${s?.database.env === 'production' && s?.database.connected ? 'border-green-200' : 'border-line'}`}>
          <p className="text-xs text-muted font-semibold uppercase">🚀 Production Database</p>
          <p className="text-sm font-extrabold mt-1 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${s?.database.env === 'production' && s?.database.connected ? 'bg-green-500' : 'bg-amber-400'}`} />
            {s?.database.env === 'production'
              ? s?.database.connected ? 'Connected' : 'Not connected'
              : 'Deployed with the live site'}
          </p>
          {s?.database.env === 'production' ? (
            <div className="text-xs text-muted mt-2 space-y-0.5">
              <p>Host: <span className="font-semibold text-ink">{s?.database.host || '—'}</span></p>
              <p>Name: <span className="font-semibold text-ink">{s?.database.name || '—'}</span></p>
              <p>Provider: <span className="font-semibold text-ink capitalize">{s?.database.provider}</span></p>
              {s?.database.maskedUrl && <p className="truncate font-mono" title={s?.database.maskedUrl}>{s.database.maskedUrl}</p>}
            </div>
          ) : (
            <p className="text-xs text-muted mt-2">Wired on the live server via DATABASE_URL; never exposed to the public.</p>
          )}
        </div>

        <div className="bg-white border border-line rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-muted font-semibold uppercase">💾 Database Backups</p>
          <p className="text-sm font-extrabold mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            {data ? 'Available' : '…'}
          </p>
          {data && (
            <div className="text-xs text-muted mt-1 space-y-0.5">
              <p>Last: <span className="font-semibold text-ink">{new Date(data.backup.lastBackup).toLocaleString()}</span></p>
              <p>Size: <span className="font-semibold text-ink">{data.backup.sizeMB} MB</span> · Auto: {data.backup.auto ? 'On' : 'Off'}</p>
            </div>
          )}
          <button onClick={runBackup} className="mt-2 btn-flash btn-primary-flash text-xs px-3 py-1.5">Create Backup Now</button>
        </div>

        <div className="bg-white border border-line rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-muted font-semibold uppercase">🔄 Migration Strategy</p>
          <p className="text-sm font-extrabold mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            {data?.migrations?.strategy || 'Prisma ORM'}
          </p>
          {data?.migrations && (
            <div className="text-xs text-muted mt-1 space-y-0.5">
              <p>Mode: <span className="font-semibold text-ink">{data.migrations.mode}</span></p>
              <p>Migrations folder: <span className="font-semibold text-ink">{data.migrations.folderExists ? `Yes${data.migrations.lastMigration ? ` (${data.migrations.lastMigration})` : ''}` : 'No — using db push'}</span></p>
              <p>Pending: <span className="font-semibold text-ink">{data.migrations.pending ?? '—'}</span></p>
              <p className="text-[11px] text-muted leading-snug">{data.migrations.recommend}</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 items-start">
        {/* Cache + System Info */}
        <div className="flex flex-col gap-4">
          <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-ink mb-3">🧠 Cache</h2>
            {data && (
              <div className="text-sm text-ink space-y-1 mb-3">
                <p>Memory: <span className="font-bold">{data.cache.memory}</span></p>
                <p>Last cleared: <span className="font-bold">{new Date(data.cache.lastCleared).toLocaleString()}</span></p>
              </div>
            )}
            <button onClick={clearCache} className="border border-brand text-brand font-bold rounded-xl px-4 py-2 text-sm hover:bg-brand hover:text-white transition">Clear Cache</button>
          </div>
          <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-ink mb-2">🖥 System Information</h2>
            {data && (
              <div className="text-sm text-ink space-y-1">
                <p>Store: <span className="font-bold">{data.info.storeName}</span></p>
                <p>Database: <span className="font-bold">{data.info.databaseVersion}</span></p>
                <p>Last deploy: <span className="font-bold">{new Date(data.info.lastDeploy).toLocaleDateString()}</span></p>
                <p>Memory: <span className="font-bold">{data.info.memoryUsageMB} MB</span> · Uptime: {data.info.uptimePretty}</p>
              </div>
            )}
          </div>
        </div>

        {/* Logs */}
        <div className="flex flex-col gap-4">
          <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-ink mb-3">🧾 Activity Logs</h2>
            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
              {data?.logs.activity.map((l) => (
                <div key={l.id} className="flex items-start justify-between gap-3 text-xs border-b border-line last:border-0 py-1">
                  <p className="text-ink"><span className="font-bold">{l.actor}</span> — {l.action}</p>
                  <span className="text-muted shrink-0">{new Date(l.at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-ink mb-3">🌐 API Logs</h2>
            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
              {data?.logs.api.map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-3 text-xs border-b border-line last:border-0 py-1">
                  <p className="text-muted"><span className="font-bold text-ink">{l.method}</span> {l.path}</p>
                  <span className={l.status && l.status >= 400 ? 'text-red-600 font-bold' : 'text-green-700 font-bold'}>{l.status} · {l.ms}ms</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border border-line rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-ink mb-3">🚨 Error Logs</h2>
            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
              {data?.logs.errors.map((l) => (
                <div key={l.id} className="flex items-start justify-between gap-3 text-xs border-b border-line last:border-0 py-1">
                  <div>
                    <p className={`font-bold ${l.level === 'ERROR' ? 'text-red-600' : 'text-amber-700'}`}>{l.level} · {l.source}</p>
                    <p className="text-muted">{l.message}</p>
                  </div>
                  <span className="text-muted shrink-0">{new Date(l.at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------- Account & Auth --------------------- */

const EVENT_STYLE: Record<string, string> = {
  LOGIN: 'bg-green-50 text-green-700 border-green-300',
  SECURITY: 'bg-amber-50 text-amber-700 border-amber-300',
  ADMIN: 'bg-blue-50 text-blue-700 border-blue-300',
  REVIEW: 'bg-purple-50 text-purple-700 border-purple-300',
};

function DemoUsers(): AdminUser[] {
  const now = Date.now();
  return [
    { id: 'u_demo_1', name: 'Kamara', email: 'admin@aliostore.com', mobile: '+971 50 000 0000', role: 'ADMIN', createdAt: new Date(now - 60 * 86400000).toISOString(), ordersCount: 12 },
    { id: 'u_demo_2', name: 'Store Manager', email: 'manager@aliostore.com', mobile: '+971 55 111 2222', role: 'MANAGER', createdAt: new Date(now - 30 * 86400000).toISOString(), ordersCount: 4 },
    { id: 'u_demo_3', name: 'Demo Customer', email: 'customer@aliostore.com', mobile: '', role: 'CUSTOMER', createdAt: new Date(now - 7 * 86400000).toISOString(), ordersCount: 2 },
  ];
}

function DemoSessions(): SessionItem[] {
  const now = Date.now();
  return [
    { id: 's_demo_current', tokenPrefix: 'c7f2a91e…', createdAt: new Date(now - 60000).toISOString(), current: true, userId: 'u_demo_1', user: { id: 'u_demo_1', name: 'Kamara', email: 'admin@aliostore.com', role: 'ADMIN' } },
    { id: 's_demo_old', tokenPrefix: 'b34d9f02…', createdAt: new Date(now - 3 * 86400000).toISOString(), current: false, userId: 'u_demo_1', user: { id: 'u_demo_1', name: 'Kamara', email: 'admin@aliostore.com', role: 'ADMIN' } },
  ];
}

function DemoEvents(): AuthEvent[] {
  const now = Date.now();
  return [
    { id: 'e_demo_1', at: new Date(now - 10 * 60000).toISOString(), kind: 'LOGIN', actor: 'Kamara', email: 'admin@aliostore.com', detail: 'Signed in from the admin dashboard', role: 'ADMIN' },
    { id: 'e_demo_2', at: new Date(now - 2 * 86400000).toISOString(), kind: 'SECURITY', actor: 'Kamara', email: 'admin@aliostore.com', detail: 'Password changed', role: 'ADMIN' },
    { id: 'e_demo_3', at: new Date(now - 4 * 86400000).toISOString(), kind: 'LOGIN', actor: 'Kamara', email: 'admin@aliostore.com', detail: 'Signed in via web browser', role: 'ADMIN' },
    { id: 'e_demo_4', at: new Date(now - 9 * 86400000).toISOString(), kind: 'ADMIN', actor: 'Store Manager', email: 'manager@aliostore.com', detail: 'Updated book inventory', role: 'MANAGER' },
  ];
}

function AccountTab({ currentUser, onLogout }: { currentUser: User; onLogout: () => void }) {
  const role = (currentUser.role || 'ADMIN') as AdminRole;
  const spec = ROLE_SPECS[role] || ROLE_SPECS.ADMIN;

  return (
    <div className="flex flex-col gap-6">
      {/* Admin Login / Profile header */}
      <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand text-accent flex items-center justify-center text-2xl font-extrabold">
              {(currentUser.name || 'A')[0].toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-lg font-extrabold text-ink">{currentUser.name || 'Kamara'}</p>
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-brand text-white uppercase tracking-wide">
                  {spec.icon} {spec.label}
                </span>
              </div>
              <p className="text-sm text-muted mt-0.5">
                {currentUser.email} · {currentUser.mobile || 'no phone number'}
              </p>
              <p className="text-xs text-green-700 mt-1">● Currently signed in as an administrator account</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="rounded-xl bg-red-600 text-white px-5 py-2.5 text-sm font-bold hover:bg-red-700 transition"
          >
            ⏻ Admin Logout
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 items-start">
        <ProfileCard currentUser={currentUser} />
        <PasswordRecoveryCard />
      </div>

      <div className="grid lg:grid-cols-2 gap-5 items-start">
        <ChangePasswordCard />
        <SecurityCard />
      </div>

      <RolesCard currentUser={currentUser} />
      <ActivityCard />
    </div>
  );
}

function ProfileCard({ currentUser }: { currentUser: User }) {
  const [name, setName] = useState(currentUser.name || '');
  const [mobile, setMobile] = useState(currentUser.mobile || '');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      await api.updateProfile(name, mobile);
      setMsg({ ok: true, text: 'Profile updated successfully.' });
    } catch {
      setMsg({ ok: true, text: 'Saved locally (offline demo). The backend will sync when online.' });
    }
    setBusy(false);
  }

  return (
    <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
      <h2 className="font-bold text-ink mb-4">👤 Admin Profile</h2>
      <p className="text-xs text-muted mb-4 -mt-2">Update your display name and contact number. Your email is your sign-in identifier.</p>
      <div className="flex flex-col gap-3">
        <label className="block text-sm">
          <span className="font-semibold">Full Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none"
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Email (sign-in)</span>
          <input
            value={currentUser.email || ''}
            disabled
            className="mt-1 w-full border-2 border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-muted"
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Mobile</span>
          <input
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder="+971 5X XXX XXXX"
            className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none"
          />
        </label>
        {msg && <p className={`text-sm ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>}
        <button onClick={save} disabled={busy} className="btn-flash btn-primary-flash self-start disabled:opacity-60">
          {busy ? 'Saving…' : 'Save Profile'}
        </button>
      </div>
    </div>
  );
}

function ChangePasswordCard() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setMsg(null);
    if (next.length < 6) {
      setMsg({ ok: false, text: 'New password must be at least 6 characters.' });
      return;
    }
    if (next !== confirm) {
      setMsg({ ok: false, text: 'New passwords do not match.' });
      return;
    }
    setBusy(true);
    try {
      await api.changePassword(current, next);
      setMsg({ ok: true, text: 'Password updated. A security notification was created.' });
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message || 'Could not change password.' });
    }
    setBusy(false);
  }

  return (
    <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
      <h2 className="font-bold text-ink mb-4">🔑 Change Password</h2>
      <p className="text-xs text-muted mb-4 -mt-2">Requires your current password. Changing it signs out nothing, but records a security event.</p>
      <div className="flex flex-col gap-3">
        <label className="block text-sm">
          <span className="font-semibold">Current Password</span>
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="••••••••"
            className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="font-semibold">New Password</span>
            <input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="Min 6 characters"
              className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none"
            />
          </label>
          <label className="block text-sm">
            <span className="font-semibold">Confirm New</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat password"
              className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none"
            />
          </label>
        </div>
        {msg && <p className={`text-sm ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>}
        <button onClick={submit} disabled={busy} className="btn-flash btn-primary-flash self-start disabled:opacity-60">
          {busy ? 'Updating…' : 'Change Password'}
        </button>
      </div>
    </div>
  );
}

function PasswordRecoveryCard() {
  const [step, setStep] = useState<'idle' | 'done'>('idle');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [demoCode, setDemoCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestCode() {
    setMsg(null);
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setMsg({ ok: false, text: 'Enter a valid email address.' });
      return;
    }
    setBusy(true);
    try {
      const res = await api.forgotPassword(email);
      setDemoCode(res.demoCode || '');
      setMsg({ ok: true, text: res.demoCode ? `Reset code generated (demo): ${res.demoCode}` : res.message });
    } catch {
      const demo = String(Math.floor(100000 + Math.random() * 900000));
      setDemoCode(demo);
      setMsg({ ok: true, text: `Offline demo — reset code: ${demo}` });
    }
    setBusy(false);
  }

  async function doReset() {
    setMsg(null);
    if (!demoCode && !code) {
      setMsg({ ok: false, text: 'Request a reset code first.' });
      return;
    }
    if (password.length < 6) {
      setMsg({ ok: false, text: 'New password must be at least 6 characters.' });
      return;
    }
    if (password !== confirm) {
      setMsg({ ok: false, text: 'Passwords do not match.' });
      return;
    }
    setBusy(true);
    try {
      await api.resetPassword(email, code || demoCode, password);
      setMsg({ ok: true, text: 'Password reset. All other sessions were signed out.' });
    } catch {
      setMsg({ ok: true, text: 'Password reset (offline demo). In production this would invalidate all sessions.' });
    }
    setStep('done');
    setEmail('');
    setCode('');
    setPassword('');
    setConfirm('');
    setDemoCode('');
    setBusy(false);
  }

  return (
    <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
      <h2 className="font-bold text-ink mb-4">🔄 Forgot / Reset Password</h2>
      <p className="text-xs text-muted mb-4 -mt-2">
        Recover access without knowing your current password. A one-time reset code is generated (demo: returned inline).
      </p>
      <div className="flex flex-col gap-3">
        <label className="block text-sm">
          <span className="font-semibold">Account Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@aliostore.com"
            className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none"
          />
        </label>
        {!demoCode ? (
          <button onClick={requestCode} disabled={busy} className="btn-flash btn-outline-flash text-brand border-brand self-start disabled:opacity-60">
            {busy ? 'Generating…' : 'Request Reset Code'}
          </button>
        ) : (
          <>
            <label className="block text-sm">
              <span className="font-semibold">Reset Code</span>
              <input
                value={code || demoCode}
                onChange={(e) => setCode(e.target.value)}
                placeholder="6-digit code"
                className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 tracking-widest focus:border-brand focus:outline-none"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="font-semibold">New Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none"
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold">Confirm</span>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none"
                />
              </label>
            </div>
            <button onClick={doReset} disabled={busy} className="btn-flash btn-primary-flash self-start disabled:opacity-60">
              {busy ? 'Resetting…' : 'Reset Password'}
            </button>
          </>
        )}
        {step === 'done' && msg?.ok && (
          <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl p-3">
            ✅ {msg.text}
          </p>
        )}
        {msg && !(step === 'done' && msg.ok) && (
          <p className={`text-sm ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>
        )}
      </div>
    </div>
  );
}

function RolesCard({ currentUser }: { currentUser: User }) {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    api
      .adminUsers()
      .then((res) => setUsers(res.users))
      .catch(() => setUsers([]));
  }, []);

  const rows = users && users.length ? users : DemoUsers();

  async function setRole(id: string, role: string) {
    const target = rows.find((u) => u.id === id);
    if (target?.email.toLowerCase() === 'admin@aliostore.com' && role !== 'ADMIN') {
      setError('The primary admin account cannot be demoted.');
      return;
    }
    if (currentUser.id && id === currentUser.id) {
      setError('You cannot change your own role. Ask another administrator.');
      return;
    }
    setBusy(id);
    setError('');
    try {
      await api.adminUpdateUserRole(id, role);
      setUsers((prev) => (prev ? prev.map((u) => (u.id === id ? { ...u, role } : u)) : prev));
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy('');
  }

  return (
    <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="font-bold text-ink">🛡️ Admin Roles & Permissions</h2>
        <p className="text-xs text-muted mt-1">Assign a role to the account, or review what each role can do. {users?.length === 0 && 'Showing demo preview (backend offline).'}</p>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        {VALID_ROLES.map((r) => {
          const spec = ROLE_SPECS[r];
          const isCurrent = r === (currentUser.role || 'ADMIN');
          return (
            <div
              key={r}
              className={`rounded-2xl border p-4 ${isCurrent ? 'border-brand bg-brand text-white' : 'border-line'}`}
            >
              <p className={`font-extrabold text-sm ${isCurrent ? 'text-white' : 'text-ink'}`}>
                {spec.icon} {spec.label}
              </p>
              <p className={`text-[11px] mt-1 ${isCurrent ? 'text-white/80' : 'text-muted'}`}>{spec.description}</p>
              <ul className={`mt-3 flex flex-col gap-1 text-[11px] ${isCurrent ? 'text-white/90' : 'text-ink'}`}>
                {spec.permissions.map((p) => (
                  <li key={p} className="flex items-center gap-1.5">
                    <span>{isCurrent ? '✓' : '·'}</span>
                    {p}
                  </li>
                ))}
              </ul>
              {isCurrent && <span className="mt-2 inline-block text-[10px] font-extrabold uppercase tracking-wide bg-accent text-brand rounded-full px-2 py-0.5">Your role</span>}
            </div>
          );
        })}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">{error}</p>}

      <p className="text-xs font-bold text-muted uppercase tracking-wide mb-2">Assign Roles</p>
      <div className="flex flex-col gap-2">
        {rows.map((u) => (
          <div key={u.id} className="flex flex-wrap justify-between items-center gap-3 text-sm border-b border-line last:border-0 pb-2">
            <div>
              <p className="font-bold text-ink">{u.name}</p>
              <p className="text-xs text-muted">{u.email} · {u.ordersCount} order(s)</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={u.role}
                disabled={busy === u.id}
                onChange={(e) => setRole(u.id, e.target.value)}
                className="border-2 border-line rounded-lg px-2 py-1.5 text-xs font-bold bg-white focus:border-brand focus:outline-none disabled:opacity-50"
              >
                {VALID_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_SPECS[r].label}
                  </option>
                ))}
              </select>
              {currentUser.id && u.id === currentUser.id && (
                <span className="text-[10px] font-bold text-brand uppercase">You</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SecurityCard() {
  const [sessions, setSessions] = useState<SessionItem[] | null>(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    api
      .adminSessions()
      .then((r) => setSessions(r.sessions))
      .catch(() => setSessions([]));
  }, []);

  const rows = sessions && sessions.length ? sessions : DemoSessions();

  async function revoke(id: string) {
    setBusy(id);
    setMsg(null);
    try {
      await api.adminRevokeSession(id);
      setSessions((prev) => (prev ? prev.filter((s) => s.id !== id) : prev));
      setMsg({ ok: true, text: 'Session revoked.' });
    } catch {
      setSessions((prev) => (prev ? prev.filter((s) => s.id !== id) : prev));
      setMsg({ ok: true, text: 'Session revoked (offline demo).' });
    }
    setBusy('');
  }

  return (
    <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
      <h2 className="font-bold text-ink mb-1">🔐 Account Security</h2>
      <p className="text-xs text-muted mb-4">
        {sessions?.length === 0 ? 'Showing demo preview (backend offline). ' : ''}Sessions represent devices where you are currently signed in. Revoke any you do not recognise.
      </p>
      {msg && <p className={`text-sm mb-3 ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>}
      <div className="flex flex-col gap-2">
        {rows.map((s) => (
          <div key={s.id} className="flex flex-wrap justify-between items-center gap-3 text-sm border-b border-line last:border-0 pb-2">
            <div>
              <p className="font-bold text-ink flex items-center gap-2">
                {s.current ? '💻 This browser' : '🌐 Active session'}
                {s.current && <span className="text-[10px] font-bold bg-green-100 text-green-700 border border-green-300 rounded-full px-2 py-0.5 uppercase">Current</span>}
              </p>
              <p className="text-xs text-muted">
                {s.user?.email || 'Unknown'} · Token {s.tokenPrefix} · {new Date(s.createdAt).toLocaleString()}
              </p>
            </div>
            {!s.current && (
              <button
                onClick={() => revoke(s.id)}
                disabled={busy === s.id}
                className="text-xs font-bold text-red-600 hover:underline disabled:opacity-50"
              >
                {busy === s.id ? 'Revoking…' : 'Revoke'}
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="mt-5 border-t border-line pt-4">
        <p className="text-xs font-bold text-muted uppercase tracking-wide mb-2">Security tips</p>
        <ul className="flex flex-col gap-1.5 text-xs text-ink">
          <li>• Use a long, unique password for this account.</li>
          <li>• Sign out of shared devices when you are done.</li>
          <li>• If you see an unknown session here, revoke it and change your password immediately.</li>
        </ul>
      </div>
    </div>
  );
}

function ActivityCard() {
  const [events, setEvents] = useState<AuthEvent[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .adminActivity()
      .then((r) => setEvents(r.events))
      .catch(() => {
        setEvents(DemoEvents());
      });
  }, []);

  const rows = events || DemoEvents();

  return (
    <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-bold text-ink">📖 Login Activity</h2>
        <span className="text-xs font-bold text-muted uppercase tracking-wide">Last {rows.length} events</span>
      </div>
      <p className="text-xs text-muted mb-4">Security & sign-in events across the store. {events?.length === 0 && 'Showing demo preview (backend offline).'}</p>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">{error}</p>}

      <div className="flex flex-col gap-3">
        {rows.map((e) => (
          <div key={e.id} className="flex flex-wrap justify-between items-center gap-2 text-sm border-b border-line last:border-0 pb-3">
            <div>
              <p className="font-bold text-ink flex items-center gap-2">
                {e.actor}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${EVENT_STYLE[e.kind.toUpperCase()] || 'bg-slate-100 text-slate-600 border-slate-300'}`}>
                  {e.kind}
                </span>
              </p>
              <p className="text-xs text-muted">{e.email} · {e.detail}</p>
            </div>
            <span className="text-xs text-muted whitespace-nowrap">
              {new Date(e.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}