const paymentService = require('../services/payment.service');

/* Simulated payment confirmation endpoint — replaces the provider webhook.
   Verifies the order belongs to the caller, then moves PENDING -> PAID and
   records the payment reference. A real provider webhook will later call the
   same service path (with signature verification instead of a user session). */
async function payDemo(req, res) {
  const order = await paymentService.confirmDemoPayment(String(req.params.id), req.user.id);
  res.json({ order });
}

module.exports = { payDemo };