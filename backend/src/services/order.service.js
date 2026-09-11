const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { reserveStock } = require('./book.service');
const discountService = require('./discount.service');
const notificationsService = require('./notifications.service');

const ORDER_STATUSES = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

const TRANSITIONS = {
  PENDING: ['PAID', 'CANCELLED'],
  PAID: ['SHIPPED', 'CANCELLED'],
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
  let subtotal = 0;
  for (const it of items) {
    const id = it.bookId || it.book_id || it.id || it.slug;
    if (!id) {
      const err = new Error('Each item needs a book id.');
      err.status = 400;
      throw err;
    }
    const book = await prisma.book.findUnique({ where: { id } }).catch(() => null) ||
                  await prisma.book.findUnique({ where: { slug: id } }).catch(() => null);
    if (!book) {
      const err = new Error('Unknown book: ' + id);
      err.status = 400;
      throw err;
    }
    const qty = Math.max(1, Number(it.quantity || it.qty) || 1);
    const price = Number(book.price);
    entries.push({ bookId: book.id, slug: book.slug, qty, price, title: book.title, image: book.coverImage });
    subtotal += qty * price;
  }
  return { entries, subtotal };
}

function serializeOrder(order, includeUser) {
  return {
    id: order.id,
    reference: order.reference,
    status: order.status,
    total: Number(order.total),
    paymentMethod: order.paymentMethod || 'demo',
    paidAt: order.paidAt ? order.paidAt.toISOString() : null,
    couponCode: order.couponCode || '',
    discountAmount: Number(order.discountAmount || 0),
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
      image: oi.book ? oi.book.coverImage : ''
    }))
  };
}

async function create(userId, items, opts = {}) {
  const shipping = opts.shipping || {};
  const { entries, subtotal } = await computeFromDb(items);
  let discountAmount = 0;
  let couponCode = '';
  if (opts.coupon) {
    const res = await discountService.apply(opts.coupon, subtotal);
    if (res.valid) {
      discountAmount = res.discount;
      couponCode = res.code;
    }
  }
  const total = Math.round((subtotal - discountAmount) * 100) / 100;
  await reserveStock(entries);

  const order = await prisma.order.create({
    data: {
      reference: newRef(),
      status: opts.status || 'PENDING',
      total,
      paymentMethod: opts.paymentMethod || 'demo',
      paidAt: opts.paidAt != null ? opts.paidAt : (opts.status === 'PAID' ? new Date() : null),
      couponCode,
      discountAmount,
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
  await notificationsService.create(userId, 'order_confirmed', 'Order confirmed', 'Your order ' + order.reference + ' was confirmed at ' + order.placedAt.toISOString() + '.');
  if ((opts.status || 'PENDING') === 'PAID') {
    await notificationsService.create(userId, 'payment_received', 'Payment received', 'We received the payment for order ' + order.reference + '.');
  }
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

async function listAll({ status, search, page, pageSize }) {
  const where = {};
  if (status) {
    const s = String(status).toUpperCase();
    if (ORDER_STATUSES.includes(s)) where.status = s;
  }
  const q = String(search || '').trim();
  if (q) {
    where.OR = [
      { reference: { contains: q, mode: 'insensitive' } },
      { contactName: { contains: q, mode: 'insensitive' } },
      { contactEmail: { contains: q, mode: 'insensitive' } }
    ];
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
  if (s === 'SHIPPED' && order.userId) {
    await notificationsService.create(order.userId, 'order_shipped', 'Order shipped', 'Your order ' + order.reference + ' has been shipped and is on its way.');
  } else if (s === 'DELIVERED' && order.userId) {
    await notificationsService.create(order.userId, 'order_delivered', 'Order delivered', 'Your order ' + order.reference + ' has been delivered. Enjoy!');
  }
  return serializeOrder(updated, true);
}

async function revenue() {
  const counts = await prisma.order.aggregate({
    _sum: { total: true },
    _count: { _all: true },
    where: { status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] } }
  });
  return { revenue: Number(counts._sum.total || 0), paidOrderCount: counts._count._all };
}

/* A book is "owned" when it appears on an order in a paid state.
   Content endpoints rely on this - never on client-side flags. */
async function purchasedBookSlugs(userId) {
  const orders = await prisma.order.findMany({
    where: { userId, status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] } },
    include: { items: { include: { book: true } } }
  });
  const slugs = new Set();
  for (const o of orders) {
    for (const it of o.items) {
      if (it.book) slugs.add(it.book.slug);
    }
  }
  return slugs;
}

async function hasPurchased(userId, slug) {
  const owned = await purchasedBookSlugs(userId);
  return owned.has(slug);
}

module.exports = {
  create,
  listForUser,
  listAll,
  updateStatus,
  revenue,
  computeFromDb,
  serializeOrder,
  purchasedBookSlugs,
  hasPurchased,
  ORDER_STATUSES,
  TRANSITIONS
};