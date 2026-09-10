function notFound(req, res) {
  res.status(404).json({ error: 'Not found' });
}

function apiNotFound(req, res) {
  res.status(404).json({ error: 'API route not found' });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  console.error('[error]', err);
  const status = err.status || err.statusCode || 500;
  if (status >= 500) {
    return res.status(status).json({ error: 'Internal server error' });
  }
  res.status(status).json({ error: err.message || 'Request failed' });
}

module.exports = { notFound, apiNotFound, errorHandler };