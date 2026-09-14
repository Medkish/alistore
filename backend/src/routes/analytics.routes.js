const { Router } = require('express');
const ctrl = require('../controllers/analytics.controller');
const wrap = require('../utils/async-handler');

const router = Router();

/* Public — no authentication required; visitor id comes from the header. */
router.post('/events', wrap(ctrl.record));

module.exports = router;