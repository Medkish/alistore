const { Router } = require('express');
const ctrl = require('../controllers/donation.controller');
const { authOptional } = require('../middleware/auth.middleware');
const wrap = require('../utils/async-handler');

const router = Router();

router.post('/', authOptional, wrap(ctrl.create));

module.exports = router;