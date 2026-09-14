const campaignService = require('../services/campaign.service');

async function list(req, res) {
  res.json({ campaigns: await campaignService.list({ includeInactive: Boolean(req.query && req.query.all) }) });
}

async function getBySlug(req, res) {
  res.json({ campaign: await campaignService.getBySlug(String(req.params.slug)) });
}

async function getById(req, res) {
  res.json({ campaign: await campaignService.getById(String(req.params.id)) });
}

async function create(req, res) {
  res.json({ campaign: await campaignService.create(req.body || {}) });
}

async function update(req, res) {
  res.json({ campaign: await campaignService.update(String(req.params.id), req.body || {}) });
}

async function remove(req, res) {
  res.json(await campaignService.remove(String(req.params.id)));
}

module.exports = { list, getBySlug, getById, create, update, remove };