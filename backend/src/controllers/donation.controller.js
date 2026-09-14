const donationService = require('../services/donation.service');

async function create(req, res) {
  const body = req.body || {};
  const result = await donationService.create(
    {
      amount: body.amount,
      method: body.method,
      name: body.name,
      email: body.email,
      anonymous: body.anonymous,
      provider: body.provider,
      message: body.message,
      purpose: body.purpose,
      coverFees: body.coverFees,
      recurring: body.recurring,
      campaignId: body.campaignId,
      showOnWall: body.showOnWall,
      country: body.country
    },
    req.user || null
  );
  res.json(result);
}

/* Server-side payment confirmation — stands in for the provider webhook. */
async function payDemo(req, res) {
  const result = await donationService.confirmDemoPayment(String(req.params.id), req.user ? req.user.id : null);
  res.json({ donation: result });
}

async function list(req, res) {
  const q = req.query || {};
  const result = await donationService.list({
    status: q.status,
    search: q.search,
    from: q.from,
    to: q.to,
    minAmount: q.minAmount,
    maxAmount: q.maxAmount,
    campaignId: q.campaignId,
    method: q.method,
    recurring: q.recurring,
    anonymous: q.anonymous,
    country: q.country,
    page: q.page,
    pageSize: q.pageSize
  });
  res.json(result);
}

async function refund(req, res) {
  const result = await donationService.refund({
    donationNumber: req.params && req.params.donationNumber,
    reason: req.body && req.body.reason,
    actorId: req.user ? req.user.id : null,
    actorName: req.user ? req.user.name || 'Admin' : 'Admin'
  });
  res.json({ donation: result });
}

async function refundHistory(req, res) {
  const result = await donationService.refundHistory({ limit: req.query && req.query.limit });
  res.json({ refunds: result });
}

async function summary(req, res) {
  res.json(await donationService.summary());
}

async function supporters(req, res) {
  res.json(await donationService.supporters());
}

async function donors(req, res) {
  const q = req.query || {};
  res.json({ donors: await donationService.donors({ search: q.search, sort: q.sort }) });
}

async function reports(req, res) {
  res.json(await donationService.reports());
}

async function listForUser(req, res) {
  res.json({ donations: await donationService.listForUser(req.user.id) });
}

async function getOwned(req, res) {
  res.json({ donation: await donationService.getOwned(String(req.params.id), req.user.id) });
}

async function updateDonor(req, res) {
  const result = await donationService.updateDonor(String(req.params.id), req.user.id, req.body || {});
  res.json({ donation: result });
}

async function setRecurring(req, res) {
  const result = await donationService.setRecurring(
    String(req.params.id),
    req.user.id,
    Boolean(req.body && req.body.recurring)
  );
  res.json({ donation: result });
}

async function receipt(req, res) {
  const result = await donationService.receipt(String(req.params.id), req.user.id);
  res.json({ donation: result });
}

async function emailReceipt(req, res) {
  const result = await donationService.emailReceipt(String(req.params.id), req.user.id);
  res.json(result);
}

async function setMessageStatus(req, res) {
  const result = await donationService.setMessageStatus(
    String(req.params.donationNumber),
    req.body && req.body.messageStatus,
    req.user ? req.user.name || 'Admin' : 'Admin'
  );
  res.json({ donation: result });
}

async function publicSettings(req, res) {
  res.json({ settings: donationService.adminDonationSettings() });
}

module.exports = {
  create,
  payDemo,
  list,
  refund,
  refundHistory,
  summary,
  supporters,
  donors,
  reports,
  listForUser,
  getOwned,
  updateDonor,
  setRecurring,
  receipt,
  emailReceipt,
  setMessageStatus,
  publicSettings
};