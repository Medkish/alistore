const prisma = require('../lib/prisma');
const orderService = require('./order.service');
const notificationsService = require('./notifications.service');

/* Simulated payment confirmation — stands in for the provider webhook that will
   update the order to PAID after a real payment is verified.

   Server-side only: the payment outcome the customer sees in the browser is
   never trusted. The provider (or in this demo, this endpoint) decides the
   result, and the order is only moved to PAID here. A real provider should call
   the same update via an authenticated webhook with signature verification. */
async function confirmDemoPayment(orderId, userId) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    const err = new Error('Order not found.');
    err.status = 404;
    throw err;
  }
  if (order.userId !== userId) {
    const err = new Error('You can only pay for your own orders.');
    err.status = 403;
    throw err;
  }
  /* Idempotent — a duplicate webhook/confirmation must never double-process. */
  if (order.status === 'PAID') return orderService.serializeOrder(order, true);

  const paid = await orderService.updateStatus(orderId, 'PAID', userId);
  await notificationsService.create(
    userId,
    'payment_received',
    'Payment received',
    'We received the payment for order ' + order.reference + '.',
  );
  return paid;
}

module.exports = { confirmDemoPayment };