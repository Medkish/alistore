const prisma = require('../lib/prisma');
const bookService = require('../services/book.service');
const orderService = require('../services/order.service');
const notificationsService = require('../services/notifications.service');
const analyticsService = require('../services/analytics.service');
const { normalizeImage } = require('../utils/image');

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function cleanCode(s) {
  return String(s || '')
    .toUpperCase()
    .trim()
    .replace(/\s+/g, '');
}

function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/* Server-side input validation - never trust the browser. */
function validateBook(data) {
  const errors = [];
  const title = String(data.title || '').trim();
  const author = String(data.author || '').trim();
  const price = num(data.price, NaN);
  const stock = Number.isInteger(Number(data.stock)) ? Number(data.stock) : NaN;
  const lowStockThreshold = Number.isInteger(Number(data.lowStockThreshold)) ? Number(data.lowStockThreshold) : NaN;
  const rating = num(data.rating, 4.5);
  const cover = String(data.coverImage || data.image || '').trim();
  if (!title) errors.push('title is required.');
  if (!author) errors.push('author is required.');
  if (!Number.isFinite(price) || price <= 0) errors.push('price must be a positive number.');
  if (!Number.isFinite(stock) || stock < 0) errors.push('stock must be a non-negative integer.');
  if (!Number.isFinite(lowStockThreshold) || lowStockThreshold < 0) errors.push('lowStockThreshold must be a non-negative integer.');
  if (rating < 0 || rating > 5) errors.push('rating must be between 0 and 5.');
  if (!cover) errors.push('coverImage is required.');
  return { errors, clean: { title, author, price, stock, lowStockThreshold, rating, cover, description: String(data.description || '').trim(), prevPrice: data.prevPrice != null && data.prevPrice !== '' ? num(data.prevPrice, 0) : null, category: String(data.category || 'general').trim(), featured: !!data.featured, bestseller: !!data.bestseller, published: data.published !== false } };
}

async function stats(req, res) {
  const [bookCount, stockTotal, userCount, rev] = await Promise.all([
    prisma.book.count({ where: { published: true } }),
    prisma.book.aggregate({ _sum: { stock: true } }),
    prisma.user.count(),
    orderService.revenue()
  ]);
  const recent = await prisma.order.findMany({
    include: { user: true, items: { include: { book: true } } },
    orderBy: { placedAt: 'desc' },
    take: 5
  });
  res.json({
    bookCount,
    stockTotal: Number(stockTotal._sum.stock || 0),
    userCount,
    revenue: rev.revenue,
    paidOrderCount: rev.paidOrderCount,
    recentOrders: recent.map((o) => orderService.serializeOrder(o, true))
  });
}

async function analytics(req, res) {
  const data = await analyticsService.summary({ days: Number(req.query.days) || 14 });
  res.json(data);
}

async function listBooks(req, res) {
  const q = req.query || {};
  const filters = {};
  for (const key of ['search', 'category', 'author', 'isbn', 'sort', 'featured', 'bestseller', 'published']) {
    const v = String(q[key] || '').trim();
    if (v) filters[key] = v;
  }
  for (const key of ['minPrice', 'maxPrice']) {
    const v = String(q[key] || '').trim();
    if (v) filters[key] = v;
  }
  const result = await bookService.list({ page: 1, pageSize: 100, sort: 'newest', ...filters });
  res.json(result);
}

async function createBook(req, res) {
  const { errors, clean } = validateBook(req.body || {});
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });
  const book = await bookService.createBook(clean);
  res.status(201).json({ book });
}

async function updateBook(req, res) {
  const existing = await prisma.book.findUnique({ where: { slug: req.params.slug } });
  if (!existing) return res.status(404).json({ error: 'Book not found.' });
  const body = req.body || {};
  const price = body.price;
  if (price != null && !(Number.isFinite(Number(price)) && Number(price) > 0)) {
    return res.status(400).json({ error: 'price must be a positive number.' });
  }
  const stock = body.stock;
  if (stock != null && !(Number.isInteger(Number(stock)) && Number(stock) >= 0)) {
    return res.status(400).json({ error: 'stock must be a non-negative integer.' });
  }
  const lowStockThreshold = body.lowStockThreshold;
  if (lowStockThreshold != null && !(Number.isInteger(Number(lowStockThreshold)) && Number(lowStockThreshold) >= 0)) {
    return res.status(400).json({ error: 'lowStockThreshold must be a non-negative integer.' });
  }
  const book = await bookService.updateBook(req.params.slug, body);
  res.json({ book });
}

async function deleteBook(req, res) {
  const result = await bookService.deleteBook(req.params.slug);
  res.json(result);
}

async function listOrders(req, res) {
  const result = await orderService.listAll({
    status: String(req.query.status || '').trim(),
    fresh: req.query.fresh === 'true',
    search: String(req.query.search || '').trim(),
    page: num(req.query.page, 1),
    pageSize: num(req.query.pageSize, 20)
  });
  res.json(result);
}

async function updateOrderStatus(req, res) {
  const result = await orderService.updateStatus(req.params.id, req.body && req.body.status, req.user.id, req.body && req.body.note);
  res.json({ order: result });
}

async function setOrderTracking(req, res) {
  const result = await orderService.setTracking(req.params.id, req.body || {}, req.user.id);
  res.json({ order: result });
}

async function setOrderNotes(req, res) {
  const result = await orderService.setNotes(req.params.id, req.body && req.body.notes, req.user.id);
  res.json({ order: result });
}

async function refundOrder(req, res) {
  const result = await orderService.updateStatus(req.params.id, 'REFUNDED', req.user.id, req.body && req.body.note);
  res.json({ order: result });
}

async function listUsers(req, res) {
  const q = String(req.query.search || '').trim();
  const status = String(req.query.status || '').trim();
  const where = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { mobile: { contains: q, mode: 'insensitive' } }
    ];
  }
  if (status === 'blocked') where.blocked = true;
  else if (status === 'active') where.blocked = false;
  const users = await prisma.user.findMany({ where, orderBy: { createdAt: 'desc' } });
  const rows = await Promise.all(users.map(async (u) => {
    const [agg, lastOrder] = await Promise.all([
      prisma.order.aggregate({
        where: { userId: u.id, status: { in: ['PAID', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'] } },
        _sum: { total: true },
        _count: true
      }),
      prisma.order.findFirst({ where: { userId: u.id }, orderBy: { placedAt: 'desc' }, select: { placedAt: true } })
    ]);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      mobile: u.mobile || '',
      role: u.role,
      blocked: u.blocked,
      notes: u.notes || '',
      lastActive: u.lastActive ? u.lastActive.toISOString() : u.createdAt.toISOString(),
      createdAt: u.createdAt.toISOString(),
      ordersCount: agg._count,
      totalSpent: Number(agg._sum.total || 0),
      lastOrderAt: lastOrder ? lastOrder.placedAt.toISOString() : null
    };
  }));
  res.json({ users: rows });
}

async function blockUser(req, res) {
  const u = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!u) return res.status(404).json({ error: 'User not found.' });
  const blocked = req.body && req.body.blocked != null ? !!req.body.blocked : false;
  await prisma.user.update({ where: { id: u.id }, data: { blocked } });
  res.json({ ok: true, blocked });
}

async function setUserNotes(req, res) {
  const u = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!u) return res.status(404).json({ error: 'User not found.' });
  const notes = String((req.body && req.body.notes) || '').trim();
  await prisma.user.update({ where: { id: u.id }, data: { notes } });
  res.json({ ok: true, notes });
}

async function listCarts(req, res) {
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, cart: true, lastActive: true } });
  const books = await prisma.book.findMany({ select: { id: true, slug: true, title: true, price: true, coverImage: true } });
  const byId = new Map(books.map((b) => [b.id, b]));
  const bySlug = new Map(books.map((b) => [b.slug, b]));
  const carts = [];
  for (const u of users) {
    const items = Array.isArray(u.cart) ? u.cart : [];
    if (!items.length) continue;
    let value = 0;
    const listed = items.map((it) => {
      const bid = it.bookId || it.id || it.slug;
      const book = (bid && (byId.get(bid) || bySlug.get(bid))) || null;
      const price = Number(book ? book.price : it.price || 0);
      const qty = Number(it.quantity || it.qty) || 0;
      value += price * qty;
      return { id: bid, title: book ? book.title : (it.title || 'Unknown'), price, qty };
    });
    carts.push({ id: u.id, name: u.name, email: u.email, lastActive: (u.lastActive || u.createdAt).toISOString(), items: listed, value: Math.round(value * 100) / 100 });
  }
  carts.sort((a, b) => b.value - a.value);
  const now = Date.now();
  const active = carts.filter((c) => now - new Date(c.lastActive).getTime() < 24 * 3600 * 1000);
  const abandoned = carts.filter((c) => now - new Date(c.lastActive).getTime() >= 24 * 3600 * 1000);
  res.json({ carts, total: carts.length, activeCount: active.length, abandonedCount: abandoned.length, totalValue: Math.round(carts.reduce((s, c) => s + c.value, 0) * 100) / 100 });
}

async function listPayments(req, res) {
  const orders = await prisma.order.findMany({ orderBy: { placedAt: 'desc' }, take: 500 });
  const transactions = orders.map((o) => ({
    id: o.id,
    reference: o.reference,
    transactionId: o.paymentReference || '—',
    method: o.paymentProvider,
    provider: o.paymentProvider,
    amount: Number(o.total),
    status: o.paymentStatus,
    date: (o.paidAt || o.placedAt).toISOString()
  }));
  const summary = { successful: 0, pending: 0, failed: 0, refunded: 0, unpaid: 0, total: transactions.length, totalAmount: 0, successfulAmount: 0 };
  for (const t of transactions) {
    summary.totalAmount += t.amount;
    if (t.status === 'PAID') { summary.successful += 1; summary.successfulAmount += t.amount; }
    else if (t.status === 'PENDING') summary.pending += 1;
    else if (t.status === 'FAILED') summary.failed += 1;
    else if (t.status === 'REFUNDED') summary.refunded += 1;
    else summary.unpaid += 1;
  }
  summary.totalAmount = Math.round(summary.totalAmount * 100) / 100;
  summary.successfulAmount = Math.round(summary.successfulAmount * 100) / 100;
  res.json({ summary, transactions });
}

async function uploadCover(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file received.' });
  const url = 'images/uploads/' + req.file.filename;
  res.json({ url, filename: req.file.filename });
}

/* --------------------- Inventory --------------------- */

async function adjustStock(req, res) {
  const slug = String((req.body && req.body.slug) || '').trim();
  const qty = num(req.body && req.body.qty, NaN);
  const reason = String((req.body && req.body.reason) || '').trim() || 'Manual adjustment';
  if (!slug) return res.status(400).json({ error: 'Book slug is required.' });
  if (!Number.isInteger(qty) || qty === 0) return res.status(400).json({ error: 'Quantity must be a non-zero integer.' });
  const book = await prisma.book.findUnique({ where: { slug } });
  if (!book) return res.status(404).json({ error: 'Book not found.' });
  const next = Math.max(0, book.stock + qty);
  const applied = next - book.stock;
  if (applied === 0) return res.status(409).json({ error: 'Cannot remove more stock than is available.' });
  const updated = await prisma.book.update({ where: { id: book.id }, data: { stock: next } });
  await prisma.inventoryTransaction.create({
    data: {
      bookId: book.id,
      quantity: applied,
      type: applied > 0 ? 'STOCK_IN' : 'STOCK_OUT',
      reason,
      createdBy: req.user ? req.user.email : ''
    }
  });
  res.json({ slug: updated.slug, stock: updated.stock, change: applied });
}

async function stockHistory(req, res) {
  const limit = Math.min(200, Math.max(1, num(req.query.limit, 50)));
  const logs = await prisma.inventoryTransaction.findMany({ orderBy: { createdAt: 'desc' }, take: limit, include: { book: { select: { slug: true, title: true, coverImage: true } } } });
  res.json({
    logs: logs.map((l) => ({
      id: l.id,
      slug: l.book.slug,
      title: l.book.title,
      coverImage: l.book.coverImage,
      change: l.quantity,
      type: l.type,
      reason: l.reason,
      createdBy: l.createdBy,
      createdAt: l.createdAt
    }))
  });
}

function serializeCategory(c) {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description || '',
    image: c.image || '',
    active: c.active !== false,
    booksCount: c._count ? c._count.books : 0
  };
}

async function listCategories(req, res) {
  const cats = await prisma.category.findMany({ include: { _count: { select: { books: true } } }, orderBy: { name: 'asc' } });
  res.json({ categories: cats.map(serializeCategory) });
}

function categorySlug(req) {
  const raw = String((req.body && (req.body.slug != null ? req.body.slug : req.body.name)) || '').trim();
  const key = slugify(raw);
  return { key, name: String((req.body && req.body.name) || '').trim(), description: String((req.body && req.body.description) || '').trim(), image: String((req.body && req.body.image) || '').trim(), active: (req.body && req.body.active) != null ? !!req.body.active : true };
}

async function createCategory(req, res) {
  const { key, name, description, image, active } = categorySlug(req);
  if (!name) return res.status(400).json({ error: 'Category name is required.' });
  if (!key) return res.status(400).json({ error: 'Category slug is required.' });
  const existing = await prisma.category.findUnique({ where: { slug: key } });
  if (existing) return res.status(409).json({ error: 'A category with that slug already exists.' });
  const cat = await prisma.category.create({ data: { name, slug: key, description, image, active } });
  res.status(201).json({ category: serializeCategory(cat) });
}

async function updateCategory(req, res) {
  const existing = await prisma.category.findUnique({ where: { slug: req.params.slug } });
  if (!existing) return res.status(404).json({ error: 'Category not found.' });
  const { key, name, description, image, active } = categorySlug(req);
  if (!name) return res.status(400).json({ error: 'Category name is required.' });
  if (!key) return res.status(400).json({ error: 'Category slug is required.' });
  if (key !== existing.slug) {
    const dup = await prisma.category.findUnique({ where: { slug: key } });
    if (dup) return res.status(409).json({ error: 'A category with that slug already exists.' });
  }
  const cat = await prisma.category.update({ where: { id: existing.id }, data: { name, slug: key, description, image, active } });
  res.json({ category: serializeCategory(cat) });
}

async function toggleCategory(req, res) {
  const existing = await prisma.category.findUnique({ where: { slug: req.params.slug } });
  if (!existing) return res.status(404).json({ error: 'Category not found.' });
  const active = req.body && req.body.active != null ? !!req.body.active : !existing.active;
  const cat = await prisma.category.update({ where: { id: existing.id }, data: { active } });
  res.json({ category: serializeCategory(cat) });
}

async function deleteCategory(req, res) {
  const existing = await prisma.category.findUnique({ where: { slug: req.params.slug }, include: { _count: { select: { books: true } } } });
  if (!existing) return res.status(404).json({ error: 'Category not found.' });
  if (existing._count.books > 0) return res.status(409).json({ error: 'Move or delete the books in this category first.' });
  await prisma.category.delete({ where: { id: existing.id } });
  res.json({ ok: true });
}

function serializeDiscount(d) {
  return {
    id: d.id,
    code: d.code,
    type: d.type,
    value: Number(d.value),
    minOrder: Number(d.minOrder),
    active: d.active,
    maxUses: d.maxUses,
    usedCount: d.usedCount || 0,
    expiresAt: d.expiresAt ? d.expiresAt.toISOString() : null,
    createdAt: d.createdAt.toISOString()
  };
}

async function listDiscounts(req, res) {
  const discounts = await prisma.discount.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ discounts: discounts.map(serializeDiscount) });
}

async function createDiscount(req, res) {
  const body = req.body || {};
  const code = cleanCode(body.code);
  if (!code) return res.status(400).json({ error: 'Discount code is required.' });
  const type = String(body.type || 'PERCENT').toUpperCase() === 'FIXED' ? 'FIXED' : 'PERCENT';
  const value = num(body.value, NaN);
  const minOrder = num(body.minOrder, 0);
  if (!Number.isFinite(value) || value <= 0) return res.status(400).json({ error: 'value must be a positive number.' });
  if (type === 'PERCENT' && value > 100) return res.status(400).json({ error: 'Percent discount cannot exceed 100%.' });
  const existing = await prisma.discount.findUnique({ where: { code } });
  if (existing) return res.status(409).json({ error: 'That code already exists.' });
  const d = await prisma.discount.create({
    data: {
      code,
      type,
      value,
      minOrder,
      active: body.active !== false,
      maxUses: body.maxUses != null && body.maxUses !== '' ? Math.max(1, num(body.maxUses, NaN)) : null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null
    }
  });
  res.status(201).json({ discount: serializeDiscount(d) });
}

async function updateDiscount(req, res) {
  const existing = await prisma.discount.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Discount not found.' });
  const body = req.body || {};
  const data = {};
  if (body.active != null) data.active = !!body.active;
  if (body.type != null) data.type = String(body.type).toUpperCase() === 'FIXED' ? 'FIXED' : 'PERCENT';
  if (body.value != null) {
    const v = num(body.value, NaN);
    if (!Number.isFinite(v) || v <= 0) return res.status(400).json({ error: 'value must be a positive number.' });
    data.value = v;
  }
  if (body.minOrder != null) {
    const m = num(body.minOrder, NaN);
    if (!Number.isFinite(m) || m < 0) return res.status(400).json({ error: 'minOrder cannot be negative.' });
    data.minOrder = m;
  }
  if (body.maxUses != null) {
    const m = String(body.maxUses).trim();
    data.maxUses = m === '' || m === '0' ? null : Math.max(1, num(body.maxUses, NaN));
  }
  if (body.expiresAt != null) {
    const e = String(body.expiresAt).trim();
    data.expiresAt = e ? new Date(e) : null;
  }
  const d = await prisma.discount.update({ where: { id: existing.id }, data });
  res.json({ discount: serializeDiscount(d) });
}

async function deleteDiscount(req, res) {
  const existing = await prisma.discount.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Discount not found.' });
  await prisma.discount.delete({ where: { id: existing.id } });
  res.json({ ok: true });
}

function serializeReview(r) {
  return {
    id: r.id,
    rating: r.rating,
    text: r.text,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    book: r.book ? { slug: r.book.slug, title: r.book.title, image: normalizeImage(r.book.coverImage || r.book.cover) } : null,
    user: r.user ? { id: r.user.id, name: r.user.name, email: r.user.email } : null
  };
}

async function listReviews(req, res) {
  const status = String(req.query.status || '').toUpperCase();
  const where = status === 'PENDING' || status === 'APPROVED' || status === 'REJECTED' ? { status } : {};
  const reviews = await prisma.review.findMany({
    where,
    include: { book: true, user: true },
    orderBy: { createdAt: 'desc' },
    take: 100
  });
  const pending = await prisma.review.count({ where: { status: 'PENDING' } });
  res.json({ reviews: reviews.map(serializeReview), pending });
}

async function moderateReview(req, res) {
  const status = String((req.body && req.body.status) || '').toUpperCase();
  if (!['APPROVED', 'REJECTED'].includes(status)) return res.status(400).json({ error: 'status must be APPROVED or REJECTED.' });
  const existing = await prisma.review.findUnique({ where: { id: req.params.id }, include: { book: true } });
  if (!existing) return res.status(404).json({ error: 'Review not found.' });
  const review = await prisma.review.update({ where: { id: existing.id }, data: { status } });
  await notificationsService.create(
    existing.userId,
    'review_' + status.toLowerCase(),
    status === 'APPROVED' ? 'Your review was approved' : 'Your review was not approved',
    'Your review of "' + (existing.book ? existing.book.title : 'a book') + '" was ' + (status === 'APPROVED' ? 'accepted' : 'declined') + '.'
  );
  res.json({ review: serializeReview(review) });
}

async function deleteReview(req, res) {
  const existing = await prisma.review.findUnique({ where: { id: req.params.id }, include: { book: true } });
  if (!existing) return res.status(404).json({ error: 'Review not found.' });
  await prisma.review.delete({ where: { id: existing.id } });
  if (existing.userId) {
    await notificationsService.create(
      existing.userId,
      'review_deleted',
      'Your review was removed',
      'Your review of "' + (existing.book ? existing.book.title : 'a book') + '" was removed by an administrator.'
    );
  }
  res.json({ ok: true });
}

async function activity(req, res) {
  const [sessions, actions] = await Promise.all([
    prisma.session.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { user: { select: { id: true, name: true, email: true, role: true } } }
    }),
    prisma.actionLog.findMany({
      orderBy: { at: 'desc' },
      take: 50,
      include: { actor: { select: { id: true, name: true, email: true, role: true } } }
    })
  ]);

  const events = [];
  for (const s of sessions) {
    events.push({
      id: 'session_' + s.id,
      at: s.createdAt.toISOString(),
      kind: 'LOGIN',
      actor: s.user ? s.user.name : 'Unknown',
      email: s.user ? s.user.email : '',
      detail: 'Signed in',
      role: s.user ? s.user.role : '',
      sessionId: s.id
    });
  }
  for (const a of actions) {
    events.push({
      id: 'action_' + a.id,
      at: a.at.toISOString(),
      kind: a.type,
      actor: a.actor ? a.actor.name : 'System',
      email: a.actor ? a.actor.email : '',
      detail: a.detail || a.type,
      role: a.actor ? a.actor.role : '',
      sessionId: ''
    });
  }

  events.sort((a, b) => (a.at < b.at ? 1 : -1));
  res.json({ events: events.slice(0, 100) });
}

async function listSessions(req, res) {
  const sessions = await prisma.session.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { user: { select: { id: true, name: true, email: true, role: true } } }
  });
  res.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      tokenPrefix: s.token.slice(0, 8) + '…',
      createdAt: s.createdAt.toISOString(),
      active: true,
      current: s.id === req.session.id,
      userId: s.userId,
      user: s.user
    }))
  });
}

async function revokeSession(req, res) {
  const session = await prisma.session.findUnique({ where: { id: req.params.id } });
  if (!session) return res.status(404).json({ error: 'Session not found.' });
  if (session.id === req.session.id) {
    return res.status(400).json({ error: 'Cannot revoke your own current session. Use logout instead.' });
  }
  await prisma.session.delete({ where: { id: session.id } });
  res.json({ ok: true });
}

const VALID_ROLES = ['CUSTOMER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'];

async function updateUserRole(req, res) {
  const role = String((req.body && req.body.role) || '').trim().toUpperCase();
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: 'role must be one of: ' + VALID_ROLES.join(', ') });
  }
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: 'User not found.' });
  if (user.id === req.user.id && role !== req.user.role) {
    return res.status(400).json({ error: 'You cannot change your own role.' });
  }
  const updated = await prisma.user.update({ where: { id: user.id }, data: { role } });
  res.json({
    user: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      mobile: updated.mobile || '',
      role: updated.role
    }
  });
}

module.exports = {
  stats,
  analytics,
  listBooks,
  createBook,
  updateBook,
  deleteBook,
  listOrders,
  updateOrderStatus,
  listUsers,
  blockUser,
  setUserNotes,
  listCarts,
  listPayments,
  uploadCover,
  adjustStock,
  stockHistory,
  setOrderTracking,
  setOrderNotes,
  refundOrder,
  listCategories,
  createCategory,
  updateCategory,
  toggleCategory,
  deleteCategory,
  listDiscounts,
  createDiscount,
  updateDiscount,
  deleteDiscount,
  listReviews,
  moderateReview,
  deleteReview,
  activity,
  listSessions,
  revokeSession,
  updateUserRole
};