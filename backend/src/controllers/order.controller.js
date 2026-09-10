const orderService = require('../services/order.service');

const PHONE_RE = /^[+0-9 ()-]{6,20}$/;

/* Validate checkout input on the server before trusting anything. */
function validateShipping(s) {
  const shipping = s && typeof s === 'object' ? s : {};
  const errors = [];
  const name = String(shipping.name || '').trim();
  const email = String(shipping.email || '').trim();
  const phone = String(shipping.phone || '').trim();
  const address = String(shipping.address || '').trim();
  if (!name) errors.push('A contact name is required.');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('A valid contact email is required.');
  if (!phone || !PHONE_RE.test(phone)) errors.push('A valid phone number is required.');
  if (!address) errors.push('A shipping address is required.');
  return { errors, shipping: { name, email, phone, address } };
}

async function create(req, res) {
  const rawItems = req.body && Array.isArray(req.body.items) ? req.body.items : [];
  const { errors, shipping } = validateShipping(req.body && req.body.shipping);
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });

  try {
    const order = await orderService.create(req.user.id, rawItems, {
      shipping,
      paymentMethod: String((req.body && req.body.paymentMethod) || 'demo').trim() || 'demo'
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