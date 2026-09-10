const { Router } = require('express');
const admin = require('../controllers/admin.controller');
const { authRequired } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/require-role.middleware');
const { upload } = require('../middleware/upload.middleware');

const router = Router();

router.use(authRequired, requireRole('ADMIN'), function (req, res, next) {
  res.set('Cache-Control', 'no-store');
  next();
});

router.get('/stats', admin.stats);
router.get('/books', admin.listBooks);
router.post('/books', admin.createBook);
router.put('/books/:slug', admin.updateBook);
router.delete('/books/:slug', admin.deleteBook);
router.post('/upload', upload.single('file'), admin.uploadCover);

router.get('/orders', admin.listOrders);
router.patch('/orders/:id/status', admin.updateOrderStatus);

router.get('/users', admin.listUsers);

module.exports = router;