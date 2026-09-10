const prisma = require('../lib/prisma');

async function getCart(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { cart: true } });
  return user && user.cart ? user.cart : [];
}

async function setCart(userId, items) {
  const safe = Array.isArray(items) ? items : [];
  await prisma.user.update({ where: { id: userId }, data: { cart: safe } });
  return safe;
}

module.exports = { getCart, setCart };