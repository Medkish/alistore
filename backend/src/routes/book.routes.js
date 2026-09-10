const { Router } = require('express');
const ctrl = require('../controllers/book.controller');
const content = require('../controllers/content.controller');
const reviews = require('../controllers/review.controller');
const wrap = require('../utils/async-handler');
const { authRequired, authOptional } = require('../middleware/auth.middleware');

const router = Router();

router.get('/', wrap(ctrl.list));
router.get('/categories', wrap(ctrl.listCategories));
router.get('/:slug/sample', wrap(content.sample));
router.get('/:slug/access', authOptional, wrap(content.access));
router.get('/:slug/content', authRequired, wrap(content.content));
router.get('/:slug/reviews', authOptional, wrap(reviews.list));
router.post('/:slug/reviews', authRequired, wrap(reviews.create));
router.get('/:slug', wrap(ctrl.get));

module.exports = router;