const { Router } = require('express');
const auth = require('./auth.routes');
const books = require('./book.routes');
const categories = require('./category.routes');
const cart = require('./cart.routes');
const orders = require('./orderRoutes');
const donations = require('./donation.routes');
const subscriptions = require('./subscription.routes');
const admin = require('./admin.routes');
const me = require('./me.routes');
const discounts = require('./discount.routes');
const { getConfig } = require('../controllers/config.controller');

const router = Router();

router.use('/auth', auth);
router.use('/books', books);
router.use('/categories', categories);
router.use('/cart', cart);
router.use('/orders', orders);
router.use('/donations', donations);
router.use('/subscriptions', subscriptions);
router.use('/admin', admin);
router.use('/me', me);
router.use('/discounts', discounts);

router.get('/config', getConfig);

router.get('/health', function (req, res) {
  res.json({ ok: true, service: 'AlioStore API', time: new Date().toISOString() });
});

module.exports = router;