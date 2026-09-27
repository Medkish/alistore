const prisma = require('../lib/prisma');
const { normalizeImage } = require('../utils/image');
const { detectDevice, detectBrowser } = require('../utils/device');

const EVENT_TYPES = new Set(['page_view', 'product_view', 'add_to_cart']);

/* Never trust raw client data — clamp lengths and drop junk. */
function clean(input, meta) {
  const ip = String(meta.ip || '');
  return {
    event: EVENT_TYPES.has(input.event) ? input.event : 'page_view',
    visitorId: String(input.visitorId || '').slice(0, 64) || 'anon',
    path: String(input.path || '').slice(0, 200),
    referrer: String(input.referrer || '').slice(0, 300),
    bookId: String(input.bookId || '').slice(0, 64),
    // mask the last octet for privacy
    ip: ip.replace(/\.\d+$/, '.0').slice(0, 45),
    device: detectDevice(meta.userAgent),
    browser: detectBrowser(meta.userAgent)
  };
}

async function recordEvent(input = {}, meta = {}) {
  const { event, visitorId, path, referrer, bookId, ip, device, browser } = clean(input, meta);
  let resolvedBookId = bookId || null;
  if (bookId) {
    const book = await prisma.book
      .findUnique({ where: { id: bookId } })
      .catch(() => null) || await prisma.book
      .findUnique({ where: { slug: bookId } })
      .catch(() => null);
    resolvedBookId = book ? book.id : null;
  }
  let userId = meta.userId || null;
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } }).catch(() => null);
    if (!user) userId = null;
  }
  await prisma.visitEvent.create({
    data: {
      event,
      visitorId,
      path,
      referrer,
      device,
      browser,
      ip,
      bookId: resolvedBookId,
      userId
    }
  });
  return { ok: true };
}

async function summary({ days } = {}) {
  const n = Math.min(90, Math.max(1, Number(days) || 14));
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (n - 1));

  const events = await prisma.visitEvent.findMany({
    where: { createdAt: { gte: since } },
    select: {
      id: true,
      event: true,
      visitorId: true,
      path: true,
      bookId: true,
      device: true,
      browser: true,
      referrer: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' },
    take: 5000
  });

  const pageEvents = events.filter((e) => e.event === 'page_view');
  const productEvents = events.filter((e) => e.event === 'product_view');
  const cartEvents = events.filter((e) => e.event === 'add_to_cart');

  const uniqueVisitors = new Set(events.map((e) => e.visitorId));
  const distinctProductIds = new Set(productEvents.map((e) => e.bookId).filter(Boolean));
  const distinctCartIds = new Set(cartEvents.map((e) => e.bookId).filter(Boolean));

  /* Time on site: split each visitor's activity into sessions (30-min gaps) and
     average the session lengths. No schema change needed — events carry timestamps. */
  const SESSION_GAP_MS = 30 * 60 * 1000;
  const byVisitor = new Map();
  for (const e of events) {
    const list = byVisitor.get(e.visitorId) || [];
    list.push(e.createdAt.getTime());
    byVisitor.set(e.visitorId, list);
  }
  let sessionCount = 0;
  let sessionMs = 0;
  for (const times of byVisitor.values()) {
    times.sort((a, b) => a - b);
    let start = times[0];
    let prev = times[0];
    for (let i = 1; i < times.length; i++) {
      if (times[i] - prev > SESSION_GAP_MS) {
        sessionCount++;
        sessionMs += prev - start;
        start = times[i];
      }
      prev = times[i];
    }
    sessionCount++;
    sessionMs += prev - start;
  }
  const avgSessionMinutes = sessionCount ? Math.round((sessionMs / 60000 / sessionCount) * 10) / 10 : 0;

  const visitorCounts = new Map();
  for (const e of events) visitorCounts.set(e.visitorId, (visitorCounts.get(e.visitorId) || 0) + 1);
  const returningVisitors = [...visitorCounts.values()].filter((c) => c >= 2).length;

  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const todayEvents = events.filter((e) => e.createdAt >= midnight);
  const visitsToday = todayEvents.length;
  const uniqueToday = new Set(todayEvents.map((e) => e.visitorId)).size;

  const perDay = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    const dayEvents = events.filter((e) => e.createdAt >= d && e.createdAt < next);
    perDay.push({
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      pageViews: dayEvents.filter((e) => e.event === 'page_view').length,
      productViews: dayEvents.filter((e) => e.event === 'product_view').length,
      addToCarts: dayEvents.filter((e) => e.event === 'add_to_cart').length,
      visitors: new Set(dayEvents.map((e) => e.visitorId)).size
    });
  }

  const pageCounts = new Map();
  for (const e of pageEvents) {
    const p = e.path || '/';
    pageCounts.set(p, (pageCounts.get(p) || 0) + 1);
  }
  const topPages = [...pageCounts.entries()]
    .map(([path, views]) => ({ path, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  const productCounts = new Map();
  for (const e of productEvents) {
    if (!e.bookId) continue;
    productCounts.set(e.bookId, (productCounts.get(e.bookId) || 0) + 1);
  }
  const cartCounts = new Map();
  for (const e of cartEvents) {
    if (!e.bookId) continue;
    cartCounts.set(e.bookId, (cartCounts.get(e.bookId) || 0) + 1);
  }
  let topProducts = [...new Set([...productCounts.keys(), ...cartCounts.keys()])].map((bookId) => ({
    bookId,
    slug: bookId,
    title: 'Book',
    image: '',
    views: productCounts.get(bookId) || 0,
    carts: cartCounts.get(bookId) || 0
  }));
  if (topProducts.length) {
    const books = await prisma.book.findMany({
      where: { id: { in: topProducts.map((p) => p.bookId) } },
      select: { id: true, slug: true, title: true, coverImage: true }
    });
    const byId = new Map(books.map((b) => [b.id, b]));
    topProducts = topProducts.map((p) => {
      const bk = byId.get(p.bookId);
      return bk
        ? { bookId: p.bookId, slug: bk.slug, title: bk.title, image: normalizeImage(bk.coverImage), views: p.views, carts: p.carts }
        : p;
    });
  }
  topProducts.sort((a, b) => b.views - a.views);
  topProducts = topProducts.slice(0, 10);

  const deviceCounts = new Map();
  for (const e of events) {
    const d = e.device || 'Unknown';
    deviceCounts.set(d, (deviceCounts.get(d) || 0) + 1);
  }
  const devices = [...deviceCounts.entries()]
    .map(([device, count]) => ({ device, count }))
    .sort((a, b) => b.count - a.count);

  const referrerCounts = new Map();
  for (const e of events) {
    if (!e.referrer) continue;
    referrerCounts.set(e.referrer, (referrerCounts.get(e.referrer) || 0) + 1);
  }
  const referrers = [...referrerCounts.entries()]
    .map(([referrer, count]) => ({ referrer, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  let recent = events.slice(0, 12).map((e) => ({
    id: e.id,
    visitorId: e.visitorId,
    event: e.event,
    path: e.path,
    device: e.device,
    browser: e.browser,
    bookId: e.bookId,
    referrer: e.referrer,
    at: e.createdAt.toISOString()
  }));
  const recentBookIds = [...new Set(recent.map((r) => r.bookId).filter(Boolean))];
  if (recentBookIds.length) {
    const books = await prisma.book.findMany({
      where: { id: { in: recentBookIds } },
      select: { id: true, slug: true, title: true }
    });
    const byId = new Map(books.map((b) => [b.id, b]));
    recent = recent.map((r) => {
      const bk = r.bookId ? byId.get(r.bookId) : null;
      return { ...r, bookSlug: bk ? bk.slug : '', bookTitle: bk ? bk.title : '' };
    });
  }

  return {
    periodDays: n,
    overview: {
      pageViews: pageEvents.length,
      productViews: productEvents.length,
      addToCarts: cartEvents.length,
      uniqueVisitors: uniqueVisitors.size,
      distinctProducts: distinctProductIds.size,
      distinctCartProducts: distinctCartIds.size,
      returningVisitors,
      visitsToday,
      uniqueToday,
      totalSessions: sessionCount,
      avgSessionMinutes
    },
    perDay,
    topPages,
    topProducts,
    devices,
    referrers,
    recent
  };
}

/*
 * Who logged in / visited: recent login events (with identity + device/IP) and
 * per-visitor profiles (first/last seen, active time, book views, add-to-carts,
 * and the linked account when the visitor was signed in).
 */
async function visitors({ days } = {}) {
  const n = Math.min(90, Math.max(1, Number(days) || 14));
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (n - 1));

  const logins = await prisma.actionLog.findMany({
    where: { type: 'LOGIN', at: { gte: since } },
    orderBy: { at: 'desc' },
    take: 100,
    include: { actor: { select: { id: true, name: true, email: true, role: true } } }
  });

  const events = await prisma.visitEvent.findMany({
    where: { createdAt: { gte: since } },
    select: {
      id: true,
      visitorId: true,
      event: true,
      userId: true,
      device: true,
      browser: true,
      createdAt: true
    },
    orderBy: { createdAt: 'asc' },
    take: 20000
  });

  const SESSION_GAP_MS = 30 * 60 * 1000;
  const byVisitor = new Map();
  for (const e of events) {
    let v = byVisitor.get(e.visitorId);
    if (!v) {
      v = { visitorId: e.visitorId, userId: null, events: [], devices: new Map(), browsers: new Map() };
      byVisitor.set(e.visitorId, v);
    }
    v.events.push(e);
    if (e.userId) v.userId = e.userId;
    v.devices.set(e.device || 'Unknown', (v.devices.get(e.device || 'Unknown') || 0) + 1);
    v.browsers.set(e.browser || 'Other', (v.browsers.get(e.browser || 'Other') || 0) + 1);
  }

  const userIds = [...byVisitor.values()].map((v) => v.userId).filter(Boolean);
  const users = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } })
    : [];
  const userById = new Map(users.map((u) => [u.id, u]));

  const loginCounts = userIds.length
    ? await prisma.session.groupBy({ by: ['userId'], _count: { _all: true }, where: { userId: { in: userIds } } })
    : [];
  const loginCountByUser = new Map(loginCounts.map((r) => [r.userId, r._count._all]));

  const visitorsList = [];
  for (const v of byVisitor.values()) {
    const times = v.events.map((e) => e.createdAt.getTime()).sort((a, b) => a - b);
    let sessions = 0;
    let activeMs = 0;
    let start = times[0];
    let prev = times[0];
    for (let i = 1; i < times.length; i++) {
      if (times[i] - prev > SESSION_GAP_MS) {
        sessions++;
        activeMs += prev - start;
        start = times[i];
      }
      prev = times[i];
    }
    if (times.length) {
      sessions++;
      activeMs += prev - start;
    }

    const pageViews = v.events.filter((e) => e.event === 'page_view').length;
    const productViews = v.events.filter((e) => e.event === 'product_view').length;
    const addToCarts = v.events.filter((e) => e.event === 'add_to_cart').length;
    const topDevice = [...v.devices.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';
    const topBrowser = [...v.browsers.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'Other';
    const user = v.userId ? userById.get(v.userId) || null : null;

    visitorsList.push({
      visitorId: v.visitorId,
      user: user ? { id: user.id, name: user.name, email: user.email } : null,
      firstSeen: times.length ? new Date(times[0]).toISOString() : null,
      lastSeen: times.length ? new Date(times[times.length - 1]).toISOString() : null,
      sessions,
      activeMinutes: Math.round(activeMs / 60000),
      pageViews,
      productViews,
      addToCarts,
      logins: user ? loginCountByUser.get(user.id) || 0 : 0,
      device: topDevice,
      browser: topBrowser
    });
  }
  visitorsList.sort((a, b) => (a.lastSeen < b.lastSeen ? 1 : -1));

  return {
    logins: logins.map((l) => ({
      id: l.id,
      at: l.at.toISOString(),
      name: l.actor ? l.actor.name : 'Unknown',
      email: l.actor ? l.actor.email : '',
      role: l.actor ? l.actor.role : '',
      device: (l.data && l.data.device) || '',
      browser: (l.data && l.data.browser) || '',
      ip: (l.data && l.data.ip) || ''
    })),
    visitors: visitorsList
  };
}

module.exports = { recordEvent, summary, visitors };