const bluebookCtrl = require("../Bluebook/bluebook.controller");
const BluebookModel = require("../Bluebook/bluebook.model");
const bluebookSvc = require("../Bluebook/bluebook.service");
const TaxModel = require("../Tax/tax.model");
const PaymentModel = require("./payment.model");
const axios = require("axios");
const mailSvc = require("../../services/mail.service");
const crypto = require("crypto");
const { calculatePetrolTax } = require("../../utils/algorithm");
const { buildPaymentOtpEmail } = require("../../utils/emailTemplates");

require("dotenv").config();

// Demo payment simulation for testing
class DemoPaymentService {
  constructor() {
    this.payments = new Map();
  }

  async initiatePayment(paymentData) {
    let pidx = "";

    this.payments.set(pidx, {
      ...paymentData,
      pidx,
      status: "Pending",
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });

    return {
      pidx,
      payment_url: `https://test-pay.khalti.com/?pidx=${pidx}`,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      status: "Pending",
    };
  }

  async lookupPayment(pidx) {
    const payment = this.payments.get(pidx);
    if (!payment) {
      throw new Error("Payment not found");
    }

    return {
      pidx: payment.pidx,
      status: payment.status,
      total_amount: payment.amount,
      transaction_id:
        payment.status === "Completed" ? `TXN_${Date.now()}` : null,
      fee: 0,
      refunded: false,
    };
  }

  async completePayment(pidx) {
    const payment = this.payments.get(pidx);
    if (payment) {
      payment.status = "Completed";
      payment.completed_at = new Date().toISOString();
      this.payments.set(pidx, payment);
    }
  }
}

// Global demo payment service instance
const demoPaymentService = new DemoPaymentService();

class PaymentController {
  // Handles tax payment initiation for a bluebook.
  // Calculates tax, checks vehicle type and age, applies fines if overdue, and initiates payment via Khalti or demo mode.
  // Sends OTP to user's email and returns payment details and payment URL.
  payTax = async (req, res, next) => {
    try {
      const id = req.params.id;
      //fetch bluebook data
      const bluebookData = await bluebookSvc.findOneBluebook({
        _id: id,
      });
      //bluebook ko status pennding vaye
      if (bluebookData.status !== "verified") {
        res.status(400).json({
          message:
            "Your bluebook is not verified yet. Please wait for admin verification before making payment.",
          meta: null,
        });
        return;
      }

      const { paymentMethod } = req.body;
      const { baseTax, renewalCharge, fineAmount, oldVehicleTax, totalTaxAmount, daysLeft } = calculatePetrolTax(bluebookData);

      let data;

      // Check for existing pending payments for this user and bluebook
      const existingPayment = await PaymentModel.findOne({
        userId: req.authUser._id,
        paymentStatus: "pending",
        status: "pending",
      }).sort({ createdAt: -1 });

      if (existingPayment) {
        // If there's a recent pending payment (within last 5 minutes), return it
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (existingPayment.createdAt > fiveMinutesAgo) {
          return res.status(400).json({
            message:
              "You already have a payment in progress. Please complete the existing payment or wait 5 minutes before trying again.",
            meta: null,
          });
        }
      }

      // Create payment data object but don't save to database yet
      const paymentDataObj = {
        paymentMethod: paymentMethod,
        createdBy: req.authUser._id,
        userId: req.authUser._id,
        amount: 0, // Will be updated after calculation
        pidx: null, // Will be updated after Khalti response
      };
      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      paymentDataObj.otp = otp;
      paymentDataObj.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

      if (daysLeft < 30 && daysLeft > 1) {
        const TaxData = await TaxModel.create({
          baseTax,
          renewalCharge,
          oldVehicleTax: oldVehicleTax || 0,
          TotalTaxAmount: totalTaxAmount,
        });

        let KhaltiPaymentResponse;

        if (paymentDataObj.paymentMethod === "khalti") {
          const frontendOrigin = req.headers.origin || req.headers.referer?.replace(/\/$/, '') || (process.env.FRONTEND_URL || "http://localhost:5173");
          data = {
            return_url: `${
              process.env.BACKEND_URL || "http://localhost:9005"
            }/payment-verification/${id}?frontendUrl=${encodeURIComponent(frontendOrigin)}`,
            purchase_order_id: TaxData._id,
            amount: totalTaxAmount * 100, //Khalti dont accept in rupee so convert it to paisa
            website_url: frontendOrigin,
            purchase_order_name: `Bluebook-Tax-${TaxData._id}`,
          };
        }

        // Check if we should use demo mode
        const useDemoMode =
          process.env.USE_DEMO_PAYMENT === "true" ||
          !process.env.KHALTI_SECRET_KEY ||
          process.env.KHALTI_SECRET_KEY ===
            "test_secret_key_583b0022d828403aa655b2ed39ccaed7";

        if (useDemoMode) {
          console.log("🎭 Using Demo Payment Mode");
          const response = await axios.post(
            `${khaltiBaseUrl}/epayment/initiate/`,
            data,
            {
              headers: {
                Authorization: `key ${khaltiSecretKey}`,
                "Content-Type": "application/json",
              },
            }
          );
          KhaltiPaymentResponse = response.data;
        } else {
          // Use real Khalti API
          const khaltiSecretKey = process.env.KHALTI_SECRET_KEY;
          const khaltiBaseUrl =
            process.env.KHALTI_BASE_URL || "https://dev.khalti.com/api/v2";

          const response = await axios.post(
            `${khaltiBaseUrl}/epayment/initiate/`,
            data,
            {
              headers: {
                Authorization: `key ${khaltiSecretKey}`,
                "Content-Type": "application/json",
              },
            }
          );
          KhaltiPaymentResponse = response.data;
        }

        // Now create the payment record with the pidx
        paymentDataObj.pidx = KhaltiPaymentResponse.pidx;
        paymentDataObj.amount = totalTaxAmount;
        const paymentData = await PaymentModel.create(paymentDataObj);

        // Send OTP email (only if email service is configured)
        if (
          process.env.SMTP_HOST &&
          process.env.SMTP_USER &&
          process.env.SMTP_PASSWORD
        ) {
          try {
            await mailSvc.sendEmail(
              req.authUser.email,
              "Your OTP for Bluebook Payment",
              buildPaymentOtpEmail({
                userName: req.authUser.name,
                otp,
                validMinutes: 5,
                vehicleCategory: "petrol",
              })
            );
          } catch (err) {
            console.error("Failed to send OTP email:", err);
            // Don't fail the payment if email fails
          }
        }

        res.status(200).json({
          result: {
            paymentData,
            TaxData,
            KhaltiPaymentResponse,
          },
          payment: {
            paymentURl: KhaltiPaymentResponse.payment_url,
            expiresAt: KhaltiPaymentResponse.expires_at,
          },
          message: "Payment Initiated successfully",
          meta: null,
        });
      } else if (daysLeft < 1) {
        const TaxData = await TaxModel.create({
          baseTax,
          renewalCharge,
          fineAmount,
          oldVehicleTax,
          TotalTaxAmount: totalTaxAmount,
        });

        if (paymentDataObj.paymentMethod === "khalti") {
          const frontendOrigin = req.headers.origin || req.headers.referer?.replace(/\/$/, '') || (process.env.FRONTEND_URL || "http://localhost:5173");
          data = {
            return_url: `${
              process.env.BACKEND_URL || "http://localhost:9005"
            }/payment-verification/${id}?frontendUrl=${encodeURIComponent(frontendOrigin)}`,
            purchase_order_id: TaxData._id,
            amount: totalTaxAmount * 100, //Khalti dont accept in rupee so convert it to paisa
            website_url: frontendOrigin,
            purchase_order_name: `Bluebook-Tax-${TaxData._id}`,
          };
        }

        // Check if we should use demo mode
        const useDemoMode =
          process.env.USE_DEMO_PAYMENT === "true" ||
          !process.env.KHALTI_SECRET_KEY ||
          process.env.KHALTI_SECRET_KEY ===
            "test_secret_key_583b0022d828403aa655b2ed39ccaed7";

        let KhaltiPaymentResponse;

        if (useDemoMode) {
          console.log("🎭 Using Demo Payment Mode");
          KhaltiPaymentResponse = await demoPaymentService.initiatePayment(
            data
          );
        } else {
          // Use real Khalti API
          const khaltiSecretKey = process.env.KHALTI_SECRET_KEY;
          const khaltiBaseUrl =
            process.env.KHALTI_BASE_URL || "https://a.khalti.com/api/v2";

          const response = await axios.post(
            `${khaltiBaseUrl}/epayment/initiate/`,
            data,
            {
              headers: {
                Authorization: `key ${khaltiSecretKey}`,
                "Content-Type": "application/json",
              },
            }
          );
          KhaltiPaymentResponse = response.data;
        }

        // Now create the payment record with the pidx
        paymentDataObj.pidx = KhaltiPaymentResponse.pidx;
        paymentDataObj.amount = totalTaxAmount;
        const paymentData = await PaymentModel.create(paymentDataObj);

        // Send OTP email (only if email service is configured)
        if (
          process.env.SMTP_HOST &&
          process.env.SMTP_USER &&
          process.env.SMTP_PASSWORD
        ) {
          try {
            await mailSvc.sendEmail(
              req.authUser.email,
              "Your OTP for Bluebook Payment",
              buildPaymentOtpEmail({
                userName: req.authUser.name,
                otp,
                validMinutes: 5,
                vehicleCategory: "petrol",
              })
            );
          } catch (err) {
            console.error("Failed to send OTP email:", err);
            // Don't fail the payment if email fails
          }
        }

        res.status(200).json({
          result: {
            paymentData,
            TaxData,
            KhaltiPaymentResponse,
          },
          payment: {
            paymentURl: KhaltiPaymentResponse.payment_url,
            expiresAt: KhaltiPaymentResponse.expires_at,
          },
          message: "Payment Initiated successfully",
          meta: null,
        });
      } else if (daysLeft > 30) {
        res.status(400).json({
          message:
            "Tax payment is not due yet. You can pay when there are less than 30 days remaining.",
          meta: null,
        });
      } else {
        res.status(500).json({
          message: "Something went wrong. Please try again later.",
          meta: null,
        });
      }
    } catch (exception) {
      console.error("Payment Error:", exception);

      // Log detailed error information
      if (exception.response) {
        console.error("API Response Error:", {
          status: exception.response.status,
          data: exception.response.data,
          headers: exception.response.headers,
        });
      }

      // Handle specific error types
      if (exception.code === "ECONNREFUSED" || exception.code === "ENOTFOUND") {
        return res.status(400).json({
          message:
            "Payment gateway is temporarily unavailable. Please try again in a few minutes.",
          meta: null,
        });
      }

      if (exception.response && exception.response.status === 400) {
        return res.status(400).json({
          message:
            "Invalid payment request. Please check your details and try again.",
          meta: null,
        });
      }

      if (exception.response && exception.response.status === 401) {
        return res.status(400).json({
          message: "Payment authentication failed. Please contact support.",
          meta: null,
        });
      }

      // Handle MongoDB errors
      if (exception.code === 11000) {
        console.error("MongoDB Duplicate Key Error:", exception.keyValue);
        return res.status(400).json({
          message: "Payment already exists. Please try again.",
          meta: null,
        });
      }

      return res.status(500).json({
        message:
          "Something went wrong with the payment. Please try again later.",
        meta: null,
      });
    }
  };

  // Verifies a payment transaction using pidx.
  // Checks payment status via Khalti or demo mode, updates payment and bluebook records if successful.
  verifyTransaction = async (req, res, next) => {
    try {
      const { pidx } = req.body;
      const { id } = req.params;
      const userId = req.authUser;
      if (!pidx) {
        res.status(400).json({
          message:
            "Payment verification failed: Missing transaction details. Please try again.",
          meta: null,
        });
        return;
      }

      let data;

      // Check if we should use demo mode
      const useDemoMode =
        process.env.USE_DEMO_PAYMENT === "true" ||
        !process.env.KHALTI_SECRET_KEY;

      if (useDemoMode) {
        console.log("🎭 Using Demo Payment Verification Mode");
        data = await demoPaymentService.lookupPayment(pidx);
      } else {
        // Use real Khalti API
        const khaltiSecretKey = process.env.KHALTI_SECRET_KEY;
        const khaltiBaseUrl =
          process.env.KHALTI_BASE_URL || "https://a.khalti.com/api/v2";

        const response = await axios.post(
          `${khaltiBaseUrl}/epayment/lookup/`,
          {
            pidx,
          },
          {
            headers: {
              Authorization: `key ${khaltiSecretKey}`,
              "Content-Type": "application/json",
            },
          }
        );
        data = response.data;
      }

      const today = new Date();
      const oneYearLater = new Date(today);
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
      if (data.status === "Completed") {
        await PaymentModel.updateOne(
          {
            pidx: pidx,
          },
          {
            $set: {
              paymentStatus: "paid",
              transactionId: data.transaction_id || `TXN_${Date.now()}`,
            },
          }
        );
        await BluebookModel.updateOne(
          {
            _id: id,
          },
          {
            $set: {
              taxPayDate: today,
              taxExpireDate: oneYearLater,
            },
          }
        );

        res.status(200).json({
          result: {
            totalAmount: data.total_amount / 100,
            transactionId: data.transaction_id,
            fee: data.fee,
            refunded: data.refunded,
          },
          message: "Transaction is verified successfully",
          meta: null,
        });
      } else {
        res.status(400).json({
          message: "Payment was not completed. Please try the payment again.",
          meta: null,
        });
      }
    } catch (exception) {
      console.error("Verification Error:", exception);

      // Handle specific error types
      if (exception.code === "ECONNREFUSED" || exception.code === "ENOTFOUND") {
        return res.status(400).json({
          message:
            "Payment verification service is temporarily unavailable. Please try again in a few minutes.",
          meta: null,
        });
      }

      if (exception.response && exception.response.status === 400) {
        return res.status(400).json({
          message: "Invalid verification request. Please try again.",
          meta: null,
        });
      }

      return res.status(500).json({
        message:
          "Something went wrong during verification. Please try again later.",
        meta: null,
      });
    }
  };
  // Verifies the OTP for a payment.
  // Checks OTP validity, expiration, and updates payment status if correct.
  verifyOtp = async (req, res, next) => {
    try {
      const { paymentId, otp } = req.body;

      // Validate input
      if (!paymentId || !otp) {
        return res.status(400).json({
          message: "Payment ID and OTP are required.",
          meta: null,
        });
      }

      // Validate OTP format (6 digits)
      if (!/^\d{6}$/.test(otp)) {
        return res.status(400).json({
          message: "OTP must be a 6-digit number.",
          meta: null,
        });
      }

      // Find payment by ID
      const payment = await PaymentModel.findById(paymentId);
      if (!payment) {
        return res.status(404).json({
          message: "Payment not found.",
          meta: null,
        });
      }

      // Check if payment is already completed
      if (payment.paymentStatus === "paid") {
        return res.status(400).json({
          message: "Payment is already confirmed.",
          meta: null,
        });
      }

      // Check if OTP exists and matches
      if (!payment.otp) {
        return res.status(400).json({
          message:
            "No OTP found for this payment. Please initiate payment again.",
          meta: null,
        });
      }

      if (payment.otp !== otp) {
        return res.status(400).json({
          message: "Invalid OTP. Please check and try again.",
          meta: null,
        });
      }

      // Check if OTP has expired
      if (!payment.otpExpiresAt || payment.otpExpiresAt < new Date()) {
        return res.status(400).json({
          message: "OTP has expired. Please initiate payment again.",
          meta: null,
        });
      }

      // Update payment status
      payment.paymentStatus = "paid";
      payment.status = "successful";
      payment.otp = null;
      payment.otpExpiresAt = null;
      await payment.save();

      return res.status(200).json({
        message: "Payment confirmed successfully.",
        meta: null,
      });
    } catch (err) {
      console.error("OTP Verification Error:", err);
      return res.status(500).json({
        message: "Failed to verify OTP. Please try again.",
        meta: null,
      });
    }
  };

  // Demo endpoint to complete a payment (for testing).
  // Marks a demo payment as completed using the provided pidx.
  completeDemoPayment = async (req, res, next) => {
    try {
      const { pidx } = req.body;
      if (!pidx) {
        return res.status(400).json({ message: "PIDX is required." });
      }

      await demoPaymentService.completePayment(pidx);

      res.status(200).json({
        message: "Demo payment completed successfully",
        pidx: pidx,
      });
    } catch (error) {
      console.error("Demo Payment Completion Error:", error);
      res.status(500).json({
        message: "Failed to complete demo payment",
        error: error.message,
      });
    }
  };
}

const paymentCtrl = new PaymentController();
module.exports = paymentCtrl;
