const { Router } = require('express');
const ctrl = require('../controllers/track.controller');
const wrap = require('../utils/async-handler');

const router = Router();

router.get('/:reference', wrap(ctrl.track));

module.exports = router;