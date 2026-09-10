const { Router } = require('express');
const ctrl = require('../controllers/cart.controller');
const { authRequired } = require('../middleware/auth.middleware');
const wrap = require('../utils/async-handler');

const router = Router();

router.use(authRequired);
router.get('/', wrap(ctrl.getCart));
router.put('/', wrap(ctrl.setCart));

module.exports = router;