const prisma = require('../lib/prisma');
const bookService = require('../services/book.service');
const orderService = require('../services/order.service');

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

module.exports = { stats, listBooks, createBook, updateBook, deleteBook, listOrders, updateOrderStatus, listUsers, uploadCover };