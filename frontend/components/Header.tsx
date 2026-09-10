'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useCart, useAuth } from '@/components/providers';
import { api } from '@/lib/api';
import { formatAED } from '@/lib/format';
import type { NotificationItem } from '@/lib/types';

export default function Header() {
  const { count, total } = useCart();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const router = useRouter();
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancel = false;
    if (user) {
      api
        .getNotifications()
        .then((r) => {
          if (cancel) return;
          setNotifs(r.notifications);
          setUnread(r.unread);
        })
        .catch(() => undefined);
    }
    return () => {
      cancel = true;
    };
  }, [user]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function markAllRead() {
    try {
      const r = await api.markNotificationsRead();
      setNotifs(r.notifications);
      setUnread(r.unread);
    } catch {
      /* offline */
    }
  }

  const nav = [
    { href: '/', label: 'Home' },
    { href: '/books/', label: 'Books' },
    { href: '/orders/', label: 'My Orders' },
    { href: '/profile/', label: 'Profile' },
    ...(user?.role === 'ADMIN' ? [{ href: '/admin/', label: 'Admin' }] : []),
  ];

  function onSearch(e: FormEvent) {
    e.preventDefault();
    router.push(`/books/?q=${encodeURIComponent(search.trim())}`);
  }

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
          </div>
        </div>
      </div>

      {/* White bar */}
      <div className="bg-white shadow-md">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
          <Link href="/" className="font-extrabold text-brand text-xl leading-tight shrink-0">
            AlioStore
            <span className="block text-[10px] font-bold text-accent-dark tracking-[0.2em] uppercase">
              Online Books
            </span>
          </Link>

          <form onSubmit={onSearch} className="hidden md:flex flex-1 max-w-md mx-auto items-stretch">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search books..."
              className="w-full border-2 border-brand rounded-l-xl px-4 py-2 text-sm focus:border-accent focus:outline-none"
            />
            <button
              type="submit"
              className="bg-brand text-white rounded-r-xl px-4 text-sm font-bold hover:bg-accent hover:text-brand transition"
            >
              Search
            </button>
          </form>

          <nav className="hidden lg:flex items-center gap-5 text-sm font-semibold text-ink ml-auto">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="hover:text-accent-dark">
                {n.label}
              </Link>
            ))}
            {user && (
              <button onClick={logout} className="text-muted hover:text-red-600 text-sm font-semibold">
                Sign out
              </button>
            )}
          </nav>

          <div className="flex items-center gap-3 ml-auto lg:ml-0">
            {user && (
              <div className="relative" ref={bellRef}>
                <button
                  onClick={() => setBellOpen((b) => !b)}
                  className="relative shrink-0 text-xl hover:opacity-80"
                  aria-label="Notifications"
                >
                  🔔
                  {unread > 0 && (
                    <span className="absolute -top-2 -right-3 bg-red-500 text-white rounded-full text-[10px] font-bold px-1.5">
                      {unread}
                    </span>
                  )}
                </button>
                {bellOpen && (
                  <div className="absolute right-0 mt-3 w-80 max-w-[90vw] bg-white border border-line rounded-2xl shadow-xl p-2 z-50">
                    <div className="flex items-center justify-between px-2 py-1">
                      <p className="text-sm font-extrabold text-brand">Notifications</p>
                      {unread > 0 && (
                        <button onClick={markAllRead} className="text-xs text-accent-dark font-bold hover:underline">
                          Mark all read
                        </button>
                      )}
                    </div>
                    {notifs.length === 0 ? (
                      <p className="text-xs text-muted px-2 py-4 text-center">No notifications yet.</p>
                    ) : (
                      <div className="max-h-72 overflow-y-auto">
                        {notifs.map((n) => (
                          <div
                            key={n.id}
                            className={`px-2 py-2 rounded-xl text-sm ${n.read ? 'opacity-60' : 'bg-accent/10'}`}
                          >
                            <p className="font-bold text-ink">{n.title}</p>
                            <p className="text-xs text-muted">{n.message}</p>
                            <p className="text-[10px] text-muted mt-1">
                              {new Date(n.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <Link href="/cart/" className="flex items-center gap-2 hover:opacity-80">
              <span className="relative shrink-0">
                🛒
                <span className="absolute -top-2 -right-3 bg-accent text-brand rounded-full text-[10px] font-bold px-1.5">
                  {count}
                </span>
              </span>
              <span className="hidden sm:inline text-sm font-semibold text-brand">
                {total > 0 ? formatAED(total) : 'Cart'}
              </span>
            </Link>
            <button
              className="lg:hidden border border-accent text-brand rounded-lg px-3 py-1.5 text-sm font-semibold"
              onClick={() => setOpen((o) => !o)}
            >
              Menu
            </button>
          </div>
        </div>

        {/* Mobile search row */}
        <form onSubmit={onSearch} className="md:hidden px-4 pb-3 flex items-stretch gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search books..."
            className="flex-1 border-2 border-brand rounded-xl px-4 py-2 text-sm focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            className="bg-brand text-white rounded-xl px-4 text-sm font-bold hover:bg-accent hover:text-brand transition"
          >
            Search
          </button>
        </form>

        {open && (
          <nav className="lg:hidden border-t border-line bg-white px-4 py-3 flex flex-col gap-2 text-sm font-semibold">
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