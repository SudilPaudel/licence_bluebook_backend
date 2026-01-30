const express = require('express');
const mainRouter = express.Router();


const authRouter = require('../modules/auth/auth.router');
const blueBookRouter = require('../modules/Bluebook/bluebook.router');
const adminRouter = require('../modules/admin/admin.router');
const paymentRouter = require('../modules/payment/payment.router');
const electricPaymentRouter = require('../modules/ElectricPayment/electricPayment.router');
const newsRouter = require('../modules/news/news.router');
const marqueeRouter = require('../modules/marquee/marquee.router');
const electricBlueBookRouter = require('../modules/ElectricBluebook/electricBluebook.router');

mainRouter.use('/auth', authRouter);
mainRouter.use('/bluebook', blueBookRouter);
mainRouter.use('/electric-bluebook', electricBlueBookRouter);
mainRouter.use('/admin', adminRouter);
mainRouter.use('/payment', paymentRouter);
mainRouter.use('/electric-payment', electricPaymentRouter);
mainRouter.use('/news', newsRouter);
mainRouter.use('/marquee', marqueeRouter);

// Serve React app for payment verification route
mainRouter.get("/payment-verification/:id", (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const { id } = req.params;
  const { pidx } = req.query;
  
  // Redirect to dashboard with payment verification parameters
  const redirectUrl = pidx 
    ? `${frontendUrl}/dashboard?payment_verification=true&id=${id}&pidx=${pidx}`
    : `${frontendUrl}/dashboard?payment_verification=true&id=${id}`;
  
  res.redirect(redirectUrl);
});

// Serve React app for electric payment verification route
mainRouter.get("/electric-payment-verification/:id", (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const { id } = req.params;
  const { pidx } = req.query;
  
  // Redirect to dashboard with electric payment verification parameters
  const redirectUrl = pidx 
    ? `${frontendUrl}/dashboard?electric_payment_verification=true&id=${id}&pidx=${pidx}`
    : `${frontendUrl}/dashboard?electric_payment_verification=true&id=${id}`;
  
  res.redirect(redirectUrl);
});

module.exports = mainRouter;
