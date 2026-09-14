const { Router } = require('express');
const admin = require('../controllers/admin.controller');
const ext = require('../controllers/admin-ext.controller');
const { authRequired } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/require-role.middleware');
const { upload } = require('../middleware/upload.middleware');
const wrap = require('../utils/async-handler');

const router = Router();

router.use(authRequired, requireRole('ADMIN'), function (req, res, next) {
  res.set('Cache-Control', 'no-store');
  next();
});

router.get('/stats', wrap(admin.stats));
router.get('/books', wrap(admin.listBooks));
router.post('/books', wrap(admin.createBook));
router.put('/books/:slug', wrap(admin.updateBook));
router.delete('/books/:slug', wrap(admin.deleteBook));
router.post('/upload', upload.single('file'), wrap(admin.uploadCover));

router.get('/orders', wrap(admin.listOrders));
router.patch('/orders/:id/status', wrap(admin.updateOrderStatus));
router.patch('/orders/:id/tracking', wrap(admin.setOrderTracking));
router.patch('/orders/:id/notes', wrap(admin.setOrderNotes));
router.post('/orders/:id/refund', wrap(admin.refundOrder));

router.post('/inventory/adjust', wrap(admin.adjustStock));
router.get('/inventory/history', wrap(admin.stockHistory));

router.get('/users', wrap(admin.listUsers));
router.patch('/users/:id/role', wrap(admin.updateUserRole));
router.patch('/users/:id/block', wrap(admin.blockUser));
router.patch('/users/:id/notes', wrap(admin.setUserNotes));

router.get('/carts', wrap(admin.listCarts));
router.get('/payments', wrap(admin.listPayments));
router.get('/analytics', wrap(admin.analytics));

/* Donations (kept separate from orders — see /api/donations) */
const donationCtrl = require('../controllers/donation.controller');
const campaignCtrl = require('../controllers/campaign.controller');
router.get('/donations', wrap(donationCtrl.list));
router.get('/donations/donors', wrap(donationCtrl.donors));
router.get('/donations/reports', wrap(donationCtrl.reports));
router.get('/donations/refunds', wrap(donationCtrl.refundHistory));
router.patch('/donations/:donationNumber/message', wrap(donationCtrl.setMessageStatus));

/* Campaigns */
router.get('/campaigns', wrap(campaignCtrl.list));
router.get('/campaigns/:id', wrap(campaignCtrl.getById));
router.post('/campaigns', wrap(campaignCtrl.create));
router.put('/campaigns/:id', wrap(campaignCtrl.update));
router.delete('/campaigns/:id', wrap(campaignCtrl.remove));

router.get('/sessions', wrap(admin.listSessions));
router.post('/sessions/:id/revoke', wrap(admin.revokeSession));
router.get('/activity', wrap(admin.activity));

router.get('/categories', wrap(admin.listCategories));
router.post('/categories', wrap(admin.createCategory));
router.put('/categories/:slug', wrap(admin.updateCategory));
router.patch('/categories/:slug/toggle', wrap(admin.toggleCategory));
router.delete('/categories/:slug', wrap(admin.deleteCategory));

router.get('/discounts', wrap(admin.listDiscounts));
router.post('/discounts', wrap(admin.createDiscount));
router.patch('/discounts/:id', wrap(admin.updateDiscount));
router.delete('/discounts/:id', wrap(admin.deleteDiscount));

router.get('/reviews', wrap(admin.listReviews));
router.patch('/reviews/:id', wrap(admin.moderateReview));
router.delete('/reviews/:id', wrap(admin.deleteReview));

/* Shipping */
router.get('/shipping', wrap(ext.listShipping));
router.post('/shipping/methods', wrap(ext.createShippingMethod));
router.put('/shipping/methods/:id', wrap(ext.updateShippingMethod));
router.delete('/shipping/methods/:id', wrap(ext.deleteShippingMethod));
router.post('/shipping/zones', wrap(ext.createShippingZone));
router.put('/shipping/zones/:id', wrap(ext.updateShippingZone));
router.delete('/shipping/zones/:id', wrap(ext.deleteShippingZone));
router.patch('/shipping/providers/:id', wrap(ext.setProvider));

/* Website content */
router.get('/website', wrap(ext.getWebsite));
router.put('/website', wrap(ext.updateWebsite));

/* Broadcast notifications */
router.get('/notifications', wrap(ext.listBroadcasts));
router.post('/notifications', wrap(ext.createBroadcast));
router.patch('/notifications/:id', wrap(ext.updateBroadcast));
router.delete('/notifications/:id', wrap(ext.deleteBroadcast));

/* Admin users & permissions */
router.get('/team', wrap(ext.listTeam));
router.post('/team', wrap(ext.createTeam));
router.put('/team/:id', wrap(ext.updateTeam));
router.delete('/team/:id', wrap(ext.deleteTeam));
router.get('/activity/logs', wrap(ext.listActivityLogs));

/* Store settings */
router.get('/settings', wrap(ext.getSettings));
router.put('/settings', wrap(ext.updateSettings));

/* System & developer tools */
router.get('/system', wrap(ext.systemStatus));
router.post('/system/backup', wrap(ext.createBackup));
router.post('/system/cache/clear', wrap(ext.clearCache));

module.exports = router;