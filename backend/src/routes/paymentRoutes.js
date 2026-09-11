const { Router } = require('express');
const ctrl = require('../controllers/payment.controller');
const { authRequired } = require('../middleware/auth.middleware');
const wrap = require('../utils/async-handler');

/*
 * Payment API
 *
 * POST /api/orders/:id/payments/demo
 *   Simulated payment confirmation (stands in for a provider webhook). Called
 *   after the customer "pays"; moves the PENDING order to PAID server-side.
 */
const router = Router();

router.use(authRequired);
router.post('/:id/payments/demo', wrap(ctrl.payDemo));

module.exports = router;