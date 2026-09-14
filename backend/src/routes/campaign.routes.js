const { Router } = require('express');
const ctrl = require('../controllers/campaign.controller');
const wrap = require('../utils/async-handler');

/*
 * Public campaigns API.
 *
 * GET /api/campaigns        active campaigns with live progress
 * GET /api/campaigns/:slug  single active campaign
 */
const router = Router();

router.get('/', wrap(ctrl.list));
router.get('/:slug', wrap(ctrl.getBySlug));

module.exports = router;