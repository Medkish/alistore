const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { reserveStock } = require('./book.service');
const { normalizeImage } = require('../utils/image');
const discountService = require('./discount.service');
const notificationsService = require('./notifications.service');

const ORDER_STATUSES = ['PENDING', 'PAID', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUNDED'];

const TRANSITIONS = {
  PENDING: ['CONFIRMED', 'CANCELLED', 'PAID'],
  PAID: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'CANCELLED', 'REFUNDED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: []
};

const TRACK_LABEL = {
  PENDING: 'Order Placed',
  PAID: 'Payment Received',
  CONFIRMED: 'Order Confirmed',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded'
};

const GCC_COUNTRIES = ['saudi arabia', 'bahrain', 'kuwait', 'oman', 'qatar'];
const FREE_SHIPPING_THRESHOLD = 150;

function normalizeCountry(value) {
  return String(value || '').trim().toLowerCase();
}

function isUAE(country) {
  const c = normalizeCountry(country);
  return c === 'uae' || c === 'united arab emirates' || c === 'emirates';
}

/* Shipping cost is derived server-side from the customer's country — the
   browser only picks the country, it never quotes a price. */
function computeShippingCost(country, orderAmount) {
  const c = normalizeCountry(country);
  const cost = isUAE(country) ? 10 : GCC_COUNTRIES.includes(c) ? 25 : 45;
  if (isUAE(country) && orderAmount >= FREE_SHIPPING_THRESHOLD) return 0;
  return cost;
}

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

const PAYMENT_METHODS = ['card', 'cash-on-delivery', 'demo'];

function cleanPaymentMethod(value) {
  const v = String(value || '').toLowerCase();
  return PAYMENT_METHODS.includes(v) ? v : 'demo';
}

function serializeOrder(order, includeUser) {
  return {
    id: order.id,
    reference: order.reference,
    status: order.status,
    total: Number(order.total),
    subtotal: Number(order.subtotal == null ? (order.total || 0) : order.subtotal),
    shippingCost: Number(order.shippingCost || 0),
    tax: Number(order.tax || 0),
    paymentMethod: order.paymentProvider || 'demo',
    paymentProvider: order.paymentProvider || 'demo',
    paymentStatus: order.paymentStatus || 'UNPAID',
    paymentReference: order.paymentReference || '',
    paidAt: order.paidAt ? order.paidAt.toISOString() : null,
    couponCode: order.couponCode || '',
    discountAmount: Number(order.discountAmount || 0),
    trackingNumber: order.trackingNumber || '',
    trackingProvider: order.trackingProvider || '',
    estimatedDelivery: order.estimatedDelivery ? order.estimatedDelivery.toISOString() : null,
    notes: order.notes || '',
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
    items: (order.items || []).map((oi) => ({
      id: oi.book ? oi.book.slug : 'book',
      title: oi.book ? oi.book.title : 'Book',
      price: Number(oi.price),
      qty: oi.qty,
      image: oi.book ? normalizeImage(oi.book.coverImage) : ''
    })),
    trackingEvents: (order.trackingEvents || []).map((t) => ({
      id: t.id,
      status: t.status,
      label: TRACK_LABEL[t.status] || t.status,
      note: t.note || '',
      at: t.at.toISOString()
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
      await discountService.incrementUse(res.code);
    }
  }
  const paymentMethod = cleanPaymentMethod(opts.paymentMethod);
  const shippingCost = computeShippingCost(String(opts.shipping.country || ''), subtotal - discountAmount);
  if (paymentMethod === 'cash-on-delivery' && !isUAE(opts.shipping.country)) {
    const err = new Error('Cash on Delivery is only available within the UAE.');
    err.status = 400;
    throw err;
  }
  const tax = Math.max(0, Number(opts.tax) || 0);
  const total = Math.round((subtotal - discountAmount + shippingCost + tax) * 100) / 100;
  await reserveStock(entries, { reason: 'Sale on check-out', createdBy: opts.userEmail || '' });

  const reference = newRef();
  const initialStatus = opts.status || 'PENDING';
  const alreadyPaid = initialStatus === 'PAID';

  const trackingEvents = [{ status: initialStatus, note: initialStatus === 'PAID' ? 'Payment received.' : 'Order placed — awaiting confirmation.' }];
  if (initialStatus === 'CONFIRMED') trackingEvents.push({ status: 'CONFIRMED', note: 'Order confirmed by the store.' });

  const order = await prisma.order.create({
    data: {
      reference,
      status: initialStatus,
      subtotal,
      shippingCost,
      tax,
      total,
      paymentStatus: alreadyPaid ? 'PAID' : 'UNPAID',
      paymentProvider: cleanPaymentMethod(opts.paymentMethod),
      paymentReference: alreadyPaid ? 'DEMO-' + reference : '',
      paidAt: opts.paidAt != null ? opts.paidAt : (alreadyPaid ? new Date() : null),
      couponCode,
      discountAmount,
      contactName: String(shipping.name || '').trim(),
      contactEmail: String(shipping.email || '').trim(),
      contactPhone: String(shipping.phone || '').trim(),
      contactAddress: String(shipping.address || '').trim(),
      userId,
      items: { create: entries.map((e) => ({ bookId: e.bookId, qty: e.qty, price: e.price })) },
      trackingEvents: { create: trackingEvents.map((t) => ({ status: t.status, note: t.note })) }
    },
    include: { items: { include: { book: true } }, user: true, trackingEvents: true }
  });

  await prisma.user.update({ where: { id: userId }, data: { cart: [] } });
  await notificationsService.create(userId, 'order_confirmed', 'Order confirmed', 'Your order ' + order.reference + ' was confirmed at ' + order.placedAt.toISOString() + '.');
  if (alreadyPaid) {
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

async function listAll({ status, fresh, search, page, pageSize }) {
  const where = {};
  if (status) {
    const s = String(status).toUpperCase();
    if (ORDER_STATUSES.includes(s)) where.status = s;
  }
  if (fresh === true || fresh === 'true') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    where.placedAt = { gte: start };
  }
  const q = String(search || '').trim();
  if (q) {
    where.OR = [
      { reference: { contains: q, mode: 'insensitive' } },
      { contactName: { contains: q, mode: 'insensitive' } },
      { contactEmail: { contains: q, mode: 'insensitive' } },
      { trackingNumber: { contains: q, mode: 'insensitive' } }
    ];
  }
  const p = Math.max(1, Number(page) || 1);
  const size = Math.min(100, Math.max(1, Number(pageSize) || 20));
  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: { items: { include: { book: true } }, user: true, trackingEvents: true },
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
async function updateStatus(orderId, status, actorId, note) {
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
  if (!TRANSITIONS[order.status] || !TRANSITIONS[order.status].includes(s)) {
    const err = new Error('Cannot move an order from ' + order.status + ' to ' + s + '.');
    err.status = 409;
    throw err;
  }
  const data = {
    status: s,
    paidAt: order.paidAt,
    paymentStatus: order.paymentStatus,
    paymentReference: order.paymentReference
  };
  if (s === 'PAID') {
    data.paymentStatus = 'PAID';
    data.paidAt = new Date();
    if (!data.paymentReference) data.paymentReference = 'DEMO-' + order.reference;
  } else if (s === 'CANCELLED') {
    data.paymentStatus = order.paymentStatus === 'PAID' ? 'REFUNDED' : 'FAILED';
  } else if (s === 'REFUNDED') {
    data.paymentStatus = 'REFUNDED';
  } else if (s === 'DELIVERED' && order.paymentProvider === 'cash-on-delivery' && order.paymentStatus === 'UNPAID') {
    data.paymentStatus = 'PAID';
    data.paidAt = new Date();
  }
  const updated = await prisma.order.update({
    where: { id: orderId },
    data,
    include: { items: { include: { book: true } }, user: true, trackingEvents: true }
  });
  await prisma.trackingEvent.create({
    data: {
      orderId,
      status: s,
      note: String(note || '').trim() || (TRACK_LABEL[s] || s) + '.'
    }
  }).catch(() => undefined);
  await prisma.actionLog.create({
    data: {
      actorId,
      type: 'ORDER_STATUS',
      detail: order.reference + ' -> ' + s,
      data: { orderId: order.id, from: order.status, to: s }
    }
  }).catch(() => undefined);
  if (order.userId) {
    const msg = {
      SHIPPED: { type: 'order_shipped', title: 'Order shipped', message: 'Your order ' + order.reference + ' has been shipped and is on its way.' },
      OUT_FOR_DELIVERY: { type: 'order_out_for_delivery', title: 'Out for delivery', message: 'Your order ' + order.reference + ' is out for delivery today.' },
      DELIVERED: { type: 'order_delivered', title: 'Order delivered', message: 'Your order ' + order.reference + ' has been delivered. Enjoy!' },
      REFUNDED: { type: 'order_refunded', title: 'Order refunded', message: 'Your order ' + order.reference + ' was refunded.' }
    }[s];
    if (msg) {
      await notificationsService.create(order.userId, msg.type, msg.title, msg.message);
    }
  }
  return serializeOrder(updated, true);
}

async function setTracking(orderId, tracking, actorId) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    const err = new Error('Order not found.');
    err.status = 404;
    throw err;
  }
  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      trackingNumber: String(tracking.trackingNumber || '').trim() || order.trackingNumber,
      trackingProvider: String(tracking.trackingProvider || '').trim(),
      estimatedDelivery: tracking.estimatedDelivery ? new Date(tracking.estimatedDelivery) : order.estimatedDelivery
    },
    include: { items: { include: { book: true } }, user: true, trackingEvents: true }
  });
  const num = String(tracking.trackingNumber || '').trim();
  const provider = String(tracking.trackingProvider || '').trim();
  if (num) {
    await prisma.trackingEvent.create({
      data: { orderId, status: order.status, note: 'Tracking update: ' + (provider ? provider + ' ' : '') + num + '.' }
    }).catch(() => undefined);
  }
  await prisma.actionLog.create({
    data: {
      actorId,
      type: 'ORDER_TRACKING',
      detail: order.reference + ' tracking updated',
      data: { orderId: order.id }
    }
  }).catch(() => undefined);
  return serializeOrder(updated, true);
}

async function setNotes(orderId, notes, actorId) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    const err = new Error('Order not found.');
    err.status = 404;
    throw err;
  }
  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { notes: String(notes || '').trim() },
    include: { items: { include: { book: true } }, user: true, trackingEvents: true }
  });
  await prisma.trackingEvent.create({
    data: { orderId, status: order.status, note: 'Note added by staff: ' + String(notes || '').trim().slice(0, 200) + '.' }
  }).catch(() => undefined);
  await prisma.actionLog.create({
    data: {
      actorId,
      type: 'ORDER_NOTE',
      detail: order.reference + ' notes updated',
      data: { orderId: order.id }
    }
  }).catch(() => undefined);
  return serializeOrder(updated, true);
}

async function getByReference(reference) {
  const order = await prisma.order.findUnique({
    where: { reference: String(reference || '').trim() },
    include: { items: { include: { book: true } }, trackingEvents: { orderBy: { at: 'asc' } } }
  });
  return order ? serializeOrder(order) : null;
}

async function revenue() {
  const counts = await prisma.order.aggregate({
    _sum: { total: true },
    _count: { _all: true },
    where: { status: { in: ['PAID', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'] } }
  });
  return { revenue: Number(counts._sum.total || 0), paidOrderCount: counts._count._all };
}

/* A book is "owned" when it appears on an order in a paid state.
   Content endpoints rely on this - never on client-side flags. */
async function purchasedBookSlugs(userId) {
  const orders = await prisma.order.findMany({
    where: { userId, status: { in: ['PAID', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'] } },
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
  setTracking,
  setNotes,
  getByReference,
  revenue,
  computeFromDb,
  serializeOrder,
  purchasedBookSlugs,
  hasPurchased,
  ORDER_STATUSES,
  TRANSITIONS,
  TRACK_LABEL
};