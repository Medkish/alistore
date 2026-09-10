'use client';

import Link from 'next/link';
import { useAuth } from '@/components/providers';

export default function ProfilePage() {
  const { user, logout } = useAuth();

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

  return (
    <section className="py-10 md:py-16">
      <div className="mx-auto max-w-lg px-4">
        <h1 className="text-2xl md:text-3xl font-extrabold text-brand mb-8">My Profile</h1>

        <div className="bg-white border border-line rounded-2xl p-6 mb-6">
          <h2 className="font-bold mb-4">{user.name}</h2>
          <dl className="text-sm space-y-3">
            <div className="flex justify-between">
              <dt className="text-muted">Email</dt>
              <dd className="font-semibold text-ink">{user.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Mobile</dt>
              <dd className="font-semibold text-ink">{user.mobile || '—'}</dd>
            </div>
          </dl>
        </div>

        {user.subscriptions && user.subscriptions.length > 0 && (
          <div className="bg-white border border-line rounded-2xl p-6 mb-6">
            <h2 className="font-bold mb-3">Subscriptions</h2>
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

        <div className="flex gap-4">
          <Link href="/orders/" className="btn-flash btn-primary-flash flex-1 text-center">
            My Orders
          </Link>
          <button
            onClick={logout}
            className="btn-flash btn-outline-flash flex-1 text-center text-red-600 border-red-300 hover:bg-red-50"
          >
            Sign Out
          </button>
        </div>
      </div>
    </section>
  );
}