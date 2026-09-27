'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers';
import { getToken } from '@/lib/api';
import { useAdminGuard } from '@/lib/admin';
import { Btn, Loading } from '@/components/admin/ui';

interface NavItem {
  href: string;
  label: string;
  desc: string;
  glyph: string;
}

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: 'Overview',
    items: [{ href: '/admin/', label: 'Dashboard', desc: 'Sales, stock and activity', glyph: '◧' }],
  },
  {
    group: 'Catalogue',
    items: [
      { href: '/admin/books/', label: 'Books', desc: 'Listings, stock and pricing', glyph: '▤' },
      { href: '/admin/orders/', label: 'Orders', desc: ' fulfilment and tracking', glyph: '▣' },
      { href: '/admin/users/', label: 'Customers', desc: 'Accounts, roles and access', glyph: '◉' },
    ],
  },
  {
    group: 'Growth',
    items: [
      { href: '/admin/donations/', label: 'Donations', desc: 'Support and campaigns', glyph: '◈' },
      { href: '/admin/analytics/', label: 'Analytics', desc: 'Traffic and conversion', glyph: '◨' },
    ],
  },
  {
    group: 'Configuration',
    items: [
      { href: '/admin/campaigns/', label: 'Campaigns', desc: 'Fundraising campaigns', glyph: '◎' },
      { href: '/admin/settings/', label: 'Settings', desc: 'Store, website and system', glyph: '⚙' },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/admin/') return pathname === '/admin' || pathname === '/admin/';
  return pathname === href || pathname.startsWith(href);
}

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {NAV.map((section) => (
        <div key={section.group}>
          <p className="px-3 pb-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">
            {section.group}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 transition ${
                      active ? 'bg-brand text-white shadow-sm' : 'text-ink hover:bg-surface-2'
                    }`}
                  >
                    <span aria-hidden className="grid w-6 shrink-0 place-items-center text-base">
                      {item.glyph}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{item.label}</span>
                      <span className={`block truncate text-[11px] ${active ? 'text-white/70' : 'text-muted'}`}>
                        {item.desc}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/admin/" className="flex items-center gap-2.5 px-4 py-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand text-sm font-black text-white">
        CM
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-extrabold text-ink">Code-Me Admin</span>
        <span className="block text-[11px] text-muted">Store management</span>
      </span>
    </Link>
  );
}

function AccountCard({ name, email, onSignOut }: { name: string; email: string; onSignOut: () => void }) {
  return (
    <div className="shrink-0 border-t border-line p-3">
      <div className="mb-2 flex min-w-0 items-center gap-2.5 px-1">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-2 text-sm font-bold text-white">
          {name.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-bold text-ink">{name}</span>
          <span className="block truncate text-[11px] text-muted">{email}</span>
        </span>
      </div>
      <div className="flex gap-2">
        <Btn variant="outline" className="flex-1 !px-2 !text-xs" onClick={onSignOut}>
          Sign out
        </Btn>
        <Link
          href="/"
          className="btn-flash btn-ghost-flash min-h-11 flex-1 !px-2 !text-xs text-muted"
        >
          View store
        </Link>
      </div>
    </div>
  );
}

function Denied({ onSignedIn }: { onSignedIn: () => void }) {
  const { login, logout, user } = useAuth();
  const [email, setEmail] = useState('admin@aliostore.com');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const signedIn = await login(email.trim(), password);

      // AuthProvider.login() swallows a rejected login and fabricates a
      // local user, so a missing token is the only reliable signal that the
      // credentials were actually refused.
      if (!getToken()) {
        setError('Those sign-in details were not accepted.');
        logout();
        return;
      }
      if (signedIn.role !== 'ADMIN') {
        setError('That account does not have admin access.');
        logout();
        return;
      }
      onSignedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-surface px-4 py-10">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand text-lg font-black text-white">
            CM
          </span>
          <h1 className="text-xl font-extrabold text-ink">Admin sign in</h1>
          <p className="mt-1.5 text-sm text-muted">
            This area is restricted to store administrators.
          </p>
        </div>

        {user?.email && (
          <p className="mb-4 rounded-xl border border-line bg-surface px-3 py-2.5 text-xs text-muted">
            Currently signed in as <span className="font-bold text-ink">{user.email}</span>, which is not an
            admin account.
          </p>
        )}

        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-ink">Email</span>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field min-h-11"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-ink">Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field min-h-11"
            />
          </label>
          {error && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700">
              {error}
            </p>
          )}
          <Btn type="submit" busy={busy} className="w-full">
            Sign in
          </Btn>
        </form>

        <Link href="/" className="btn-flash btn-ghost-flash mt-2 w-full text-muted">
          Back to the store
        </Link>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [attempt, setAttempt] = useState(0);
  const state = useAdminGuard(attempt);
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    setDrawer(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawer) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawer]);

  if (state === 'checking') {
    return (
      <div className="grid min-h-dvh place-items-center bg-surface">
        <Loading label="Verifying admin access" />
      </div>
    );
  }

  if (state === 'denied') return <Denied onSignedIn={() => setAttempt((n) => n + 1)} />;

  const name = user?.name || 'Administrator';
  const email = user?.email || '';

  return (
    <div className="flex min-h-dvh flex-col bg-surface lg:flex-row">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-[120] flex shrink-0 items-center justify-between gap-3 border-b border-line bg-white px-3 py-2.5 pt-[calc(0.625rem+env(safe-area-inset-top))] lg:hidden">
        <Link href="/admin/" className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand text-xs font-black text-white">
            CM
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-extrabold text-ink">Code-Me Admin</span>
            <span className="block truncate text-[11px] text-muted">{NAV.find((s) => s.items.some((i) => isActive(pathname, i.href)))?.group || 'Overview'}</span>
          </span>
        </Link>
        <button
          onClick={() => setDrawer(true)}
          aria-label="Open admin menu"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line text-brand"
        >
          <span aria-hidden className="flex flex-col gap-[3px]">
            <span className="block h-[2px] w-4 rounded bg-current" />
            <span className="block h-[2px] w-4 rounded bg-current" />
            <span className="block h-[2px] w-4 rounded bg-current" />
          </span>
        </button>
      </header>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-[150] lg:hidden">
          <button aria-label="Close menu" onClick={() => setDrawer(false)} className="absolute inset-0 bg-ink/50" />
          <div className="absolute inset-y-0 left-0 flex w-[17rem] max-w-[86vw] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-2 border-b border-line">
              <Brand />
              <button
                onClick={() => setDrawer(false)}
                aria-label="Close menu"
                className="mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-lg text-xl text-muted hover:bg-surface-2"
              >
                &times;
              </button>
            </div>
            <NavList pathname={pathname} onNavigate={() => setDrawer(false)} />
            <AccountCard name={name} email={email} onSignOut={logout} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-[16.5rem] shrink-0 flex-col border-r border-line bg-white lg:flex">
        <div className="shrink-0 border-b border-line">
          <Brand />
        </div>
        <NavList pathname={pathname} />
        <AccountCard name={name} email={email} onSignOut={logout} />
      </aside>

      <main className="min-w-0 flex-1 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-5 sm:py-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
