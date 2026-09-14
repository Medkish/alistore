const prisma = require('../lib/prisma');

const ALLOWED_SECTIONS = ['hero', 'categories', 'featured', 'newBooks', 'bestsellers', 'promotion', 'newsletter'];

const DEFAULT_WEBSITE = {
  homepage: {
    hero: {
      title: 'Online Bookstore',
      subtitle: 'Programming books that fund change. Every purchase supports the Alio & Palma Cooperative.',
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
    newsletter: { title: 'Join Our Newsletter', subtitle: 'New releases and exclusive offers, straight to your inbox.', show: true },
    order: ALLOWED_SECTIONS.slice(),
  },
  about: 'AliStore is a smart book store bringing you the best digital titles with instant delivery and a delightful reading experience.',
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

function valStr(v, fallback) {
  return typeof v === 'string' ? v : fallback;
}

function bool(v, fallback) {
  return typeof v === 'boolean' ? v : fallback;
}

function numInt(v, fallback) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function mergeSection(base, override) {
  if (!override || typeof override !== 'object') return base;
  const out = { ...base, ...override };
  for (const k of Object.keys(base)) {
    if (out[k] === undefined) out[k] = base[k];
  }
  return out;
}

function normalizeWebsite(raw) {
  const c = raw && typeof raw === 'object' ? raw : {};
  const h = c.homepage && typeof c.homepage === 'object' ? c.homepage : {};
  const def = DEFAULT_WEBSITE.homepage;

  const hero = mergeSection(def.hero, h.hero);
  const categories = mergeSection(def.categories, h.categories);
  const featured = mergeSection(def.featured, {
    ...(h.featured || {}),
    bookIds: Array.isArray(h.featured && h.featured.bookIds) ? h.featured.bookIds : [],
  });
  const newBooks = mergeSection(def.newBooks, {
    ...(h.newBooks || {}),
    bookIds: Array.isArray(h.newBooks && h.newBooks.bookIds) ? h.newBooks.bookIds : [],
  });
  const bestsellers = mergeSection(def.bestsellers, {
    ...(h.bestsellers || {}),
    bookIds: Array.isArray(h.bestsellers && h.bestsellers.bookIds) ? h.bestsellers.bookIds : [],
  });
  const promotion = mergeSection(def.promotion, h.promotion);
  const newsletter = mergeSection(def.newsletter, h.newsletter);

  const order = Array.isArray(h.order)
    ? h.order.filter((s) => ALLOWED_SECTIONS.includes(s)).concat(ALLOWED_SECTIONS.filter((s) => !h.order.includes(s)))
    : def.order.slice();

  const pages = c.pages && typeof c.pages === 'object' ? c.pages : {};
  const contact = c.contact && typeof c.contact === 'object' ? c.contact : {};
  const footer = c.footer && typeof c.footer === 'object' ? c.footer : {};
  const social = footer.social && typeof footer.social === 'object' ? footer.social : {};

  return {
    homepage: {
      hero,
      categories,
      featured,
      newBooks,
      bestsellers,
      promotion,
      newsletter,
      order,
    },
    about: valStr(c.about, DEFAULT_WEBSITE.about),
    contact: {
      email: valStr(contact.email, DEFAULT_WEBSITE.contact.email),
      phone: valStr(contact.phone, DEFAULT_WEBSITE.contact.phone),
      address: valStr(contact.address, DEFAULT_WEBSITE.contact.address),
    },
    pages: {
      privacy: valStr(pages.privacy, DEFAULT_WEBSITE.pages.privacy),
      terms: valStr(pages.terms, DEFAULT_WEBSITE.pages.terms),
      shippingPolicy: valStr(pages.shippingPolicy, DEFAULT_WEBSITE.pages.shippingPolicy),
      refundPolicy: valStr(pages.refundPolicy, DEFAULT_WEBSITE.pages.refundPolicy),
      faq: Array.isArray(pages.faq) ? pages.faq : DEFAULT_WEBSITE.pages.faq,
    },
    footer: {
      tagline: valStr(footer.tagline, DEFAULT_WEBSITE.footer.tagline),
      contactEmail: valStr(footer.contactEmail, DEFAULT_WEBSITE.footer.contactEmail),
      social: {
        twitter: valStr(social.twitter, DEFAULT_WEBSITE.footer.social.twitter),
        instagram: valStr(social.instagram, DEFAULT_WEBSITE.footer.social.instagram),
        facebook: valStr(social.facebook, DEFAULT_WEBSITE.footer.social.facebook),
      },
    },
  };
}

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

async function loadWebsite() {
  try {
    const rec = await prisma.storeSetting.findUnique({ where: { id: 'website' } });
    if (rec && rec.data) return normalizeWebsite(rec.data);
  } catch (err) {
    console.warn('website.service load failed:', err.message);
  }
  return clone(DEFAULT_WEBSITE);
}

async function saveWebsite(content) {
  const data = normalizeWebsite(content);
  await prisma.storeSetting.upsert({
    where: { id: 'website' },
    update: { data },
    create: { id: 'website', data },
  });
  return clone(data);
}

module.exports = { loadWebsite, saveWebsite, DEFAULT_WEBSITE };