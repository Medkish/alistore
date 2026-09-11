'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/providers';
import { formatAED, formatNumber } from '@/lib/format';
import {
  ORDER_STATUSES,
  ORDER_TRANSITIONS,
  type AdminStats,
  type AdminUser,
  type Book,
  type CategoryItem,
  type DiscountItem,
  type Order,
  type OrderStatus,
} from '@/lib/types';

type Tab = 'overview' | 'books' | 'categories' | 'inventory' | 'orders' | 'users' | 'discounts' | 'reviews' | 'reports';
const TABS: Tab[] = ['overview', 'books', 'categories', 'inventory', 'orders', 'users', 'discounts', 'reviews', 'reports'];

interface BookRow extends Book {}

const EMPTY_FORM = {
  title: '',
  author: '',
  price: '',
  stock: '',
  description: '',
  coverImage: '',
  category: 'programming',
  featured: false,
  bestseller: false,
  prevPrice: '',
};

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
  const { user, login } = useAuth();
  const [session, setSession] = useState(user);
  const [tab, setTab] = useState<Tab>('overview');

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
        ) : (
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
          </form>
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
            {user?.role}
          </span>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-bold capitalize whitespace-nowrap transition ${
                tab === t ? 'bg-brand text-white' : 'bg-white border border-line text-ink hover:border-brand'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'overview' && <Overview onGoOrders={() => setTab('orders')} onGoBooks={() => setTab('books')} />}
        {tab === 'books' && <BooksTab onGoInventory={() => setTab('inventory')} />}
        {tab === 'categories' && <CategoriesTab />}
        {tab === 'inventory' && <InventoryTab />}
        {tab === 'orders' && <OrdersTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'discounts' && <DiscountsTab />}
        {tab === 'reviews' && <ReviewsTab />}
        {tab === 'reports' && <ReportsTab />}
      </div>
    </section>
  );
}

/* --------------------- Overview --------------------- */

function Overview({ onGoOrders, onGoBooks }: { onGoOrders: () => void; onGoBooks: () => void }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .adminStats()
      .then(setStats)
      .catch((e) => setError((e as Error).message));
  }, []);

  if (error) return <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">{error}</p>;

  const cards = stats
    ? [
        { label: 'Orders', value: formatNumber(stats.paidOrderCount), accent: true },
        { label: 'Revenue', value: formatAED(stats.revenue), accent: true },
        { label: 'Books', value: formatNumber(stats.bookCount), accent: false },
        { label: 'Customers', value: formatNumber(stats.userCount), accent: false },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`bg-white border rounded-2xl p-5 shadow-sm ${c.accent ? 'border-accent' : 'border-line'}`}
          >
            <p className="text-xs text-muted font-semibold uppercase tracking-wide">{c.label}</p>
            <p className={`text-2xl font-extrabold mt-1 ${c.accent ? 'text-accent-dark' : 'text-brand'}`}>{c.value}</p>
          </div>
        ))}
        {!stats && <p className="text-sm text-muted">Loading stats…</p>}
      </div>

      <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-ink">Recent Orders</h2>
          <div className="flex gap-2">
            <button onClick={onGoBooks} className="text-xs font-bold text-brand hover:underline">
              Manage Books
            </button>
            <button onClick={onGoOrders} className="text-xs font-bold text-accent-dark hover:underline">
              View All Orders
            </button>
          </div>
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
                    : 'bg-green-50 text-green-700 border-green-300');
              return (
                <div key={o.id} className="flex flex-wrap justify-between items-center gap-2 text-sm border-b border-line last:border-0 pb-3">
                  <div>
                    <p className="font-bold text-ink">{o.reference}</p>
                    <p className="text-xs text-muted">
                      {o.user?.name} · {o.items.length} item(s)
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
  );
}

/* --------------------- Books --------------------- */

function BooksTab({ onGoInventory }: { onGoInventory?: () => void }) {
  const [books, setBooks] = useState<BookRow[] | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');

  const load = useCallback(() => {
    api
      .adminBooks(search)
      .then((res) => setBooks(res.books))
      .catch((e) => setError((e as Error).message));
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

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
        author: form.author,
        price: Number(form.price),
        stock: Number(form.stock),
        prevPrice: form.prevPrice ? Number(form.prevPrice) : null,
        description: form.description,
        coverImage: form.coverImage,
        category: form.category,
        featured: form.featured,
        bestseller: form.bestseller,
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
      author: b.author,
      price: String(b.price),
      stock: String(b.stock ?? 0),
      description: b.description || '',
      coverImage: b.coverImage || b.image || '',
      category: typeof b.category === 'object' && b.category ? b.category.slug || 'programming' : 'programming',
      featured: !!b.featured,
      bestseller: !!b.bestseller,
      prevPrice: b.prevPrice != null ? String(b.prevPrice) : '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-5 gap-6 items-start">
      {/* Form */}
      <div className="lg:col-span-2 bg-white border border-line rounded-2xl p-6 shadow-sm w-full">
        <h2 className="font-bold text-ink mb-4">{editing ? `Edit: ${editing}` : 'Add a Book'}</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm col-span-2">
            <span className="font-semibold">Title *</span>
            <input value={form.title} onChange={(e) => set('title', e.target.value)} className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
          </label>
          <label className="block text-sm col-span-2">
            <span className="font-semibold">Author *</span>
            <input value={form.author} onChange={(e) => set('author', e.target.value)} className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
          </label>
          <label className="block text-sm">
            <span className="font-semibold">Price (AED) *</span>
            <input value={form.price} onChange={(e) => set('price', e.target.value)} type="number" min="0" step="0.01" className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
          </label>
          <label className="block text-sm">
            <span className="font-semibold">Stock *</span>
            <input value={form.stock} onChange={(e) => set('stock', e.target.value)} type="number" min="0" className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
          </label>
          <label className="block text-sm">
            <span className="font-semibold">Was (AED)</span>
            <input value={form.prevPrice} onChange={(e) => set('prevPrice', e.target.value)} type="number" min="0" step="0.01" placeholder="optional" className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
          </label>
          <label className="block text-sm">
            <span className="font-semibold">Category</span>
            <select value={form.category} onChange={(e) => set('category', e.target.value)} className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none bg-white">
              <option value="programming">Programming</option>
              <option value="general">General</option>
            </select>
          </label>
          <label className="block text-sm col-span-2">
            <span className="font-semibold">Cover Image URL</span>
            <div className="flex gap-2">
              <input value={form.coverImage} onChange={(e) => set('coverImage', e.target.value)} placeholder="images/... or https://..." className="mt-1 flex-1 border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
              <label className="mt-1 border-2 border-brand rounded-xl px-3 py-2 text-xs font-bold text-brand cursor-pointer hover:bg-brand hover:text-white transition shrink-0 self-center">
                Upload
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onUploadCover(e.target.files[0])} />
              </label>
            </div>
          </label>
          <label className="block text-sm col-span-2">
            <span className="font-semibold">Description</span>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none" />
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

      {/* Table */}
      <div className="lg:col-span-3 bg-white border border-line rounded-2xl p-6 shadow-sm w-full">
        <div className="flex items-center justify-between mb-4 gap-2">
          <h2 className="font-bold text-ink">Books ({books ? books.length : '…'})</h2>
          <div className="flex items-center gap-2">
            {onGoInventory && (
              <button onClick={onGoInventory} className="text-xs font-bold text-accent-dark hover:underline shrink-0">
                Go to Inventory →
              </button>
            )}
            <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search admin catalog..."
            className="border-2 border-line rounded-xl px-3 py-1.5 text-sm focus:border-brand focus:outline-none max-w-[180px]"
          />
        </div>
        <div className="flex flex-col gap-3">
          {books === null && <p className="text-sm text-muted">Loading books…</p>}
          {books && !books.length && <p className="text-sm text-muted">No books found.</p>}
          {books?.map((b) => {
            const slug = b.slug || b.id;
            return (
            <div key={slug} className="flex items-center gap-3 border border-line rounded-xl p-3">
              <Image src={b.image} alt={b.title} width={40} height={53} className="object-contain rounded" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{b.title}</p>
                <p className="text-xs text-muted truncate">
                  {b.author} · {formatAED(b.price)} · stock {b.stock ?? 0}
                </p>
              </div>
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
  SHIPPED: 'bg-blue-50 text-blue-700 border-blue-300',
  DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  CANCELLED: 'bg-red-50 text-red-600 border-red-300',
};

const ACTION_LABEL: Record<string, string> = {
  PAID: 'Mark Paid',
  SHIPPED: 'Mark Shipped',
  DELIVERED: 'Mark Delivered',
  CANCELLED: 'Cancel',
};

const ACTION_STYLE: Record<string, string> = {
  PAID: 'bg-green-600 hover:bg-green-700',
  SHIPPED: 'bg-blue-600 hover:bg-blue-700',
  DELIVERED: 'bg-emerald-600 hover:bg-emerald-700',
  CANCELLED: 'bg-red-600 hover:bg-red-700',
};

function OrdersTab() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [openId, setOpenId] = useState('');

  const load = useCallback(() => {
    api
      .adminOrders({ status, search, page, pageSize: PAGE_SIZE })
      .then((res) => {
        setOrders(res.orders);
        setTotalPages(res.totalPages);
        setTotal(res.total);
      })
      .catch((e) => setError((e as Error).message));
  }, [status, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  function applyFilter(nextStatus: string) {
    setStatus(nextStatus);
    setPage(1);
  }

  function runSearch() {
    setPage(1);
    setSearch(searchInput.trim());
  }

  async function changeStatus(id: string, next: string) {
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

  return (
    <div>
      <div className="flex flex-col gap-3 mb-5">
        <div className="flex gap-2 overflow-x-auto">
          {['', ...ORDER_STATUSES].map((s) => (
            <button
              key={s || 'ALL'}
              onClick={() => applyFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                status === s ? 'bg-brand text-white' : 'bg-white border border-line text-ink'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            placeholder="Search by reference, name or email"
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
                  <p className="font-bold text-ink">{o.reference}</p>
                  <p className="text-xs text-muted">
                    {o.user?.name} · {o.user?.email} · {new Date(o.placedAt || Date.now()).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted mt-1">
                    Ship to: {o.contact?.name} · {o.contact?.phone} · {o.contact?.address || 'n/a'}
                  </p>
                </div>
                <p className="font-extrabold text-brand">{formatAED(o.total)}</p>
              </div>
              <p className="text-sm text-ink mb-3">
                {o.items.map((it) => `${it.name} × ${it.qty}`).join(', ')}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`border text-xs font-bold px-2.5 py-1 rounded-lg ${STATUS_COLOR[currentStatus] || ''}`}>
                  {currentStatus}
                </span>
                {nextMoves.map((next) => (
                  <button
                    key={next}
                    disabled={busyId === o.id}
                    onClick={() => changeStatus(o.id || '', next)}
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
                <div className="mt-4 border-t border-line pt-4 grid gap-4 lg:grid-cols-2">
                  <div>
                    <p className="text-xs font-bold text-muted uppercase tracking-wide mb-2">Items</p>
                    <ul className="space-y-1.5 text-sm">
                      {o.items.map((it, i) => (
                        <li key={i} className="flex justify-between gap-3">
                          <span className="text-ink">
                            {it.name} × {it.qty}
                          </span>
                          <span className="font-semibold whitespace-nowrap">
                            {formatAED(it.qty * (it.price || 0))}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {(o.discountAmount ?? 0) > 0 && (
                      <p className="flex justify-between text-sm text-green-600 mt-2">
                        <span>Discount</span>
                        <span>−{formatAED(o.discountAmount as number)}</span>
                      </p>
                    )}
                    {o.couponCode && (
                      <p className="text-[11px] text-muted mt-1">Coupon: {o.couponCode}</p>
                    )}
                    <p className="flex justify-between font-extrabold text-brand text-sm border-t border-line pt-2 mt-2">
                      <span>Total</span>
                      <span>{formatAED(o.total)}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted uppercase tracking-wide mb-2">Details</p>
                    <p className="text-sm text-ink">
                      Payment: <span className="font-semibold">{o.paymentMethod || '—'}</span>
                    </p>
                    <p className="text-sm text-ink">
                      Paid:{' '}
                      <span className="font-semibold">
                        {o.paidAt ? new Date(o.paidAt).toLocaleString() : 'Pending'}
                      </span>
                    </p>
                    <p className="text-sm text-ink mt-2">
                      Contact:{' '}
                      <span className="font-semibold">
                        {o.contact?.name || '—'} · {o.contact?.email || '—'} · {o.contact?.phone || '—'}
                      </span>
                    </p>
                    <p className="text-sm text-muted mt-1">
                      {o.contact?.address || 'No shipping address recorded.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1 rounded-lg border border-line font-semibold disabled:opacity-40 hover:bg-slate-50"
          >
            ← Prev
          </button>
          <span className="text-muted">
            Page <span className="font-bold text-ink">{page}</span> of <span className="font-bold text-ink">{totalPages}</span>
            <span className="ml-2">({total} total)</span>
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1 rounded-lg border border-line font-semibold disabled:opacity-40 hover:bg-slate-50"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

/* --------------------- Users --------------------- */

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .adminUsers()
      .then((res) => setUsers(res.users))
      .catch((e) => setError((e as Error).message));
  }, []);

  if (error) return <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">{error}</p>;

  return (
    <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
      <h2 className="font-bold text-ink mb-4">Customers ({users ? users.length : '…'})</h2>
      <div className="flex flex-col gap-2">
        {users === null && <p className="text-sm text-muted">Loading users…</p>}
        {users?.map((u) => (
          <div key={u.id} className="flex flex-wrap justify-between items-center gap-2 text-sm border-b border-line last:border-0 pb-2">
            <div>
              <p className="font-bold text-ink">{u.name}</p>
              <p className="text-xs text-muted">{u.email} · {u.mobile || 'no phone'}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted">{u.ordersCount} order(s)</span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                u.role === 'ADMIN' ? 'bg-brand text-white border-brand' : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}>
                {u.role}
              </span>
              <span className="text-xs text-muted">{new Date(u.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* --------------------- Categories --------------------- */

function CategoriesTab() {
  const [cats, setCats] = useState<CategoryItem[] | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(() => {
    api
      .adminCategories()
      .then((res) => setCats(res.categories))
      .catch((e) => setError((e as Error).message));
  }, []);

  useEffect(load, [load]);

  async function add() {
    if (!name.trim()) return;
    setError('');
    try {
      await api.adminCreateCategory(name.trim());
      setName('');
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function rename(c: CategoryItem) {
    const next = window.prompt('Rename category:', c.name);
    if (!next || next.trim() === c.name) return;
    try {
      await api.adminUpdateCategory(c.slug, next.trim());
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

  return (
    <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div className="flex-1 min-w-[220px]">
          <h2 className="font-bold text-ink mb-2">New Category</h2>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="e.g. Web Development"
            className="w-full border-2 border-line rounded-xl px-3 py-2 text-sm focus:border-brand focus:outline-none"
          />
        </div>
        <button onClick={add} className="btn-flash btn-primary-flash">Add Category</button>
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">{error}</p>}
      <div className="flex flex-col gap-2">
        {cats === null && <p className="text-sm text-muted">Loading categories…</p>}
        {cats?.map((c) => (
          <div key={c.id} className="flex flex-wrap justify-between items-center gap-2 text-sm border-b border-line last:border-0 pb-2">
            <div>
              <p className="font-bold text-ink">{c.name}</p>
              <p className="text-xs text-muted">/{c.slug} · {c.booksCount} book(s)</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => rename(c)} className="text-xs font-bold text-brand hover:underline">Rename</button>
              <button
                onClick={() => remove(c)}
                disabled={busy === c.id}
                className="text-xs font-bold text-red-600 hover:underline disabled:opacity-50"
              >
                {busy === c.id ? '…' : 'Delete'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* --------------------- Inventory --------------------- */

function InventoryTab() {
  const [books, setBooks] = useState<BookRow[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [prices, setPrices] = useState<Record<string, string>>({});

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
  }, []);

  useEffect(load, [load]);

  async function adjust(slug: string, delta: number) {
    setBusy(slug);
    try {
      const b = books?.find((x) => (x.slug || x.id) === slug);
      await api.adminUpdateBook(slug, { stock: Math.max(0, (b?.stock ?? 0) + delta) });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy('');
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

  const out = books?.filter((b) => (b.stock ?? 0) === 0).length ?? 0;
  const low = books?.filter((b) => (b.stock ?? 0) > 0 && (b.stock ?? 0) <= 10).length ?? 0;
  const healthy = books ? books.length - out - low : 0;

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-white border border-line rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-muted font-semibold uppercase">Total Titles</p>
          <p className="text-xl font-extrabold text-brand">{books ? books.length : '…'}</p>
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

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4 mb-4">{error}</p>}

      <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
        <h2 className="font-bold text-ink mb-4">Stock Levels</h2>
        <div className="flex flex-col gap-2">
          {books === null && <p className="text-sm text-muted">Loading inventory…</p>}
          {books?.map((b) => {
            const slug = b.slug || b.id;
            return (
              <div key={slug} className="flex flex-wrap items-center gap-3 border-b border-line last:border-0 py-2">
                <Image src={b.image} alt={b.title} width={32} height={43} className="object-contain rounded" />
                <div className="flex-1 min-w-[140px]">
                  <p className="font-bold text-sm truncate">{b.title}</p>
                  <p className="text-xs text-muted truncate">{b.author}</p>
                </div>
                <div className="w-28 text-right">{stockBadge(b.stock)}</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => adjust(slug, -1)}
                    disabled={busy === slug || (b.stock ?? 0) <= 0}
                    className="w-8 h-8 rounded-lg border border-line font-bold text-ink hover:border-brand disabled:opacity-40"
                  >
                    −
                  </button>
                  <button
                    onClick={() => adjust(slug, 1)}
                    disabled={busy === slug}
                    className="w-8 h-8 rounded-lg border border-line font-bold text-ink hover:border-brand disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={prices[slug] ?? ''}
                    onChange={(e) => setPrices((p) => ({ ...p, [slug]: e.target.value }))}
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-20 border-2 border-line rounded-lg px-2 py-1 text-sm focus:border-brand focus:outline-none"
                  />
                  <button
                    onClick={() => savePrice(slug)}
                    disabled={busy === slug}
                    className="text-xs font-bold text-brand hover:underline disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* --------------------- Discounts / Coupons --------------------- */

function DiscountsTab() {
  const [discounts, setDiscounts] = useState<DiscountItem[] | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ code: '', type: 'PERCENT', value: '10', minOrder: '0' });
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
      });
      setForm({ code: '', type: 'PERCENT', value: '10', minOrder: '0' });
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

  return (
    <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
      <h2 className="font-bold text-ink mb-4">Discount / Coupon System</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
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
          placeholder="Min order (AED 0)"
          className="border-2 border-line rounded-xl px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
        <button onClick={add} className="btn-flash btn-primary-flash">Create Coupon</button>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">{error}</p>}

      <div className="flex flex-col gap-2">
        {discounts === null && <p className="text-sm text-muted">Loading coupons…</p>}
        {discounts?.map((d) => {
          const eff = d.type === 'PERCENT' ? (d.value >= 100 ? 100 : d.value) : Math.min(d.value, 100);
          return (
            <div key={d.id} className="flex flex-wrap justify-between items-center gap-2 text-sm border-b border-line last:border-0 pb-2">
              <div>
                <p className="font-bold text-ink">
                  {d.code}{' '}
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${
                    d.active ? 'bg-green-50 text-green-700 border-green-300' : 'bg-slate-100 text-slate-500 border-slate-300'
                  }`}>
                    {d.active ? 'ACTIVE' : 'PAUSED'}
                  </span>
                </p>
                <p className="text-xs text-muted">
                  {d.type === 'PERCENT' ? `${d.value}% off` : `AED ${d.value} off`} · min order {formatAED(d.minOrder)} · e.g. AED 100 → −{formatAED(eff)} → {formatAED(100 - eff)}
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
              </div>
            )}
          </div>
        ))}
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
    days.push({ label: d.toLocaleDateString(undefined, { weekday: 'short' }), sum: Math.round(sum) });
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