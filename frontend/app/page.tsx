'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import BookCard from '@/components/BookCard';
import { api } from '@/lib/api';
import { CATALOG, CATEGORIES } from '@/lib/catalog';
import { formatAED } from '@/lib/format';
import { DEFAULT_SITE, normalizeSite } from '@/lib/site-content';
import type { Book, Campaign, DonationSupporter, HomepageSectionKey, HomepageSection, WebsiteContent } from '@/lib/types';

const SECTION_META: Record<HomepageSectionKey, { label: string; tagline: string }> = {
  hero: { label: 'Hero', tagline: 'Welcome banner' },
  categories: { label: 'Categories', tagline: 'Shop by topic' },
  featured: { label: 'Popular Books', tagline: "Readers' favourites" },
  newBooks: { label: 'New Books', tagline: 'Fresh from the press' },
  bestsellers: { label: 'Best Sellers', tagline: 'Hand-picked for you' },
  promotion: { label: 'Promotion', tagline: 'Limited-time deal' },
  newsletter: { label: 'Newsletter', tagline: 'Stay in the loop' },
};

const benefits = [
  { icon: '🚚', title: 'Free & Fast Delivery', desc: 'Delivered across the UAE in 1–3 days. Free on orders over AED 60.' },
  { icon: '💰', title: 'Best Book Prices', desc: 'Fair pricing that supports our authors and the cooperative.' },
  { icon: '🔒', title: 'Secure Payments', desc: 'Credit card, PayPal & cash — protected at every step.' },
  { icon: '↩️', title: 'Easy Returns', desc: '7-day returns on every order, no questions asked.' },
  { icon: '🎧', title: '24/7 Support', desc: 'Real people, always ready to help with your orders.' },
];

function bookNormalize(b: Book): Book {
  return { ...b, image: b.image.startsWith('/') ? b.image : `/${b.image}` };
}

function resolveBooks(sec: HomepageSection | undefined, all: Book[], kind: 'featured' | 'newBooks' | 'bestsellers'): Book[] {
  if (!sec) return [];
  let out: Book[] = [];
  if (sec.mode === 'manual' && sec.bookIds?.length) {
    const ids = new Set(sec.bookIds);
    out = all.filter((b) => ids.has(b.id) || (b.slug ? ids.has(b.slug) : false));
  } else if (kind === 'featured') {
    out = all.filter((b) => b.featured);
  } else if (kind === 'bestsellers') {
    out = all.filter((b) => b.bestseller);
  } else {
    out = all.slice();
  }
  return out.slice(0, sec.count || 6);
}

export default function HomePage() {
  const [content, setContent] = useState<WebsiteContent | null>(null);
  const [books, setBooks] = useState<Book[]>(CATALOG);
  const [apiLive, setApiLive] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([api.getWebsite(), api.getBooks({ pageSize: 100, sort: 'newest' })])
      .then(([site, res]) => {
        if (!alive) return;
        setContent(normalizeSite(site.content));
        setBooks(res.books.map(bookNormalize));
        setApiLive(true);
      })
      .catch(() => {
        if (!alive) return;
        setContent(DEFAULT_SITE);
        setBooks(CATALOG);
        setApiLive(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const sections = useMemo(() => {
    const h = content?.homepage;
    if (!h) return [];
    const order = Array.isArray(h.order) ? h.order : ['hero', 'categories', 'featured', 'newBooks', 'bestsellers', 'promotion', 'newsletter'];
    return order as HomepageSectionKey[];
  }, [content]);

  if (!content) {
    return (
      <section className="py-24 text-center text-muted">
        <p>Loading homepage…</p>
      </section>
    );
  }

  const h = content.homepage!;
  const hero = h.hero || DEFAULT_SITE.homepage!.hero!;
  const feat = resolveBooks(h.featured, books, 'featured');
  const fresh = resolveBooks(h.newBooks, books, 'newBooks');
  const best = resolveBooks(h.bestsellers, books, 'bestsellers');

  function renderSection(key: HomepageSectionKey) {
    switch (key) {
      case 'hero':
        return hero.show !== false ? <Hero hero={hero} /> : null;
      case 'categories':
        return h.categories?.show !== false ? <CategoriesSection title={h.categories?.title || SECTION_META.categories.label} /> : null;
      case 'featured':
        return h.featured?.show !== false ? <BookSection id="featured-books" title={h.featured?.title || SECTION_META.featured.label} tagline={SECTION_META.featured.tagline} books={feat} /> : null;
      case 'newBooks':
        return h.newBooks?.show !== false ? <BookSection id="new-books" title={h.newBooks?.title || SECTION_META.newBooks.label} tagline={SECTION_META.newBooks.tagline} books={fresh} /> : null;
      case 'bestsellers':
        return h.bestsellers?.show !== false ? <BookSection id="bestsellers" title={h.bestsellers?.title || SECTION_META.bestsellers.label} tagline={SECTION_META.bestsellers.tagline} books={best} /> : null;
      case 'promotion': {
        const p = h.promotion || DEFAULT_SITE.homepage!.promotion!;
        return p.show !== false ? <PromotionBanner promotion={p} /> : null;
      }
      case 'newsletter': {
        const n = h.newsletter || DEFAULT_SITE.homepage!.newsletter!;
        return n.show !== false ? <Newsletter title={n.title} subtitle={n.subtitle} /> : null;
      }
      default:
        return null;
    }
  }

  return (
    <>
      {sections.map((k) => (
        <div key={k}>{renderSection(k)}</div>
      ))}

      <SupportSection />

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

      {apiLive !== null && (
        <p className="text-center text-[11px] text-muted pb-6">
          {apiLive ? 'Content managed from the admin dashboard' : 'Showing saved content (offline fallback)'}
        </p>
      )}
    </>
  );
}

function Hero({ hero }: { hero: NonNullable<WebsiteContent['homepage']>['hero'] }) {
  const image = hero?.image || '';
  return (
    <section className="bg-brand relative overflow-hidden text-center">
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image.startsWith('/') ? image : `/${image}`}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        />
      )}
      <div className="relative mx-auto max-w-4xl px-4 py-16 md:py-24">
        <span className="inline-block bg-accent text-brand text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wide">
          ★ Reader-powered
        </span>
        <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-4 uppercase">{hero?.title}</h1>
        <p className="text-white/80 mb-8 text-base md:text-lg">{hero?.subtitle}</p>
        {hero?.buttonText ? (
          <div className="flex flex-wrap justify-center gap-4">
            <Link href={hero.buttonLink || '/books/'} className="btn-flash btn-primary-flash flex-1 min-w-[220px] py-4">
              {hero.buttonText}
            </Link>
            <Link href="/donate/" className="btn-flash btn-primary-flash flex-1 min-w-[220px] py-4">
              DONATE
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function CategoriesSection({ title }: { title: string }) {
  return (
    <section id="categories" className="bg-[#f7f9fc] py-12 md:py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center mb-8">
          <span className="text-xs font-bold text-accent-dark uppercase tracking-wide">Shop by topic</span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-brand mt-1">{title}</h2>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {CATEGORIES.filter((c) => c.slug !== 'all').map((c) => (
            <Link
              key={c.slug}
              href={`/books/?category=${c.slug}`}
              className="bg-white border-2 border-brand rounded-2xl px-6 py-4 font-bold text-sm text-brand hover:bg-brand hover:text-white transition shadow-sm"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function BookSection({ id, title, tagline, books }: { id: string; title: string; tagline: string; books: Book[] }) {
  return (
    <Section id={id} title={title} tagline={tagline}>
      {books.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {books.map((b) => (
            <BookCard key={b.id} {...b} />
          ))}
        </div>
      ) : (
        <p className="text-center text-muted">No books for this section yet.</p>
      )}
    </Section>
  );
}

function PromotionBanner({ promotion }: { promotion: NonNullable<WebsiteContent['homepage']>['promotion'] }) {
  const today = Date.now();
  const start = promotion?.startDate ? new Date(promotion.startDate).getTime() : null;
  const end = promotion?.endDate ? new Date(promotion.endDate).getTime() : null;
  if ((start !== null && today < start) || (end !== null && today > end)) return null;
  const p = promotion || {};
  const image = p.image || '';
  return (
    <section id="promotion" className="py-12 md:py-16 bg-white">
      <div className="mx-auto max-w-6xl px-4">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand to-accent text-white p-8 md:p-12 flex flex-col md:flex-row items-center gap-6 text-center md:text-left shadow-lg">
          {image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image.startsWith('/') ? image : `/${image}`} alt="" className="w-full max-w-[220px] rounded-2xl shadow-lg object-cover" />
          )}
          <div className="flex-1">
            <span className="text-xs font-bold uppercase tracking-widest text-white/70">Limited-time offer</span>
            <h2 className="text-2xl md:text-3xl font-extrabold mt-1">{p.title}</h2>
            <p className="text-white/85 mt-2 md:max-w-xl">{p.description}</p>
            {p.buttonText ? (
              <Link href={p.buttonLink || '/books/'} className="btn-flash btn-primary-flash mt-5 inline-flex items-center gap-2">
                {p.buttonText} →
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function Newsletter({ title, subtitle }: { title?: string; subtitle?: string }) {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  return (
    <section id="newsletter" className="py-12 md:py-16 bg-[#f7f9fc]">
      <div className="mx-auto max-w-2xl px-4 text-center">
        <span className="text-xs font-bold text-accent-dark uppercase tracking-wide">Stay in the loop</span>
        <h2 className="text-2xl md:text-3xl font-extrabold text-brand mt-1">{title}</h2>
        <p className="text-sm text-muted mt-2 mb-6">{subtitle}</p>
        {done ? (
          <p className="font-bold text-green-700 bg-green-50 border border-green-200 rounded-2xl py-3 px-5">Thanks — you're subscribed!</p>
        ) : (
          <form
            className="flex flex-col sm:flex-row gap-2 justify-center"
            onSubmit={(e) => {
              e.preventDefault();
              if (email.trim()) setDone(true);
            }}
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="flex-1 border-2 border-brand rounded-xl px-4 py-2.5 text-sm focus:border-accent focus:outline-none"
            />
            <button type="submit" className="bg-brand text-white rounded-xl px-6 py-2.5 text-sm font-bold hover:bg-accent hover:text-brand transition">
              Subscribe
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

function SupportSection({ message }: { message?: string }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [supporters, setSupporters] = useState<{ recent: DonationSupporter[] }>({ recent: [] });

  useEffect(() => {
    api.campaigns().then((r) => setCampaigns(r.campaigns)).catch(() => undefined);
    api.donationSupporters().then(setSupporters).catch(() => undefined);
  }, []);

  return (
    <section id="support-alistore" className="py-12 md:py-16 bg-[#f7f9fc]">
      <div className="mx-auto max-w-3xl px-4">
        <div className="text-center">
          <span className="text-xs font-bold text-accent-dark uppercase tracking-wide">Give back</span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-brand mt-1 uppercase">❤️ Support AlioStore</h2>
          <p className="text-sm md:text-base text-muted mt-3 leading-relaxed">
            {message || 'Help us create more programming learning resources.'}
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-7">
            <Link href="/subscribe/" className="btn-flash btn-primary-flash min-w-[220px] py-4">
              START YOUR LANGUAGE SUBSCRIPTION
            </Link>
            <Link href="/books/" className="btn-flash btn-primary-flash min-w-[220px] py-4">
              BUY THE BOOK FIRST
            </Link>
            <Link href="/donate/" className="btn-flash btn-outline-flash text-brand border-brand min-w-[220px] py-4">
              DONATE INSTEAD
            </Link>
          </div>
        </div>

        {campaigns.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4 mt-10">
            {campaigns.slice(0, 2).map((c) => (
              <div key={c.id} className="bg-white border border-line rounded-3xl p-6 shadow-sm">
                <h3 className="font-extrabold text-ink">{c.title}</h3>
                <p className="text-xs text-muted mt-1.5 line-clamp-2">{c.description}</p>
                <div className="flex items-end justify-between mt-4 mb-2">
                  <p className="text-lg font-extrabold text-brand">{formatAED(c.raised)} raised</p>
                  <p className="text-xs font-bold text-muted">of {formatAED(c.goal)}</p>
                </div>
                <div className="h-2.5 bg-line rounded-full overflow-hidden">
                  <div
                    className={`h-full ${c.fundedPercent >= 100 ? 'bg-green-600' : 'bg-accent'} transition-all`}
                    style={{ width: `${Math.min(100, c.fundedPercent)}%` }}
                  />
                </div>
                <p className="text-[11px] font-extrabold text-accent-dark mt-2">{c.fundedPercent}% funded</p>
                <Link href="/donate/" className="btn-flash btn-primary-flash inline-block mt-4 text-center w-full py-3">
                  DONATE NOW
                </Link>
              </div>
            ))}
          </div>
        )}

        {supporters.recent.length > 0 && (
          <div className="mt-10 text-center">
            <h3 className="font-extrabold text-ink uppercase text-sm mb-4">Recent Supporters</h3>
            <div className="flex flex-wrap justify-center gap-3">
              {supporters.recent.slice(0, 6).map((s, i) => (
                <span key={i} className="bg-white border border-line rounded-full px-4 py-2 text-sm font-bold text-ink">
                  ❤️ {s.name} — <span className="text-brand">{formatAED(s.amount || 0)}</span>
                </span>
              ))}
            </div>
            <Link href="/donate/supporters" className="inline-block mt-5 text-sm font-bold text-accent-dark hover:underline">
              Meet all our supporters →
            </Link>
          </div>
        )}
      </div>
    </section>
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