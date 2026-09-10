'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/providers';
import { formatAED, formatNumber } from '@/lib/format';
import {
  ORDER_STATUSES,
  type AdminStats,
  type AdminUser,
  type Book,
  type Order,
  type OrderStatus,
} from '@/lib/types';

type Tab = 'overview' | 'books' | 'orders' | 'users';

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
            <p className="text-sm text-muted">Manage books, orders, customers and store revenue.</p>
          </div>
          <span className="bg-brand text-accent text-xs font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wide">
            {user?.role}
          </span>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto">
          {(['overview', 'books', 'orders', 'users'] as Tab[]).map((t) => (
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
        {tab === 'books' && <BooksTab />}
        {tab === 'orders' && <OrdersTab />}
        {tab === 'users' && <UsersTab />}
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
        { label: 'Books', value: formatNumber(stats.bookCount), accent: false },
        { label: 'Units in Stock', value: formatNumber(stats.stockTotal), accent: false },
        { label: 'Customers', value: formatNumber(stats.userCount), accent: false },
        { label: 'Revenue (paid)', value: formatAED(stats.revenue), accent: true },
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

function BooksTab() {
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
  );
}

/* --------------------- Orders --------------------- */

function OrdersTab() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(() => {
    api
      .adminOrders(status || undefined)
      .then((res) => setOrders(res.orders))
      .catch((e) => setError((e as Error).message));
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeStatus(id: string, next: string) {
    setBusyId(id);
    try {
      await api.adminSetOrderStatus(id, next);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusyId('');
  }

  return (
    <div>
      <div className="flex gap-2 mb-5 overflow-x-auto">
        {['', ...ORDER_STATUSES].map((s) => (
          <button
            key={s || 'ALL'}
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
              status === s ? 'bg-brand text-white' : 'bg-white border border-line text-ink'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4 mb-4">{error}</p>}

      <div className="flex flex-col gap-4">
        {orders === null && <p className="text-sm text-muted">Loading orders…</p>}
        {orders && !orders.length && <p className="text-sm text-muted">No orders in this state.</p>}
        {orders?.map((o) => (
          <div key={o.id} className="bg-white border border-line rounded-2xl p-5 shadow-sm">
            <div className="flex flex-wrap justify-between gap-3 mb-3">
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
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={o.status}
                disabled={busyId === o.id}
                onChange={(e) => changeStatus(o.id as string, e.target.value)}
                className="border-2 border-brand rounded-xl px-3 py-2 text-sm font-semibold bg-white disabled:opacity-50"
              >
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <span className="text-xs text-muted">
                {o.status === 'DELIVERED' ? 'Completed' : `Currently: ${o.status}`}
              </span>
            </div>
          </div>
        ))}
      </div>
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