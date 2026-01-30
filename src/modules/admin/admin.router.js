const express = require('express');
const adminRoute = express.Router();
const authMiddleware = require('../../middleware/auth.middleware');
const allowRole = require('../../middleware/rbac.middleware');
const adminCtrl = require('./admin.controller');

// Admin-only routes
adminRoute.get('/reports/:type', authMiddleware, allowRole('admin'), adminCtrl.generateReport);
adminRoute.get('/payments', authMiddleware, allowRole('admin'), adminCtrl.getAllPayments);
adminRoute.get('/payment-receipt/:paymentId', authMiddleware, allowRole('admin'), adminCtrl.getPaymentReceipt);
adminRoute.get('/system-stats', authMiddleware, allowRole('admin'), adminCtrl.getSystemStats);

// User management routes
adminRoute.get('/users', authMiddleware, allowRole('admin'), adminCtrl.getAllUsers);
adminRoute.put('/users/:id', authMiddleware, allowRole('admin'), adminCtrl.updateUser);
adminRoute.delete('/users/:id', authMiddleware, allowRole('admin'), adminCtrl.deleteUser);
adminRoute.patch('/users/:id/toggle-status', authMiddleware, allowRole('admin'), adminCtrl.toggleUserStatus);

module.exports = adminRoute; 