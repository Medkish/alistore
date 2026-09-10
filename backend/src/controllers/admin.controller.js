const prisma = require('../lib/prisma');
const bookService = require('../services/book.service');
const orderService = require('../services/order.service');
const notificationsService = require('../services/notifications.service');

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
  const rating = num(data.rating, 4.5);
  const cover = String(data.coverImage || data.image || '').trim();
  if (!title) errors.push('title is required.');
  if (!author) errors.push('author is required.');
  if (!Number.isFinite(price) || price <= 0) errors.push('price must be a positive number.');
  if (!Number.isFinite(stock) || stock < 0) errors.push('stock must be a non-negative integer.');
  if (rating < 0 || rating > 5) errors.push('rating must be between 0 and 5.');
  if (!cover) errors.push('coverImage is required.');
  return { errors, clean: { title, author, price, stock, rating, cover, description: String(data.description || '').trim(), prevPrice: data.prevPrice != null && data.prevPrice !== '' ? num(data.prevPrice, 0) : null, category: String(data.category || 'general').trim(), featured: !!data.featured, bestseller: !!data.bestseller, published: data.published !== false } };
}

async function stats(req, res) {
  const [bookCount, stockTotal, userCount, rev] = await Promise.all([
    prisma.book.count({ where: { published: true } }),
    prisma.book.aggregate({ _sum: { stock: true } }),
    prisma.user.count(),
    orderService.revenue()
  ]);
  const recent = await prisma.order.findMany({
    include: { user: true },
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

async function listBooks(req, res) {
  const result = await bookService.list({ page: 1, pageSize: 100, sort: 'newest', search: String(req.query.search || '').trim() });
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
    page: num(req.query.page, 1),
    pageSize: num(req.query.pageSize, 20)
  });
  res.json(result);
}

async function updateOrderStatus(req, res) {
  const result = await orderService.updateStatus(req.params.id, req.body && req.body.status, req.user.id);
  res.json({ order: result });
}

async function listUsers(req, res) {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { orders: true } } }
  });
  res.json({
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      mobile: u.mobile || '',
      role: u.role,
      createdAt: u.createdAt.toISOString(),
      ordersCount: u._count.orders
    }))
  });
}

async function uploadCover(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file received.' });
  const url = 'images/uploads/' + req.file.filename;
  res.json({ url, filename: req.file.filename });
}

function serializeCategory(c) {
  return { id: c.id, slug: c.slug, name: c.name, booksCount: c._count ? c._count.books : 0 };
}

async function listCategories(req, res) {
  const cats = await prisma.category.findMany({ include: { _count: { select: { books: true } } }, orderBy: { name: 'asc' } });
  res.json({ categories: cats.map(serializeCategory) });
}

async function createCategory(req, res) {
  const name = String((req.body && req.body.name) || '').trim();
  if (!name) return res.status(400).json({ error: 'Category name is required.' });
  const slug = slugify(name);
  const existing = await prisma.category.findUnique({ where: { slug } });
  if (existing) return res.status(409).json({ error: 'A category with that name already exists.' });
  const cat = await prisma.category.create({ data: { name, slug } });
  res.status(201).json({ category: serializeCategory(cat) });
}

async function updateCategory(req, res) {
  const existing = await prisma.category.findUnique({ where: { slug: req.params.slug } });
  if (!existing) return res.status(404).json({ error: 'Category not found.' });
  const name = String((req.body && req.body.name) || '').trim();
  if (!name) return res.status(400).json({ error: 'Category name is required.' });
  const slug = slugify(name);
  if (slug !== req.params.slug) {
    const dup = await prisma.category.findUnique({ where: { slug } });
    if (dup) return res.status(409).json({ error: 'A category with that name already exists.' });
  }
  const cat = await prisma.category.update({ where: { id: existing.id }, data: { name, slug } });
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
      active: body.active !== false
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
    book: r.book ? { slug: r.book.slug, title: r.book.title, image: r.book.cover } : null,
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

module.exports = {
  stats,
  listBooks,
  createBook,
  updateBook,
  deleteBook,
  listOrders,
  updateOrderStatus,
  listUsers,
  uploadCover,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listDiscounts,
  createDiscount,
  updateDiscount,
  deleteDiscount,
  listReviews,
  moderateReview
};