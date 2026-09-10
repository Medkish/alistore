import Link from 'next/link';

const columns = [
  { title: 'About Us', links: ['Vision', 'Articles', 'Careers', 'Service terms', 'Donate'] },
  { title: 'Discover', links: [{ l: 'Home', h: '/' }, { l: 'Books', h: '/books/' }, 'Authors', 'Subjects', 'Advanced Search'] },
  { title: 'My Account', links: ['Sign In', { l: 'View Cart', h: '/cart/' }, 'My Wishlist', 'Track My Order'] },
  { title: 'Help', links: ['Help center', 'Report a problem', 'Suggesting edits', 'Contact us'] },
];

function resolve(item: string | { l: string; h: string }, i: number) {
  if (typeof item === 'string') return <li key={i}>{item}</li>;
  return (
    <li key={i}>
      <Link href={item.h} className="hover:text-accent">
        {item.l}
      </Link>
    </li>
  );
}

export default function Footer() {
  return (
    <footer className="bg-brand text-white mt-12">
      <div className="mx-auto max-w-6xl px-4 py-12 grid gap-8 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <p className="font-extrabold text-accent text-lg mb-3">AlioStore</p>
          <p className="text-sm opacity-80">
            The online home of Alio & Palma Cooperative — bestselling programming titles written to
            teach, inspire and fund real change.
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            {['VISA', 'Mastercard', 'PayPal', 'Apple Pay'].map((p) => (
              <span
                key={p}
                className="border border-white/30 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
        {columns.map((c) => (
          <div key={c.title}>
            <h5 className="font-bold mb-3 text-sm uppercase tracking-wide">{c.title}</h5>
            <ul className="space-y-2 text-sm opacity-80">{c.links.map(resolve)}</ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/15">
        <div className="mx-auto max-w-6xl px-4 py-4 text-sm opacity-70">
          © 2026 AlioStore by Alio & Palma Cooperative. All rights reserved.
        </div>
      </div>
    </footer>
  );
}