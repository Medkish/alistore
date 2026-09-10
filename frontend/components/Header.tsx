'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCart, useAuth } from '@/components/providers';
import { formatAED } from '@/lib/format';

export default function Header() {
  const { count, total } = useCart();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const nav = [
    { href: '/', label: 'Home' },
    { href: '/books/', label: 'Books' },
    { href: '/orders/', label: 'My Orders' },
    { href: '/profile/', label: 'Profile' },
  ];

  return (
    <header className="sticky top-0 z-50">
      {/* Dark top bar */}
      <div className="bg-brand text-white text-sm">
        <div className="mx-auto max-w-6xl px-4 py-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs sm:text-sm">
            Welcome to <strong className="text-accent">AlioStore</strong>{' '}
            <span className="hidden sm:inline">· books that fund change</span>
          </p>
          <div className="flex items-center gap-3 text-xs sm:text-sm">
            {user ? (
              <Link href="/profile/" className="font-semibold text-accent hover:underline">
                Hello, {user.name.split(' ')[0]}
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login/" className="hover:underline">
                  Login
                </Link>
                <span className="opacity-50">/</span>
                <Link href="/register/" className="hover:underline">
                  Register
                </Link>
              </div>
            )}
            <Link href="/cart/" className="flex items-center gap-2 hover:opacity-80">
              <span className="relative">
                Cart
                <span className="absolute -top-2 -right-3 bg-accent text-brand rounded-full text-[10px] font-bold px-1.5">
                  {count}
                </span>
              </span>
              {total > 0 && <span className="hidden sm:inline opacity-80">({formatAED(total)})</span>}
            </Link>
          </div>
        </div>
      </div>

      {/* White bar */}
      <div className="bg-white shadow-md">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
          <Link href="/" className="font-extrabold text-brand text-xl leading-tight">
            AlioStore
            <span className="block text-[10px] font-bold text-accent-dark tracking-[0.2em] uppercase">
              Online Books
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-ink">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="hover:text-accent-dark">
                {n.label}
              </Link>
            ))}
            {user && (
              <button
                onClick={logout}
                className="text-muted hover:text-red-600 text-sm font-semibold"
              >
                Sign out
              </button>
            )}
          </nav>

          <button
            className="md:hidden border border-accent text-brand rounded-lg px-3 py-1.5 text-sm font-semibold"
            onClick={() => setOpen((o) => !o)}
          >
            Menu
          </button>
        </div>

        {open && (
          <nav className="md:hidden border-t border-line bg-white px-4 py-3 flex flex-col gap-2 text-sm font-semibold">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="hover:text-accent-dark">
                {n.label}
              </Link>
            ))}
            {user && (
              <button
                onClick={() => {
                  logout();
                  setOpen(false);
                }}
                className="text-left text-muted hover:text-red-600"
              >
                Sign out
              </button>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}