const orderService = require('../services/order.service');

async function track(req, res) {
  const reference = String(req.params.reference || '').trim();
  if (!reference) return res.status(400).json({ error: 'Order reference is required.' });
  const order = await orderService.getByReference(reference);
  if (!order) return res.status(404).json({ error: 'No order found for that reference.' });
  res.json({ order });
}

module.exports = { track };