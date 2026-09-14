const analyticsService = require('../services/analytics.service');

async function record(req, res) {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const visitorId = String(req.headers['x-visitor-id'] || body.visitorId || '').trim();
  if (!visitorId) return res.status(400).json({ error: 'Missing visitor id.' });
  try {
    await analyticsService.recordEvent(
      { event: body.event, path: body.path, referrer: body.referrer, bookId: body.bookId, visitorId },
      { userAgent: req.headers['user-agent'] || '', userId: req.user?.id, ip: req.ip || '' }
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = { record };