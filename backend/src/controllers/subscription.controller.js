const subscriptionService = require('../services/subscription.service');

async function create(req, res) {
  const body = req.body || {};
  const result = await subscriptionService.create(
    { plan: body.plan, period: body.period, nextBilling: body.nextBilling },
    req.user || null
  );
  res.json(result);
}

module.exports = { create };