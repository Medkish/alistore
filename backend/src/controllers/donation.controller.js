const donationService = require('../services/donation.service');

async function create(req, res) {
  const body = req.body || {};
  const result = await donationService.create(
    { amount: body.amount, method: body.method },
    req.user || null
  );
  res.json(result);
}

module.exports = { create };