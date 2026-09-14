import type { WebsiteContent, HomepageSectionKey } from '@/lib/types';

export const DEFAULT_SITE: WebsiteContent = {
  homepage: {
    hero: {
      title: 'Online Bookstore',
      subtitle:
        'Programming books that fund change. Every purchase supports the Alio & Palma Cooperative.',
      image: '',
      buttonText: 'Browse Books',
      buttonLink: '/books/',
      show: true,
    },
    categories: { title: 'Browse by Category', show: true },
    featured: { title: 'Popular Books', mode: 'auto', bookIds: [], count: 6, show: true },
    newBooks: { title: 'New Books', mode: 'auto', bookIds: [], count: 8, show: true },
    bestsellers: { title: 'Best Sellers', mode: 'auto', bookIds: [], count: 8, show: true },
    promotion: {
      title: 'Special Offer',
      description: 'Limited-time deal on hand-picked titles.',
      image: '',
      buttonText: 'Shop Now',
      buttonLink: '/books/',
      startDate: '',
      endDate: '',
      show: false,
    },
    newsletter: {
      title: 'Join Our Newsletter',
      subtitle: 'New releases and exclusive offers, straight to your inbox.',
      show: true,
    },
    order: ['hero', 'categories', 'featured', 'newBooks', 'bestsellers', 'promotion', 'newsletter'],
  },
  about:
    'AliStore is a smart book store bringing you the best digital titles with instant delivery and a delightful reading experience.',
  contact: { email: 'support@aliostore.com', phone: '+971 4 000 0000', address: 'Downtown Dubai, UAE' },
  pages: {
    privacy: 'Your privacy matters. We only collect what is needed to deliver your books.',
    terms: 'By using AliStore you agree to these terms and conditions.',
    shippingPolicy: 'Digital books are delivered instantly to your library.',
    refundPolicy: 'Refunds are available within 14 days of purchase for undelivered content.',
    faq: [['How do I get my book?', 'Instantly delivered to your library after purchase.']],
  },
  footer: {
    tagline: 'Smart book store — read smart.',
    social: { twitter: 'https://twitter.com', instagram: 'https://instagram.com', facebook: 'https://facebook.com' },
    contactEmail: 'support@aliostore.com',
  },
};

const SECTION_DEFAULTS: Record<string, () => Record<string, unknown>> = {
  hero: () => ({ ...(DEFAULT_SITE.homepage!.hero || {}) }),
  categories: () => ({ ...(DEFAULT_SITE.homepage!.categories || {}) }),
  featured: () => ({ ...(DEFAULT_SITE.homepage!.featured || {}) }),
  newBooks: () => ({ ...(DEFAULT_SITE.homepage!.newBooks || {}) }),
  bestsellers: () => ({ ...(DEFAULT_SITE.homepage!.bestsellers || {}) }),
  promotion: () => ({ ...(DEFAULT_SITE.homepage!.promotion || {}) }),
  newsletter: () => ({ ...(DEFAULT_SITE.homepage!.newsletter || {}) }),
};

export function normalizeSite(raw: WebsiteContent | null | undefined): WebsiteContent {
  const c = raw && typeof raw === 'object' ? raw : {};
  const h = c.homepage && typeof c.homepage === 'object' ? c.homepage : {};
  const defH = DEFAULT_SITE.homepage!;

  const pick = <T>(key: string, fallback: T): T => {
    const src = (h as Record<string, unknown>)[key];
    const def = (defH as Record<string, unknown>)[key] as T;
    if (src === undefined) return fallback ?? def;
    if (typeof src === 'object' && src !== null) {
      const d = SECTION_DEFAULTS[key] ? (SECTION_DEFAULTS as Record<string, () => unknown>)[key]() : {};
      const out: Record<string, unknown> = { ...(d as Record<string, unknown>) };
      for (const [k, v] of Object.entries(src as Record<string, unknown>)) {
        if (v !== undefined) out[k] = v;
      }
      return out as unknown as T;
    }
    return (src as unknown) as T;
  };

  const orderKey: HomepageSectionKey[] = Array.isArray(h.order)
    ? (h.order as HomepageSectionKey[])
    : ['hero', 'categories', 'featured', 'newBooks', 'bestsellers', 'promotion', 'newsletter'];

  const homepage: WebsiteContent['homepage'] = {
    hero: pick('hero', undefined),
    categories: pick('categories', undefined),
    featured: pick('featured', undefined),
    newBooks: pick('newBooks', undefined),
    bestsellers: pick('bestsellers', undefined),
    promotion: pick('promotion', undefined),
    newsletter: pick('newsletter', undefined),
    order: orderKey,
  };

  return {
    homepage,
    about: typeof c.about === 'string' ? c.about : DEFAULT_SITE.about,
    contact: { ...(DEFAULT_SITE.contact || {}), ...(c.contact || {}) },
    pages: { ...(DEFAULT_SITE.pages || {}), ...(c.pages || {}) },
    footer: { ...(DEFAULT_SITE.footer || {}), ...(c.footer || {}) },
  };
}