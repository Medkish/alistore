const { Router } = require('express');
const ctrl = require('../controllers/auth.controller');
const { authRequired } = require('../middleware/auth.middleware');
const wrap = require('../utils/async-handler');

const router = Router();

router.post('/register', wrap(ctrl.register));
router.post('/login', wrap(ctrl.login));
router.get('/me', authRequired, ctrl.me);
router.post('/logout', authRequired, wrap(ctrl.logout));

module.exports = router;