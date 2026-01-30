const auth = require('../../middleware/auth.middleware');
const electricPaymentCtrl = require('./electricPayment.controller');

const electricPaymentRoute = require('express').Router();

electricPaymentRoute.post("/electric-bluebook/:id", auth, electricPaymentCtrl.payElectricTax)
electricPaymentRoute.post("/initiate-khalti", auth, electricPaymentCtrl.initiateKhaltiPayment)
electricPaymentRoute.post("/verify/:id", auth, electricPaymentCtrl.verifyElectricTransaction)
electricPaymentRoute.post("/verify-otp", auth, electricPaymentCtrl.verifyElectricOtp)

// Demo payment completion endpoint (for testing only)
electricPaymentRoute.post("/demo/complete", electricPaymentCtrl.completeDemoElectricPayment)

module.exports = electricPaymentRoute 