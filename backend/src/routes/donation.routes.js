const { Router } = require('express');
const ctrl = require('../controllers/donation.controller');
const { authOptional, authRequired } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/require-role.middleware');
const wrap = require('../utils/async-handler');

/*
 * Donation API  (kept fully separate from orders/shipping/inventory)
 *
 * Public:
 *   POST /api/donations                create a PENDING donation
 *   POST /api/donations/:id/payments/demo  server-side payment confirmation (webhook stand-in)
 *   GET  /api/donations/settings       public donation config (amounts, toggles)
 *   GET  /api/donations/summary        aggregate progress (no donor data)
 *   GET  /api/donations/supporters     public donor wall
 *
 * Donor account (auth required):
 *   GET   /api/donations/mine          my donation history
 *   GET   /api/donations/:id           view my donation
 *   GET   /api/donations/:id/receipt   receipt data
 *   PATCH /api/donations/:id           update donor info
 *   PATCH /api/donations/:id/recurring cancel/restart monthly donation
 *
 * Admin (role required):
 *   GET   /api/donations               wide list + filters + stats
 *   PATCH /api/donations/:donationNumber/refund  refund + audit record
 */
const router = Router();

router.post('/', authOptional, wrap(ctrl.create));
router.post('/:id/payments/demo', authOptional, wrap(ctrl.payDemo));

router.get('/settings', wrap(ctrl.publicSettings));
router.get('/summary', wrap(ctrl.summary));
router.get('/supporters', wrap(ctrl.supporters));

router.get('/mine', authRequired, wrap(ctrl.listForUser));
router.post('/:id/receipts/email', authRequired, wrap(ctrl.emailReceipt));
router.get('/:id/receipt', authRequired, wrap(ctrl.receipt));
router.patch('/:id/recurring', authRequired, wrap(ctrl.setRecurring));
router.patch('/:id', authRequired, wrap(ctrl.updateDonor));
router.get('/:id', authRequired, wrap(ctrl.getOwned));

router.get('/', authRequired, requireRole('ADMIN'), wrap(ctrl.list));
router.patch('/:donationNumber/refund', authRequired, requireRole('ADMIN'), wrap(ctrl.refund));

module.exports = router;