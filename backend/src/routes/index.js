const { Router } = require('express');
const auth = require('./auth.routes');
const books = require('./book.routes');
const categories = require('./category.routes');
const cart = require('./cart.routes');
const orders = require('./orderRoutes');
const payments = require('./paymentRoutes');
const donations = require('./donation.routes');
const campaigns = require('./campaign.routes');
const subscriptions = require('./subscription.routes');
const admin = require('./admin.routes');
const me = require('./me.routes');
const discounts = require('./discount.routes');
const track = require('./track.routes');
const analytics = require('./analytics.routes');
const { getConfig } = require('../controllers/config.controller');
const { getPublicWebsite } = require('../controllers/admin-ext.controller');

const router = Router();

router.use('/auth', auth);
router.use('/books', books);
router.use('/categories', categories);
router.use('/cart', cart);
router.use('/orders', orders);
router.use('/orders', payments);
router.use('/donations', donations);
router.use('/campaigns', campaigns);
router.use('/subscriptions', subscriptions);
router.use('/admin', admin);
router.use('/me', me);
router.use('/discounts', discounts);
router.use('/track', track);
router.use('/analytics', analytics);

router.get('/config', getConfig);
router.get('/website', getPublicWebsite);

router.get('/health', function (req, res) {
  res.json({ ok: true, service: 'AlioStore API', time: new Date().toISOString() });
});

module.exports = router;