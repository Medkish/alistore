require('dotenv').config();

process.on('unhandledRejection', function (reason) {
  console.error('[unhandledRejection] Keeping the server alive:', reason);
});
process.on('uncaughtException', function (err) {
  console.error('[uncaughtException]', err);
  process.exit(1);
});

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const prisma = require('./lib/prisma');
const routes = require('./routes');
const { apiNotFound, errorHandler } = require('./middleware/error.middleware');

const app = express();

app.set('trust proxy', 1);

/* ---------- Security headers ---------- */
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
    credentials: true
  })
);

/* ---------- Body parsing limits (input validation / DoS guard) ---------- */
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

/* ---------- Rate limiting ---------- */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests - please slow down.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts - try again later.' }
});

app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use('/api', routes);
app.use('/api', apiNotFound);

/* ---------- Static assets ---------- */
const FRONTEND_OUT = path.join(__dirname, '..', '..', 'frontend', 'out');
const FRONTEND_PUBLIC = path.join(__dirname, '..', '..', 'frontend', 'public');
const UPLOADS = path.join(FRONTEND_PUBLIC, 'images');

/* Book covers and uploads are replaced in place under stable filenames
 * (cover-<slug>.jpg), so a long max-age pins stale artwork in the browser for
 * days and no ordinary refresh will pick up a redesign. Revalidate instead:
 * the ETag/Last-Modified pair answers with a bodyless 304, so freshness costs
 * a round trip rather than a re-download. */
const imageStatic = {
  etag: true,
  lastModified: true,
  setHeaders(res) {
    res.setHeader('Cache-Control', 'no-cache');
  },
};

app.use('/images', express.static(UPLOADS, imageStatic));
app.use('/alistore/images', express.static(UPLOADS, imageStatic));

if (fs.existsSync(FRONTEND_OUT)) {
  app.use('/alistore', express.static(FRONTEND_OUT, { extensions: ['html'] }));
  app.get('/', function (req, res) {
    res.redirect('/alistore/');
  });
  // Unknown paths must 404 rather than soft-fall back to the homepage.
  app.get('*', function (req, res) {
    res.status(404).sendFile(path.join(FRONTEND_OUT, '404.html'), function (err) {
      if (err) res.status(404).type('text/plain').send('Not found');
    });
  });
}

app.use(errorHandler);

const PORT = Number(process.env.PORT) || 4000;
const HOST = '0.0.0.0';

prisma
  .$connect()
  .then(function () {
    app.listen(PORT, HOST, () => {
      console.log('AlioStore backend running:');
      console.log(`  API:      http://localhost:${PORT}/api/health`);
      console.log(`  Network:  http://${HOST}:${PORT}/api/health`);
      if (fs.existsSync(FRONTEND_OUT)) {
        console.log(`  Frontend: http://localhost:${PORT}/`);
      }
    });
  })
  .catch(function (err) {
    console.error('Failed to connect to the database.');
    console.error('Check DATABASE_URL in backend/.env');
    console.error(err);
    process.exit(1);
  });