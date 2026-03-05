const express = require('express');
const kycRoute = express.Router();
const authMiddleware = require('../../middleware/auth.middleware');
const allowRole = require('../../middleware/rbac.middleware');
const { uploader, setPath } = require('../../middleware/uploader.middleware');
const kycCtrl = require('./kyc.controller');

// User routes
kycRoute.post('/submit', authMiddleware, setPath('kyc'), uploader.fields([
    { name: 'frontImage', maxCount: 1 },
    { name: 'backImage', maxCount: 1 }
]), kycCtrl.submitKyc);

// Update KYC details (resets status to pending)
kycRoute.put('/update', authMiddleware, setPath('kyc'), uploader.fields([
    { name: 'frontImage', maxCount: 1 },
    { name: 'backImage', maxCount: 1 }
]), kycCtrl.updateKyc);

kycRoute.get('/my-kyc', authMiddleware, kycCtrl.getMyKyc);

// Admin routes
kycRoute.get('/admin/users', authMiddleware, allowRole('admin'), kycCtrl.getAllUsersKyc);
kycRoute.get('/admin/users/:userId', authMiddleware, allowRole('admin'), kycCtrl.getUserKyc);
kycRoute.post('/admin/users/:userId/approve', authMiddleware, allowRole('admin'), kycCtrl.approveKyc);
kycRoute.post('/admin/users/:userId/reject', authMiddleware, allowRole('admin'), kycCtrl.rejectKyc);

module.exports = kycRoute;
