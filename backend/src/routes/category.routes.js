const { Router } = require('express');
const ctrl = require('../controllers/book.controller');
const wrap = require('../utils/async-handler');

const router = Router();

router.get('/', wrap(ctrl.listCategories));

module.exports = router;