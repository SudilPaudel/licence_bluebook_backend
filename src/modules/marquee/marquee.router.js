const express = require('express');
const router = express.Router();
const { getMarquee, updateMarquee } = require('./marquee.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const allowRole = require('../../middleware/rbac.middleware');

// Public: Get marquee text
router.get('/', getMarquee);

// Admin: Update marquee text
router.put('/', authMiddleware, allowRole('admin'), updateMarquee);

module.exports = router; 