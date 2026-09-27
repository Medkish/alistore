const { Router } = require('express');
const ctrl = require('../controllers/analytics.controller');
const { authOptional } = require('../middleware/auth.middleware');
const wrap = require('../utils/async-handler');

const router = Router();

/* Public — no authentication required; visitor id comes from the header.
   When a Bearer token is present, the event is linked to the signed-in user
   so the admin panel can show who viewed / added which books. */
router.post('/events', authOptional, wrap(ctrl.record));

module.exports = router;