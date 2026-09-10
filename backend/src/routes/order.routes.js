const { Router } = require('express');
const ctrl = require('../controllers/order.controller');
const { authRequired } = require('../middleware/auth.middleware');
const wrap = require('../utils/async-handler');

const router = Router();

router.use(authRequired);
router.post('/', wrap(ctrl.create));
router.get('/', wrap(ctrl.list));
router.get('/:id', wrap(ctrl.getOne));

module.exports = router;