'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/components/providers';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      router.push('/profile/');
    } catch {
      setError('Login failed — try again.');
    }
    setLoading(false);
  }

  return (
    <section className="py-16">
      <div className="mx-auto max-w-md px-4">
        <h1 className="text-2xl font-extrabold text-brand mb-6 text-center">Login</h1>
        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-2 text-sm mb-4 text-center">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="bg-white border border-line rounded-2xl p-6 flex flex-col gap-4">
          <div>
            <label className="text-sm font-semibold text-ink mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border-2 border-line rounded-xl px-4 py-2.5 text-sm focus:border-accent focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-ink mb-1 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-2 border-line rounded-xl px-4 py-2.5 text-sm focus:border-accent focus:outline-none"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-flash btn-primary-flash w-full text-sm py-3 disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Login'}
          </button>
          <p className="text-center text-sm text-muted">
            New here?{' '}
            <Link href="/register/" className="text-accent-dark font-semibold underline">
              Create an account
            </Link>
          </p>
        </form>
      </div>
    </section>
  );
}