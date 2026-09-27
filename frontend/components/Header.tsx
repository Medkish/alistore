'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useCart, useAuth } from '@/components/providers';
import { api } from '@/lib/api';
import { formatAED } from '@/lib/format';
import type { NotificationItem } from '@/lib/types';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/books/', label: 'Books' },
  { href: '/subscribe/', label: 'Subscribe' },
  { href: '/donate/', label: 'Donate' },
  { href: '/orders/', label: 'My Orders' },
  { href: '/profile/', label: 'Profile' },
];

function BellIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

function BagIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function SearchIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

export default function Header() {
  const { count, total } = useCart();
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
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

  // Close the mobile drawer and the bell whenever the route changes.
  useEffect(() => {
    setOpen(false);
    setBellOpen(false);
  }, [pathname]);

  async function markAllRead() {
    try {
      const r = await api.markNotificationsRead();
      setNotifs(r.notifications);
      setUnread(r.unread);
    } catch {
      /* offline */
    }
  }

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href);
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const q = search.trim();
    router.push(q ? `/books/?q=${encodeURIComponent(q)}` : '/books/');
  }

  return (
    <header className="sticky top-0 z-50">
      {/* Announcement strip */}
      <div className="bg-brand-ink text-white/85 text-[11px] sm:text-xs pt-[env(safe-area-inset-top)]">
        <div className="mx-auto max-w-6xl px-4 min-h-8 py-1 flex items-center justify-between gap-3">
          <p className="truncate">
            Free delivery across the UAE on orders over{' '}
            <span className="text-accent font-semibold">AED 60</span>
          </p>
          {user ? (
            <Link href="/profile/" className="shrink-0 max-w-[40vw] truncate font-semibold text-accent hover:underline">
              Hi, {user.name.split(' ')[0]}
            </Link>
          ) : (
            <div className="flex shrink-0 items-center gap-2">
              <Link href="/login/" className="hover:text-accent">
                Sign in
              </Link>
              <span className="text-white/30">|</span>
              <Link href="/register/" className="hover:text-accent">
                Create account
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Main bar */}
      <div className="bg-white/95 backdrop-blur border-b border-line">
        <div className="mx-auto max-w-6xl px-4">
          <div className="h-16 flex items-center gap-3 lg:gap-5">
            <Link href="/" className="shrink-0 flex items-center gap-2.5 group" aria-label="AlioStore home">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-accent font-black text-sm shadow-card transition-transform group-hover:-rotate-3">
                A
              </span>
              <span className="leading-none">
                <span className="block text-lg font-extrabold text-brand tracking-tight">AlioStore</span>
                <span className="block text-[9px] font-bold uppercase tracking-[0.22em] text-accent-dark mt-0.5">
                  Online Books
                </span>
              </span>
            </Link>

            <form onSubmit={onSearch} className="hidden md:flex flex-1 max-w-sm items-stretch ml-auto" role="search">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search books, authors…"
                aria-label="Search books"
                className="field !rounded-r-none !border-r-0"
              />
              <button type="submit" className="btn-flash btn-brand !rounded-l-none !px-3" aria-label="Search">
                <SearchIcon className="h-4 w-4" />
              </button>
            </form>

            <nav className="hidden lg:flex items-center gap-1 ml-auto" aria-label="Main">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={isActive(n.href) ? 'page' : undefined}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    isActive(n.href)
                      ? 'bg-brand text-white'
                      : 'text-ink hover:bg-surface-2 hover:text-brand'
                  }`}
                >
                  {n.label}
                </Link>
              ))}
              {user && (
                <button
                  onClick={logout}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-muted transition-colors hover:bg-red-50 hover:text-red-700"
                >
                  Sign out
                </button>
              )}
            </nav>

            <div className="flex items-center gap-1.5 ml-auto lg:ml-0">
              {user && (
                <div className="relative" ref={bellRef}>
                  <button
                    onClick={() => setBellOpen((b) => !b)}
                    aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
                    aria-expanded={bellOpen}
                    className="relative grid h-11 w-11 place-items-center rounded-lg text-brand transition-colors hover:bg-surface-2"
                  >
                    <BellIcon className="h-5 w-5" />
                    {unread > 0 && (
                      <span className="absolute right-1 top-1 min-w-[18px] rounded-full bg-danger px-1 text-[10px] font-bold leading-[18px] text-white">
                        {unread}
                      </span>
                    )}
                  </button>
                  {bellOpen && (
                    <div className="absolute right-0 mt-2 w-80 max-w-[85vw] rounded-2xl border border-line bg-white shadow-pop p-2 z-50 animate-rise">
                      <div className="flex items-center justify-between px-2 py-1.5">
                        <p className="text-sm font-extrabold text-brand">Notifications</p>
                        {unread > 0 && (
                          <button onClick={markAllRead} className="text-xs font-bold text-accent-dark hover:underline">
                            Mark all read
                          </button>
                        )}
                      </div>
                      {notifs.length === 0 ? (
                        <p className="px-2 py-6 text-center text-xs text-muted">No notifications yet.</p>
                      ) : (
                        <div className="max-h-72 overflow-y-auto">
                          {notifs.map((n) => (
                            <div
                              key={n.id}
                              className={`rounded-xl px-3 py-2.5 text-sm ${n.read ? 'opacity-60' : 'bg-accent-soft/60'}`}
                            >
                              <p className="font-bold text-ink">{n.title}</p>
                              <p className="text-xs text-muted">{n.message}</p>
                              <p className="mt-1 text-[10px] text-muted">
                                {new Date(n.at).toLocaleString(undefined, {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                })}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <Link
                href="/cart/"
                className="flex items-center gap-2 rounded-lg px-2.5 h-11 text-brand transition-colors hover:bg-surface-2"
                aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}
              >
                <span className="relative">
                  <BagIcon className="h-5 w-5" />
                  <span className="absolute -right-1.5 -top-1.5 min-w-[18px] rounded-full bg-accent px-1 text-[10px] font-bold leading-[18px] text-brand-ink">
                    {count}
                  </span>
                </span>
                <span className="hidden sm:inline text-sm font-semibold">{total > 0 ? formatAED(total) : 'Cart'}</span>
              </Link>

              <button
                className="lg:hidden grid h-11 w-11 place-items-center rounded-lg border border-line text-brand transition-colors hover:bg-surface-2"
                onClick={() => setOpen((o) => !o)}
                aria-label="Toggle menu"
                aria-expanded={open}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5" aria-hidden="true">
                  {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile search */}
          <form onSubmit={onSearch} className="md:hidden pb-3 flex items-stretch gap-2" role="search">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search books, authors…"
              aria-label="Search books"
              className="field"
            />
            <button type="submit" className="btn-flash btn-brand shrink-0" aria-label="Search">
              <SearchIcon className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* Mobile drawer */}
        {open && (
          <nav className="lg:hidden border-t border-line bg-white animate-rise" aria-label="Mobile">
            <div className="mx-auto max-w-6xl px-4 py-3 flex flex-col">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(n.href) ? 'page' : undefined}
                  className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                    isActive(n.href) ? 'bg-brand text-white' : 'text-ink hover:bg-surface-2'
                  }`}
                >
                  {n.label}
                </Link>
              ))}
              {user && (
                <button
                  onClick={() => {
                    logout();
                    setOpen(false);
                  }}
                  className="rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-muted transition-colors hover:bg-red-50 hover:text-red-700"
                >
                  Sign out
                </button>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
