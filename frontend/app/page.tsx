import Link from 'next/link';
import BookCard from '@/components/BookCard';
import { CATALOG } from '@/lib/catalog';

const FEAT = ['rust', 'python', 'javascript', 'java'];
const BEST = ['ruby', 'cpp', 'swift', 'kotlin'];
const SPECIAL = ['php', 'go', 'python', 'rust'].map((id, i) => ({
  ...CATALOG.find((b) => b.id === id)!,
  prevPrice: i < 3 ? 50 : 25,
}));

const benefits = [
  { icon: '🚚', title: 'Free & Fast Delivery', desc: 'Delivered across the UAE in 1–3 days. Free on orders over AED 60.' },
  { icon: '💰', title: 'Best Book Prices', desc: 'Fair pricing that supports our authors and the cooperative.' },
  { icon: '🔒', title: 'Secure Payments', desc: 'Credit card, PayPal & cash — protected at every step.' },
  { icon: '↩️', title: 'Easy Returns', desc: '7-day returns on every order, no questions asked.' },
  { icon: '🎧', title: '24/7 Support', desc: 'Real people, always ready to help with your orders.' },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-brand relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
          <div className="text-white relative z-10">
            <span className="inline-block bg-accent text-brand text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wide">
              ★ Reader-powered
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold leading-tight mb-6">
              A reader-powered path for <span className="text-accent">Programming Languages</span> that fund change
            </h1>
            <p className="text-white/80 mb-8 text-base md:text-lg">
              Browse best-selling titles. Every purchase supports the Alio &amp; Palma Cooperative and the communities it serves.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/books/" className="btn-flash btn-primary-flash">
                Browse Books
              </Link>
              <Link href="/register/" className="btn-flash btn-outline-flash">
                Create an Account
              </Link>
            </div>
          </div>
          <div className="relative flex justify-center md:justify-end">
            <ImageCard book={CATALOG[0]} />
          </div>
        </div>
      </section>

      {/* Featured */}
      <Section id="featured-books" title="Featured Books" tagline="Hand-picked for you">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CATALOG.filter((b) => FEAT.includes(b.id)).map((b) => (
            <BookCard key={b.id} {...b} />
          ))}
        </div>
      </Section>

      {/* Best Sellers */}
      <Section id="bestsellers" title="Bestsellers" tagline="Readers' favourites">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CATALOG.filter((b) => BEST.includes(b.id)).map((b) => (
            <BookCard key={b.id} {...b} />
          ))}
        </div>
      </Section>

      {/* Special Offers */}
      <Section id="special-offer" title="Special Offers" tagline="Limited-time deals" bg="bg-white">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {SPECIAL.filter(Boolean).map((b) => (
            <BookCard key={b.id} {...b} sale />
          ))}
        </div>
      </Section>

      {/* Benefits */}
      <Section id="store-benefits" title="The AlioStore Promise" tagline="Why shop with us" bg="bg-white">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {benefits.map((b) => (
            <div key={b.title} className="bg-[#f7f9fc] border border-line rounded-2xl p-4 text-center hover:-translate-y-1 hover:shadow-md transition">
              <div className="text-3xl mb-3">{b.icon}</div>
              <h4 className="font-bold text-sm mb-1">{b.title}</h4>
              <p className="text-xs text-muted leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

function Section({
  id,
  title,
  tagline,
  children,
  bg = 'bg-[#f7f9fc]',
}: {
  id: string;
  title: string;
  tagline: string;
  children: React.ReactNode;
  bg?: string;
}) {
  return (
    <section id={id} className={`${bg} py-12 md:py-16`}>
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center mb-10">
          <span className="text-xs font-bold text-accent-dark uppercase tracking-wide">{tagline}</span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-brand mt-1">{title}</h2>
        </div>
        {children}
      </div>
    </section>
  );
}

import Image from 'next/image';

function ImageCard({ book }: { book: (typeof CATALOG)[0] }) {
  return (
    <div className="relative w-64 md:w-80 aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl border border-white/20 group">
      <Image
        src={book.image}
        alt={book.title}
        fill
        className="object-contain p-4 bg-white group-hover:scale-105 transition duration-500"
      />
    </div>
  );
}