function getConfig(req, res) {
  res.json({
    payment: { provider: 'demo' },
    storage: { provider: process.env.STORAGE_PROVIDER || 'local' },
    currency: 'AED',
    version: '2.0.0'
  });
}

module.exports = { getConfig };