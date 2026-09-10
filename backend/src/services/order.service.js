const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { reserveStock } = require('./book.service');

const ORDER_STATUSES = ['PLACED', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

const TRANSITIONS = {
  PLACED: ['PAID', 'SHIPPED', 'CANCELLED'],
  PAID: ['PROCESSING', 'SHIPPED', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: []
};

function newRef() {
  return 'ORD-' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

/* Prices always come from the database — never trust the browser. */
async function computeFromDb(items) {
  if (!Array.isArray(items) || !items.length) {
    const err = new Error('Order is empty.');
    err.status = 400;
    throw err;
  }
  const entries = [];
  let total = 0;
  for (const it of items) {
    const slug = it.id || it.slug;
    if (!slug) {
      const err = new Error('Each item needs a book id.');
      err.status = 400;
      throw err;
    }
    const book = await prisma.book.findUnique({ where: { slug } });
    if (!book) {
      const err = new Error('Unknown book: ' + slug);
      err.status = 400;
      throw err;
    }
    const qty = Math.max(1, Number(it.qty) || 1);
    const price = Number(book.price);
    entries.push({ bookId: book.id, slug, qty, price, title: book.title, image: book.cover });
    total += qty * price;
  }
  return { entries, total };
}

function serializeOrder(order, includeUser) {
  return {
    id: order.id,
    reference: order.reference,
    status: order.status,
    total: Number(order.total),
    paymentMethod: order.paymentMethod || 'demo',
    paidAt: order.paidAt ? order.paidAt.toISOString() : null,
    contact: {
      name: order.contactName || '',
      email: order.contactEmail || '',
      phone: order.contactPhone || '',
      address: order.contactAddress || ''
    },
    placedAt: order.placedAt.toISOString(),
    ...(includeUser && order.user
      ? { user: { id: order.user.id, name: order.user.name, email: order.user.email, mobile: order.user.mobile || '' } }
      : {}),
    items: order.items.map((oi) => ({
      id: oi.book ? oi.book.slug : 'book',
      title: oi.book ? oi.book.title : 'Book',
      price: Number(oi.price),
      qty: oi.qty,
      image: oi.book ? oi.book.cover : ''
    }))
  };
}

async function create(userId, items, opts = {}) {
  const shipping = opts.shipping || {};
  const { entries, total } = await computeFromDb(items);
  await reserveStock(entries);

  const order = await prisma.order.create({
    data: {
      reference: newRef(),
      status: opts.status || 'PAID',
      total,
      paymentMethod: opts.paymentMethod || 'demo',
      paidAt: opts.paidAt != null ? opts.paidAt : new Date(),
      contactName: String(shipping.name || '').trim(),
      contactEmail: String(shipping.email || '').trim(),
      contactPhone: String(shipping.phone || '').trim(),
      contactAddress: String(shipping.address || '').trim(),
      userId,
      items: { create: entries.map((e) => ({ bookId: e.bookId, qty: e.qty, price: e.price })) }
    },
    include: { items: { include: { book: true } }, user: true }
  });

  await prisma.user.update({ where: { id: userId }, data: { cart: [] } });
  return serializeOrder(order);
}

async function listForUser(userId) {
  const orders = await prisma.order.findMany({
    where: { userId },
    include: { items: { include: { book: true } } },
    orderBy: { placedAt: 'desc' }
  });
  return orders.map((o) => serializeOrder(o));
}

async function listAll({ status, page, pageSize }) {
  const where = {};
  if (status) {
    const s = String(status).toUpperCase();
    if (ORDER_STATUSES.includes(s)) where.status = s;
  }
  const p = Math.max(1, Number(page) || 1);
  const size = Math.min(100, Math.max(1, Number(pageSize) || 20));
  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: { items: { include: { book: true } }, user: true },
      orderBy: { placedAt: 'desc' },
      skip: (p - 1) * size,
      take: size
    })
  ]);
  return {
    orders: orders.map((o) => serializeOrder(o, true)),
    total,
    page: p,
    pageSize: size,
    totalPages: Math.ceil(total / size)
  };
}

/* Authorization rules live server-side; only allow legal transitions. */
async function updateStatus(orderId, status, actorId) {
  const s = String(status || '').toUpperCase();
  if (!ORDER_STATUSES.includes(s)) {
    const err = new Error('Unknown status "' + status + '".');
    err.status = 400;
    throw err;
  }
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    const err = new Error('Order not found.');
    err.status = 404;
    throw err;
  }
  if (!TRANSITIONS[order.status].includes(s)) {
    const err = new Error('Cannot move an order from ' + order.status + ' to ' + s + '.');
    err.status = 409;
    throw err;
  }
  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status: s, paidAt: s === 'PAID' ? new Date() : order.paidAt },
    include: { items: { include: { book: true } }, user: true }
  });
  await prisma.actionLog.create({
    data: {
      actorId,
      type: 'ORDER_STATUS',
      detail: order.reference + ' -> ' + s,
      data: { orderId: order.id, from: order.status, to: s }
    }
  }).catch(() => undefined);
  return serializeOrder(updated, true);
}

async function revenue() {
  const counts = await prisma.order.aggregate({
    _sum: { total: true },
    _count: { _all: true },
    where: { status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } }
  });
  return { revenue: Number(counts._sum.total || 0), paidOrderCount: counts._count._all };
}

module.exports = {
  create,
  listForUser,
  listAll,
  updateStatus,
  revenue,
  computeFromDb,
  serializeOrder,
  ORDER_STATUSES,
  TRANSITIONS
};