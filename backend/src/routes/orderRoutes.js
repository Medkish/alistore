const { Router } = require('express');
const ctrl = require('../controllers/order.controller');
const { authRequired } = require('../middleware/auth.middleware');
const wrap = require('../utils/async-handler');

/*
 * Order API
 *
 * POST /api/orders
 *   Receive checkout -> validate customer -> validate books -> check stock
 *   -> get prices from DB -> calculate total (never trust the browser)
 *   -> create Order + OrderItems (price snapshot) -> reduce stock -> return order id
 *
 * Example request:
 *   {
 *     "items": [ { "bookId": "book-123", "quantity": 1 } ],
 *     "shippingAddress": { "name": "Mohamed", "phone": "0500000000", "address": "Dubai", "city": "Dubai", "country": "UAE" }
 *   }
 */
const router = Router();

router.use(authRequired);
router.post('/', wrap(ctrl.create));
router.get('/', wrap(ctrl.list));
router.get('/:id', wrap(ctrl.getOne));

module.exports = router;