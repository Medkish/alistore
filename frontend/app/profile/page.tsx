'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/components/providers';
import { api } from '@/lib/api';

type Tab = 'account' | 'security';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<Tab>('account');

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [changing, setChanging] = useState(false);
  const [pwMsg, setPwMsg] = useState('');

  if (!user) {
    return (
      <section className="py-16 text-center">
        <p className="text-muted mb-6">Please login or create an account first.</p>
        <div className="flex justify-center gap-4">
          <Link href="/login/" className="btn-flash btn-primary-flash">
            Login
          </Link>
          <Link href="/register/" className="btn-flash btn-outline-flash text-brand border-brand">
            Register
          </Link>
        </div>
      </section>
    );
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setProfileMsg('Name is required.');
      return;
    }
    setSaving(true);
    setProfileMsg('');
    try {
      await api.updateProfile(name.trim(), mobile.trim());
      setProfileMsg('Profile updated.');
      window.location.reload();
    } catch (err) {
      setProfileMsg(err instanceof Error ? err.message : 'Could not update profile.');
    }
    setSaving(false);
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!current || next.length < 6) {
      setPwMsg('Enter your current password and a new password of at least 6 characters.');
      return;
    }
    if (next !== confirm) {
      setPwMsg('New password and confirmation do not match.');
      return;
    }
    setChanging(true);
    setPwMsg('');
    try {
      await api.changePassword(current, next);
      setPwMsg('Password changed. A security notification was added to your account.');
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      setPwMsg(err instanceof Error ? err.message : 'Could not change the password.');
    }
    setChanging(false);
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'account', label: 'Account' },
    { id: 'security', label: 'Security' },
  ];

  return (
    <section className="py-10 md:py-16">
      <div className="mx-auto max-w-2xl px-4">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-brand">My Account</h1>
            <p className="text-sm text-muted mt-1">Manage your profile, orders and security.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="h-12 w-12 rounded-full bg-brand text-white font-extrabold flex items-center justify-center text-lg">
              {user.name.charAt(0).toUpperCase()}
            </span>
            <div>
              <p className="font-bold text-ink">{user.name}</p>
              <p className="text-xs text-muted">{user.email}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <Link href="/orders/" className="bg-white border border-line rounded-2xl p-4 text-center hover:border-accent hover:shadow-md transition">
            <span className="text-2xl">📦</span>
            <p className="text-xs font-bold text-ink mt-1">Orders</p>
          </Link>
          <Link href="/wishlist/" className="bg-white border border-line rounded-2xl p-4 text-center hover:border-accent hover:shadow-md transition">
            <span className="text-2xl">❤️</span>
            <p className="text-xs font-bold text-ink mt-1">Wishlist</p>
          </Link>
          <Link href="/cart/" className="bg-white border border-line rounded-2xl p-4 text-center hover:border-accent hover:shadow-md transition">
            <span className="text-2xl">🛒</span>
            <p className="text-xs font-bold text-ink mt-1">Cart</p>
          </Link>
          <Link href="/notifications/" className="bg-white border border-line rounded-2xl p-4 text-center hover:border-accent hover:shadow-md transition">
            <span className="text-2xl">🔔</span>
            <p className="text-xs font-bold text-ink mt-1">Notifications</p>
          </Link>
        </div>

        <div className="flex gap-2 mb-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`btn-flash text-sm ${tab === t.id ? 'btn-primary-flash' : 'btn-outline-flash text-brand border-brand'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'account' && (
          <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold mb-4">Profile details</h2>
            <form onSubmit={saveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted mb-1">Full name</label>
                <input
                  defaultValue={user.name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border-2 border-line rounded-xl px-3 py-2 text-sm focus:border-brand focus:outline-none"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted mb-1">Email</label>
                <input
                  value={user.email}
                  disabled
                  className="w-full border-2 border-line rounded-xl px-3 py-2 text-sm bg-slate-50 text-muted"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted mb-1">Mobile</label>
                <input
                  defaultValue={user.mobile || ''}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full border-2 border-line rounded-xl px-3 py-2 text-sm focus:border-brand focus:outline-none"
                  placeholder="+9715..."
                />
              </div>
              {profileMsg && <p className="text-sm text-green-700 font-semibold">{profileMsg}</p>}
              <button type="submit" disabled={saving} className="btn-flash btn-primary-flash">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </form>

            {user.subscriptions && user.subscriptions.length > 0 && (
              <div className="mt-8 border-t border-line pt-4">
                <h3 className="font-bold mb-3">Subscriptions</h3>
                {user.subscriptions.map((s, i) => (
                  <div key={i} className="flex justify-between text-sm py-2 border-b border-line last:border-0">
                    <span>
                      {s.plan} · {s.per}
                    </span>
                    <span className="font-semibold">AED {s.price}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'security' && (
          <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold mb-4">Change password</h2>
            <p className="text-xs text-muted mb-4">
              Updating your password creates a security notification so you can spot unrecognised changes.
            </p>
            <form onSubmit={changePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted mb-1">Current password</label>
                <input
                  type="password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  className="w-full border-2 border-line rounded-xl px-3 py-2 text-sm focus:border-brand focus:outline-none"
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted mb-1">New password</label>
                <input
                  type="password"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  className="w-full border-2 border-line rounded-xl px-3 py-2 text-sm focus:border-brand focus:outline-none"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted mb-1">Confirm new password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full border-2 border-line rounded-xl px-3 py-2 text-sm focus:border-brand focus:outline-none"
                  autoComplete="new-password"
                />
              </div>
              {pwMsg && <p className={`text-sm font-semibold ${pwMsg.includes('changed') ? 'text-green-700' : 'text-red-600'}`}>{pwMsg}</p>}
              <button type="submit" disabled={changing} className="btn-flash btn-primary-flash">
                {changing ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          </div>
        )}

        <div className="mt-8">
          <button
            onClick={logout}
            className="btn-flash btn-outline-flash w-full text-center text-red-600 border-red-300 hover:bg-red-50"
          >
            Sign Out
          </button>
        </div>
      </div>
    </section>
  );
}