const express = require('express');
const authRoute = express.Router();

const { bodyValidator } = require('../../middleware/validator.middleware');
const { registerDTO, loginDTO } = require('./auth.dto');
const { setPath, uploader } = require('../../middleware/uploader.middleware');
const authCtrl = require('./auth.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const allowRole = require('../../middleware/rbac.middleware');

authRoute.post('/register', setPath('users'), uploader.single('image'), bodyValidator(registerDTO), authCtrl.register);
authRoute.post('/verify-email-otp', authCtrl.verifyEmailOtp);
authRoute.post('/resend-otp', authCtrl.resendOtp);
authRoute.post('/login', bodyValidator(loginDTO), authCtrl.login);
authRoute.get('/profile', authMiddleware, authCtrl.getLoggedIn);
authRoute.put('/profile', authMiddleware, authCtrl.updateProfile);

// Admin-only routes
authRoute.get('/admin', authMiddleware, allowRole('admin'), authCtrl.getadminAccess);
authRoute.get('/admin/users', authMiddleware, allowRole('admin'), authCtrl.getAllUsers);
authRoute.put('/admin/users/:id/status', authMiddleware, allowRole('admin'), authCtrl.updateUserStatus);
authRoute.put('/admin/users/:id', authMiddleware, allowRole('admin'), authCtrl.updateUser);
authRoute.get('/admin/users/:id', authMiddleware, allowRole('admin'), authCtrl.getUserById);
authRoute.delete('/admin/users/:id', authMiddleware, allowRole('admin'), authCtrl.deleteUser);
authRoute.post('/admin/create', authMiddleware, allowRole('admin'), authCtrl.createAdmin);
// ...existing code...
authRoute.post('/forgot-password', authCtrl.forgotPassword);
authRoute.post('/reset-password', authCtrl.resetPassword);
// ...existing code...

module.exports = authRoute; 