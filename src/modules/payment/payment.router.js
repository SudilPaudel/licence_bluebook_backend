const auth = require('../../middleware/auth.middleware');
const paymentCtrl = require('./payment.controller');

const paymentRoute = require('express').Router();

paymentRoute.post("/bluebook/:id", auth, paymentCtrl.payTax)
paymentRoute.post("/verify/:id",auth, paymentCtrl.verifyTransaction)
paymentRoute.post("/verify-otp", auth, paymentCtrl.verifyOtp)

// Demo payment completion endpoint (for testing only)
paymentRoute.post("/demo/complete", paymentCtrl.completeDemoPayment)

module.exports = paymentRoute