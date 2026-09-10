const { Router } = require('express');
const ctrl = require('../controllers/discount.controller');
const wrap = require('../utils/async-handler');

const router = Router();

router.get('/:code/validate', wrap(ctrl.validate));

module.exports = router;