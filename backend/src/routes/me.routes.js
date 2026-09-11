const { Router } = require('express');
const me = require('../controllers/me.controller');
const wrap = require('../utils/async-handler');
const { authRequired } = require('../middleware/auth.middleware');

const router = Router();

router.use(authRequired);

router.get('/notifications', wrap(me.notifications));
router.post('/notifications/read', wrap(me.markRead));
router.put('/profile', wrap(me.profile));
router.post('/password', wrap(me.password));

module.exports = router;