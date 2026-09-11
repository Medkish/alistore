const orderService = require('../services/order.service');

const PHONE_RE = /^[+0-9 ()-]{6,20}$/;

const PAYMENT_METHODS = [
  'credit-card',
  'debit-card',
  'paypal',
  'apple-pay',
  'google-pay',
  'atm',
  'bank-transfer',
  'cash-on-delivery',
  'demo'
];

function cleanPaymentMethod(v) {
  const raw = String(v || '').toLowerCase().trim();
  return PAYMENT_METHODS.includes(raw) ? raw : 'demo';
}

/* Validate checkout input on the server before trusting anything. */
function validateShipping(s) {
  const shipping = s && typeof s === 'object' ? s : {};
  const errors = [];
  const name = String(shipping.name || '').trim();
  const email = String(shipping.email || '').trim();
  const phone = String(shipping.phone || '').trim();
  const address = [shipping.address, shipping.city, shipping.country]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(', ');
  if (!name) errors.push('A contact name is required.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('A valid contact email is required.');
  if (!phone || !PHONE_RE.test(phone)) errors.push('A valid phone number is required.');
  if (!address) errors.push('A shipping address is required.');
  return { errors, shipping: { name, email, phone, address } };
}

/* Accept both { items: [{ bookId, quantity }] } and the legacy { items: [{ id, qty }] }. */
const normalizeItems = (arr) =>
  (Array.isArray(arr) ? arr : []).map((it) => (it && typeof it === 'object' ? it : {}));

async function create(req, res) {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  /* totalAmount is NEVER trusted from the browser — prices are re-read from the database. */
  const rawItems = normalizeItems(body.items);
  const { errors, shipping } = validateShipping(body.shipping || body.shippingAddress);
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });
  if (!rawItems.length) return res.status(400).json({ error: 'Order is empty.' });

  try {
    const order = await orderService.create(req.user.id, rawItems, {
      shipping,
      paymentMethod: cleanPaymentMethod(body.paymentMethod),
      coupon: String(body.coupon || '').trim()
    });
    res.status(201).json({ order });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
}

async function list(req, res) {
  const orders = await orderService.listForUser(req.user.id);
  res.json({ orders });
}

async function getOne(req, res) {
  const orders = await orderService.listForUser(req.user.id);
  const order = orders.find((o) => o.id === String(req.params.id));
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  res.json({ order });
}

module.exports = { create, list, getOne };