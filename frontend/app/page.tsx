'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import BookCard from '@/components/BookCard';
import { api } from '@/lib/api';
import { CATEGORIES, CATALOG } from '@/lib/catalog';
import { formatAED } from '@/lib/format';
import { DEFAULT_SITE, normalizeSite } from '@/lib/site-content';
import type { Book, Campaign, DonationSupporter, HomepageSection, HomepageSectionKey, WebsiteContent } from '@/lib/types';

const SECTION_META: Record<HomepageSectionKey, { label: string; tagline: string }> = {
  hero: { label: 'Hero', tagline: 'Welcome banner' },
  categories: { label: 'Categories', tagline: 'Shop by topic' },
  featured: { label: 'Popular Books', tagline: "Readers' favourites" },
  newBooks: { label: 'New Books', tagline: 'Fresh from the press' },
  bestsellers: { label: 'Best Sellers', tagline: 'Hand-picked for you' },
  promotion: { label: 'Promotion', tagline: 'Limited-time deal' },
  newsletter: { label: 'Newsletter', tagline: 'Stay in the loop' },
};

const BENEFITS: { title: string; desc: string; icon: ReactNode }[] = [
  {
    title: 'Free & fast delivery',
    desc: 'Across the UAE in 1–3 days. Free on orders over AED 60.',
    icon: (
      <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" />
    ),
  },
  {
    title: 'Fair book prices',
    desc: 'Pricings that pay our authors and the cooperative.',
    icon: <path d="M12 3v18M8 7h6a3 3 0 0 1 0 6H8h7" />,
  },
  {
    title: 'Secure payments',
    desc: 'Card, PayPal and cash — protected at every step.',
    icon: <path d="M12 3 4 6v6c0 4.4 3.4 8.4 8 9 4.6-.6 8-4.6 8-9V6z" />,
  },
  {
    title: '7-day returns',
    desc: 'Changed your mind? Send it back, no questions.',
    icon: <path d="M4 10h11a5 5 0 0 1 0 10H9M4 10l4-4M4 10l4 4" />,
  },
  {
    title: 'Real support',
    desc: 'A small team that actually answers your email.',
    icon: <path d="M4 6h16v12H4zM4 7l8 6 8-6" />,
  },
];

function BenefitIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function bookNormalize(b: Book): Book {
  return { ...b, image: b.image.startsWith('/') ? b.image : `/${b.image}` };
}

function resolveBooks(
  sec: HomepageSection | undefined,
  all: Book[],
  kind: 'featured' | 'newBooks' | 'bestsellers'
): Book[] {
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
    if (!h) return [] as HomepageSectionKey[];
    const order = Array.isArray(h.order)
      ? h.order
      : (['hero', 'categories', 'featured', 'newBooks', 'bestsellers', 'promotion', 'newsletter'] as HomepageSectionKey[]);
    return order;
  }, [content]);

  if (!content) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-32 text-center text-muted">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand" />
        <p className="text-sm">Loading the store…</p>
      </div>
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
        return hero.show !== false ? <Hero hero={hero} books={books} /> : null;
      case 'categories':
        return h.categories?.show !== false ? (
          <CategoriesSection title={h.categories?.title || SECTION_META.categories.label} />
        ) : null;
      case 'featured':
        return h.featured?.show !== false ? (
          <BookSection
            id="featured-books"
            title={h.featured?.title || SECTION_META.featured.label}
            tagline={SECTION_META.featured.tagline}
            books={feat}
          />
        ) : null;
      case 'newBooks':
        return h.newBooks?.show !== false ? (
          <BookSection
            id="new-books"
            title={h.newBooks?.title || SECTION_META.newBooks.label}
            tagline={SECTION_META.newBooks.tagline}
            books={fresh}
          />
        ) : null;
      case 'bestsellers':
        return h.bestsellers?.show !== false ? (
          <BookSection
            id="bestsellers"
            title={h.bestsellers?.title || SECTION_META.bestsellers.label}
            tagline={SECTION_META.bestsellers.tagline}
            books={best}
          />
        ) : null;
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

      <Section id="store-benefits" title="The AlioStore promise" tagline="Why shop with us" tone="plain">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
          {BENEFITS.map((b) => (
            <div key={b.title} className="card card-hover p-4 text-center">
              <span className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent-dark">
                <BenefitIcon>{b.icon}</BenefitIcon>
              </span>
              <h3 className="mb-1 text-sm font-bold text-ink">{b.title}</h3>
              <p className="text-xs leading-relaxed text-muted">{b.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {apiLive !== null && (
        <p className="pb-8 text-center text-[11px] text-muted">
          {apiLive ? 'Live catalog & content' : 'Showing saved content (offline fallback)'}
        </p>
      )}
    </>
  );
}

function Hero({
  hero,
  books,
}: {
  hero: NonNullable<WebsiteContent['homepage']>['hero'];
  books: Book[];
}) {
  const slides = books.slice(0, 6);
  const slideCount = slides.length;
  const [shown, setShown] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (slideCount < 2) return;
    const t = setInterval(() => setLeaving(true), 5000);
    return () => clearInterval(t);
  }, [slideCount]);

  useEffect(() => {
    if (!leaving || slideCount < 2) return;
    const to = setTimeout(() => {
      setShown((i) => (i + 1) % slideCount);
      setLeaving(false);
    }, 450);
    return () => clearTimeout(to);
  }, [leaving, slideCount]);

  return (
    <section className="bg-brand-gradient relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
        aria-hidden="true"
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-2 md:py-24">
        <div className="text-center md:text-left">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-accent ring-1 ring-inset ring-accent/30">
            Reader-powered
          </span>
          <h1 className="mb-4 mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
            {hero?.title}
          </h1>
          <p className="mb-2 text-sm font-semibold text-accent">Written by Kamara &amp; Tessie</p>
          <p className="mb-8 max-w-lg text-base leading-relaxed text-white/75 md:text-lg">{hero?.subtitle}</p>

          {hero?.buttonText ? (
            <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row md:justify-start">
              <Link
                href={hero.buttonLink || '/books/'}
                className="btn-flash btn-primary-flash w-full px-7 py-3.5 text-sm sm:w-auto"
              >
                {hero.buttonText}
              </Link>
              <Link href="/donate/" className="btn-flash btn-ghost-flash w-full px-7 py-3.5 text-sm sm:w-auto">
                Support us
              </Link>
            </div>
          ) : null}

          <dl className="mx-auto mt-10 grid max-w-sm grid-cols-3 gap-4 border-t border-white/10 pt-6 text-center md:mx-0">
            {[
              { v: `${books.length}+`, l: 'Titles' },
              { v: '4.8', l: 'Avg rating' },
              { v: '1–3d', l: 'Delivery' },
            ].map((s) => (
              <div key={s.l}>
                <dt className="sr-only">{s.l}</dt>
                <dd>
                  <span className="block text-2xl font-extrabold text-white">{s.v}</span>
                  <span className="mt-0.5 block text-[11px] uppercase tracking-wider text-white/55">{s.l}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative h-[280px] w-full sm:h-[380px]">
          {slideCount === 0 ? (
            <div className="absolute inset-0 grid place-items-center text-sm text-white/40">Books coming soon</div>
          ) : (
            <>
              <div
                className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ease-in-out ${
                  leaving ? 'opacity-0' : 'opacity-100'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slides[shown].image.startsWith('/') ? slides[shown].image : `/${slides[shown].image}`}
                  alt={slides[shown].title}
                  className="max-h-[250px] w-auto max-w-full rounded-2xl object-contain shadow-pop sm:max-h-[310px]"
                />
              </div>

              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-white/10 p-1.5 backdrop-blur">
                {slides.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setLeaving(false);
                      setShown(i);
                    }}
                    aria-label={`Show ${s.title}`}
                    aria-current={i === shown}
                    className={`h-1.5 rounded-full transition-all ${
                      i === shown ? 'w-6 bg-accent' : 'w-1.5 bg-white/40 hover:bg-white/70'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function CategoriesSection({ title }: { title: string }) {
  return (
    <section id="categories" className="bg-surface py-14 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading eyebrow="Shop by topic" title={title} />
        <div className="flex flex-wrap justify-center gap-2.5">
          {CATEGORIES.filter((c) => c.slug !== 'all').map((c) => (
            <Link key={c.slug} href={`/books/?category=${c.slug}`} className="chip">
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
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
          {books.map((b) => (
            <BookCard key={b.id} {...b} />
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-muted">No books in this section yet.</p>
      )}
      <div className="mt-10 text-center">
        <Link href="/books/" className="btn-flash btn-outline-flash text-brand border-brand px-8">
          Browse the full catalog
        </Link>
      </div>
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
    <section id="promotion" className="bg-white py-14 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="bg-brand-gradient relative overflow-hidden rounded-3xl p-8 text-white shadow-pop md:p-12">
          <div className="relative flex flex-col items-center gap-7 text-center md:flex-row md:text-left">
            {image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image.startsWith('/') ? image : `/${image}`}
                alt=""
                className="w-full max-w-[200px] rounded-2xl object-cover shadow-lift"
              />
            )}
            <div className="flex-1">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">Limited-time offer</span>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight md:text-4xl">{p.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/75 md:max-w-xl md:text-base">{p.description}</p>
              {p.buttonText ? (
                <Link href={p.buttonLink || '/books/'} className="btn-flash btn-primary-flash mt-6 px-7">
                  {p.buttonText} <span aria-hidden="true">&rarr;</span>
                </Link>
              ) : null}
            </div>
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
    <section id="newsletter" className="bg-surface py-14 md:py-20">
      <div className="mx-auto max-w-2xl px-4 text-center">
        <SectionHeading eyebrow="Stay in the loop" title={title || 'Newsletter'} />
        {subtitle && <p className="-mt-4 mb-7 text-sm text-muted">{subtitle}</p>}
        {done ? (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 text-sm font-semibold text-emerald-800">
            Thanks — you&rsquo;re on the list.
          </p>
        ) : (
          <form
            className="mx-auto flex max-w-md flex-col gap-2.5 sm:flex-row"
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
              aria-label="Email address"
              className="field flex-1"
            />
            <button type="submit" className="btn-flash btn-brand shrink-0">
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
    <section id="support-alistore" className="bg-white py-14 md:py-20">
      <div className="mx-auto max-w-3xl px-4 text-center">
        <SectionHeading eyebrow="Give back" title="Support AlioStore" />
        <p className="mt-4 text-sm leading-relaxed text-muted md:text-base">
          {message || 'Help us create more programming learning resources.'}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/subscribe/" className="btn-flash btn-brand w-full px-6 sm:w-auto">
            Start a subscription
          </Link>
          <Link href="/books/" className="btn-flash btn-outline-flash w-full border-brand px-6 text-brand sm:w-auto">
            Buy the book first
          </Link>
          <Link href="/donate/" className="btn-flash btn-outline-flash w-full px-6 text-brand sm:w-auto">
            Donate instead
          </Link>
        </div>
      </div>

      {campaigns.length > 0 && (
        <div className="mx-auto mt-12 grid max-w-3xl gap-4 px-4 md:grid-cols-2">
          {campaigns.slice(0, 2).map((c) => (
            <div key={c.id} className="card p-6">
              <h3 className="font-extrabold text-ink">{c.title}</h3>
              <p className="mt-1.5 line-clamp-2 text-xs text-muted">{c.description}</p>
              <div className="mb-2 mt-4 flex items-end justify-between">
                <p className="text-lg font-extrabold text-brand">{formatAED(c.raised)} raised</p>
                <p className="text-xs font-semibold text-muted">of {formatAED(c.goal)}</p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                <div
                  className={`h-full transition-all ${c.fundedPercent >= 100 ? 'bg-emerald-600' : 'bg-accent'}`}
                  style={{ width: `${Math.min(100, c.fundedPercent)}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] font-bold text-accent-dark">{c.fundedPercent}% funded</p>
              <Link href="/donate/" className="btn-flash btn-primary-flash mt-4 w-full min-h-11 py-2.5">
                Donate now
              </Link>
            </div>
          ))}
        </div>
      )}

      {supporters.recent.length > 0 && (
        <div className="mx-auto mt-12 max-w-3xl px-4 text-center">
          <h3 className="mb-4 text-sm font-extrabold uppercase tracking-wider text-ink">Recent supporters</h3>
          <div className="flex flex-wrap justify-center gap-2.5">
            {supporters.recent.slice(0, 6).map((s, i) => (
              <span key={i} className="chip cursor-default">
                {s.name} <span className="text-muted">&middot; {formatAED(s.amount || 0)}</span>
              </span>
            ))}
          </div>
          <Link href="/donate/supporters/" className="mt-5 inline-block text-sm font-bold text-accent-dark hover:underline">
            Meet all our supporters &rarr;
          </Link>
        </div>
      )}
    </section>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-9 text-center">
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-brand md:text-4xl">{title}</h2>
      <span className="mx-auto mt-4 block h-1 w-12 rounded-full bg-accent" aria-hidden="true" />
    </div>
  );
}

function Section({
  id,
  title,
  tagline,
  children,
  tone = 'tinted',
}: {
  id: string;
  title: string;
  tagline: string;
  children: ReactNode;
  tone?: 'tinted' | 'plain';
}) {
  return (
    <section id={id} className={`py-14 md:py-20 ${tone === 'plain' ? 'bg-white' : 'bg-surface'}`}>
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading eyebrow={tagline} title={title} />
        {children}
      </div>
    </section>
  );
}
