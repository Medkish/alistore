const cartService = require('../services/cart.service');

async function getCart(req, res) {
  const items = await cartService.getCart(req.user.id);
  res.json({ items });
}

async function setCart(req, res) {
  const items = (req.body && Array.isArray(req.body.items)) ? req.body.items : [];
  const saved = await cartService.setCart(req.user.id, items);
  res.json({ items: saved });
}

module.exports = { getCart, setCart };