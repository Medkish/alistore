import Link from 'next/link';

type FooterLink = { label: string; href?: string };

const columns: { title: string; links: FooterLink[] }[] = [
  {
    title: 'About',
    links: [
      { label: 'Our story' },
      { label: 'Careers' },
      { label: 'Service terms' },
      { label: 'Donate', href: '/donate/' },
    ],
  },
  {
    title: 'Discover',
    links: [
      { label: 'Home', href: '/' },
      { label: 'Books', href: '/books/' },
      { label: 'Subjects', href: '/books/' },
      { label: 'Track an order', href: '/track/' },
    ],
  },
  {
    title: 'My account',
    links: [
      { label: 'Sign in', href: '/login/' },
      { label: 'Create account', href: '/register/' },
      { label: 'My orders', href: '/orders/' },
      { label: 'Notifications', href: '/notifications/' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Help center' },
      { label: 'Report a problem' },
      { label: 'Suggest an edit' },
      { label: 'Contact us' },
    ],
  },
];

const payments = ['Visa', 'Mastercard', 'PayPal', 'Apple Pay'];

export default function Footer() {
  return (
    <footer className="bg-brand-gradient text-white mt-16 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-brand-ink font-black text-sm">
                A
              </span>
              <span className="text-lg font-extrabold tracking-tight">AlioStore</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-white/70">
              The online home of Alio &amp; Palma Cooperative — programming titles written to teach,
              inspire and fund real change.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {payments.map((p) => (
                <span
                  key={p}
                  className="rounded-md border border-white/20 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/80"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>

          {columns.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-accent">{c.title}</h2>
              <ul className="mt-4 space-y-2.5 text-sm">
                {c.links.map((l) => (
                  <li key={l.label}>
                    {l.href ? (
                      <Link href={l.href} className="text-white/70 transition-colors hover:text-accent">
                        {l.label}
                      </Link>
                    ) : (
                      <span className="text-white/45">{l.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/55">
          <p>&copy; {new Date().getFullYear()} AlioStore — Alio &amp; Palma Cooperative. Read smart.</p>
          <p className="flex items-center gap-4">
            <span>Privacy</span>
            <span>Terms</span>
            <Link href="/donate/" className="text-accent hover:underline">
              Support us
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
