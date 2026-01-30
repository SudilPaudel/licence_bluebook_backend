const electricBluebookCtrl = require("../ElectricBluebook/electricBluebook.controller");
const ElectricBluebookModel = require("../ElectricBluebook/electricBluebook.model");
const electricBluebookSvc = require("../ElectricBluebook/electricBluebook.service");
const ElectricTaxModel = require("../Tax/electricTax.model");
const ElectricPaymentModel = require("./electricPayment.model");
const axios = require("axios");
const mailSvc = require("../../services/mail.service");
const crypto = require("crypto");

require("dotenv").config();

// Demo payment simulation for testing
class DemoElectricPaymentService {
  constructor() {
    this.payments = new Map();
  }

  async initiatePayment(paymentData) {
    let pidx = `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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
const demoElectricPaymentService = new DemoElectricPaymentService();

class ElectricPaymentController {
  // Handles electric vehicle tax payment initiation for an electric bluebook.
  // Calculates tax based on battery capacity, checks vehicle type, applies fines if overdue, and initiates payment via Khalti or demo mode.
  // Sends OTP to user's email and returns payment details and payment URL.
  payElectricTax = async (req, res, next) => {
    try {
      const id = req.params.id;
      
      // Debug logging
      console.log('Electric Payment - ID from params:', id);
      console.log('Electric Payment - Request params:', req.params);
      
      // Validate id parameter
      if (!id) {
        return res.status(400).json({
          message: "Electric bluebook ID is required.",
          meta: null,
        });
      }

      // Validate that id is a valid ObjectId
      const mongoose = require('mongoose');
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: "Invalid electric bluebook ID format.",
          meta: null,
        });
      }
      
      //fetch electric bluebook data
      const electricBluebookData = await electricBluebookSvc.findOneBluebook({
        _id: id,
      });
      
      // Check if electric bluebook exists
      if (!electricBluebookData) {
        res.status(404).json({
          message: "Electric bluebook not found.",
          meta: null,
        });
        return;
      }
      
      //bluebook ko status pending vaye
      if (electricBluebookData.status !== "verified") {
        res.status(400).json({
          message:
            "Your electric bluebook is not verified yet. Please wait for admin verification before making payment.",
          meta: null,
        });
        return;
      }

      //Days left logic
      const now = new Date(); // current date
      const taxExpireDate = new Date(electricBluebookData.taxExpireDate); // parse the ISO string

      const diffInMs = taxExpireDate.getTime() - now.getTime(); // time difference in ms
      const daysLeft = Math.ceil(diffInMs / (1000 * 60 * 60 * 24)); // convert ms to days

      let baseTax;
      let renewalCharge;
      
              // Calculate tax based on vehicle type and battery capacity
        if (electricBluebookData.vehicleType === "Motorcycle" || electricBluebookData.vehicleType === "motorcycle" || electricBluebookData.vehicleType === "MC") {
        renewalCharge = 300;
        const batteryCapacity = Number(electricBluebookData.vehicleBatteryCapacity || 0);

        
        if (batteryCapacity <= 50) {
          baseTax = 1000;
        } else if (batteryCapacity <= 350) {
          baseTax = 1500;
        } else if (batteryCapacity <= 1000) {
          baseTax = 2000;
        } else if (batteryCapacity <= 1500) {
          baseTax = 2500;
        } else {
          baseTax = 3000; // 1501 and higher
        }

      } else if (electricBluebookData.vehicleType === "Car" || electricBluebookData.vehicleType === "car" || electricBluebookData.vehicleType === "CAR") {
        renewalCharge = 500;
        const batteryCapacity = Number(electricBluebookData.vehicleBatteryCapacity || 0);

        
        if (batteryCapacity <= 10) {
          baseTax = 5000;
        } else if (batteryCapacity <= 50) {
          baseTax = 5000;
        } else if (batteryCapacity <= 125) {
          baseTax = 15000;
        } else if (batteryCapacity <= 200) {
          baseTax = 20000;
        } else {
          baseTax = 30000; // 201 and higher
        }

      } else {

        // Default to Motorcycle if unknown
        renewalCharge = 300;
        const batteryCapacity = Number(electricBluebookData.vehicleBatteryCapacity || 0);
        if (batteryCapacity <= 50) {
          baseTax = 1000;
        } else if (batteryCapacity <= 350) {
          baseTax = 1500;
        } else if (batteryCapacity <= 1000) {
          baseTax = 2000;
        } else if (batteryCapacity <= 1500) {
          baseTax = 2500;
        } else {
          baseTax = 3000;
        }
      }

      let data;
      let totalTaxAmount = 0;

      const today = new Date();
      const registrationDate = new Date(electricBluebookData.vehicleRegistrationDate);

      // Calculate year difference
      const vehicleAgeInYears =
        today.getFullYear() - registrationDate.getFullYear();
      let oldVehicleTax = 0;
      const { paymentMethod } = req.body;

      // Check for existing pending payments for this user and electric bluebook
      const existingPayment = await ElectricPaymentModel.findOne({
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

      //Conditions for the tax
      
      if (daysLeft < 30 && daysLeft > 1) {
        totalTaxAmount = baseTax + renewalCharge;
        if (vehicleAgeInYears >= 15) {
          // 10% extra tax for old vehicles
          oldVehicleTax = 0.1 * totalTaxAmount;
          totalTaxAmount += oldVehicleTax;
        }


        
        const ElectricTaxData = await ElectricTaxModel.create({
          baseTax: baseTax,
          renewalCharge: renewalCharge,
          oldVehicleTax: oldVehicleTax || 0,
          TotalTaxAmount: totalTaxAmount,
          vehicleType: electricBluebookData.vehicleType,
          batteryCapacity: electricBluebookData.vehicleBatteryCapacity,
        });
        


              // Create payment record without Khalti pidx initially (like fuel payment)
              paymentDataObj.amount = totalTaxAmount;
        paymentDataObj.electricBluebookId = id; // Store the bluebook ID
        
        // Debug logging
        console.log('Electric Payment - Creating payment record with electricBluebookId:', id);
        console.log('Electric Payment - Payment data object:', paymentDataObj);
        
        const paymentData = await ElectricPaymentModel.create(paymentDataObj);

        // Send OTP email (only if email service is configured)
        if (
          process.env.SMTP_HOST &&
          process.env.SMTP_USER &&
          process.env.SMTP_PASSWORD
        ) {
          try {
            await mailSvc.sendEmail(
              req.authUser.email,
              "Your OTP for Electric Bluebook Payment",
              `<p>Your OTP for confirming the electric vehicle payment is: <b>${otp}</b></p><p>This OTP is valid for 5 minutes.</p>`
            );
          } catch (err) {
            console.error("Failed to send OTP email:", err);
            // Don't fail the payment if email fails
          }
        }

        res.status(200).json({
          result: {
            paymentData,
            ElectricTaxData,
          },
          message: "Electric Vehicle Payment Initiated successfully. Please check your email for OTP.",
          meta: null,
        });
      } else if (daysLeft < 1) {
        let fineAmount = 0;
        if (daysLeft <= -365) {
          fineAmount = 0.2 * baseTax;
        } else if (daysLeft <= -45) {
          fineAmount = 0.1 * baseTax;
        } else if (daysLeft <= -1) {
          fineAmount = 0.05 * baseTax;
        }
        totalTaxAmount = baseTax + renewalCharge + fineAmount;
        if (vehicleAgeInYears >= 15) {
          // 10% extra tax for old vehicles
          oldVehicleTax = 0.1 * totalTaxAmount;
          totalTaxAmount += oldVehicleTax;
        }

        
        const ElectricTaxData = await ElectricTaxModel.create({
          baseTax: baseTax,
          renewalCharge: renewalCharge,
          fineAmount: fineAmount,
          oldVehicleTax: oldVehicleTax,
          TotalTaxAmount: totalTaxAmount,
          vehicleType: electricBluebookData.vehicleType,
          batteryCapacity: electricBluebookData.vehicleBatteryCapacity,
        });
        


        // Create payment record without Khalti pidx initially (like fuel payment)
        paymentDataObj.amount = totalTaxAmount;
        paymentDataObj.electricBluebookId = id; // Store the bluebook ID
        
        // Debug logging
        console.log('Electric Payment - Creating payment record with electricBluebookId (expired):', id);
        console.log('Electric Payment - Payment data object (expired):', paymentDataObj);
        
        const paymentData = await ElectricPaymentModel.create(paymentDataObj);

        // Send OTP email (only if email service is configured)
        if (
          process.env.SMTP_HOST &&
          process.env.SMTP_USER &&
          process.env.SMTP_PASSWORD
        ) {
          try {
            await mailSvc.sendEmail(
              req.authUser.email,
              "Your OTP for Electric Bluebook Payment",
              `<p>Your OTP for confirming the electric vehicle payment is: <b>${otp}</b></p><p>This OTP is valid for 5 minutes.</p>`
            );
          } catch (err) {
            console.error("Failed to send OTP email:", err);
            // Don't fail the payment if email fails
          }
        }

        res.status(200).json({
          result: {
            paymentData,
            ElectricTaxData,
          },
          message: "Electric Vehicle Payment Initiated successfully. Please check your email for OTP.",
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
      console.error("Electric Payment Error:", exception);

      // Log detailed error information
      if (exception.response) {
        console.error("API Response Error:", {
          status: exception.response.status,
          data: exception.response.data,
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
      
      // Handle MongoDB validation errors
      if (exception.name === 'ValidationError') {
        console.error("MongoDB Validation Error:", exception.message);
        return res.status(400).json({
          message: `Validation error: ${exception.message}`,
          meta: null,
        });
      }
      
      // Handle MongoDB cast errors
      if (exception.name === 'CastError') {
        console.error("MongoDB Cast Error:", exception.message);
        return res.status(400).json({
          message: `Invalid data format: ${exception.message}`,
          meta: null,
        });
      }

      return res.status(500).json({
        message:
          "Something went wrong with the electric vehicle payment. Please try again later.",
        meta: null,
      });
    }
  };

  // Initiates Khalti payment after OTP verification
  // Creates Khalti payment and returns payment URL
  initiateKhaltiPayment = async (req, res, next) => {
    try {
      const { paymentId } = req.body;
      const userId = req.authUser._id;

      if (!paymentId) {
        return res.status(400).json({
          message: "Payment ID is required.",
          meta: null,
        });
      }

      // Find payment by ID
      const payment = await ElectricPaymentModel.findById(paymentId);
      if (!payment) {
        return res.status(404).json({
          message: "Payment not found.",
          meta: null,
        });
      }

      // Check if payment belongs to user
      if (payment.userId.toString() !== userId.toString()) {
        return res.status(403).json({
          message: "Access denied.",
          meta: null,
        });
      }

      // Check if payment is pending (should be pending after OTP verification)
      if (payment.paymentStatus !== "pending") {
        return res.status(400).json({
          message: "Payment is not in pending status.",
          meta: null,
        });
      }

      // Find the electric tax data
      const electricTax = await ElectricTaxModel.findOne({
        TotalTaxAmount: payment.amount
      }).sort({ createdAt: -1 });

      if (!electricTax) {
        return res.status(404).json({
          message: "Tax data not found.",
          meta: null,
        });
      }

      // Get the electric bluebook ID from the payment record
      const electricBluebookId = payment.electricBluebookId;
      
      // Debug logging
      console.log('Electric Khalti Payment - Payment record:', payment);
      console.log('Electric Khalti Payment - Electric bluebook ID:', electricBluebookId);
      console.log('Electric Khalti Payment - Payment ID:', paymentId);

      // Validate electric bluebook ID
      if (!electricBluebookId) {
        console.error('Electric Khalti Payment - Electric bluebook ID is missing from payment record');
        return res.status(400).json({
          message: "Payment record is missing electric bluebook ID. Please try again.",
          meta: null,
        });
      }

      // Initialize data object for Khalti payment
      const data = {
        return_url: `${
          process.env.BACKEND_URL || "http://localhost:9005"
        }/electric-payment-verification/${electricBluebookId}`,
        purchase_order_id: electricTax._id,
        amount: payment.amount * 100, //Khalti dont accept in rupee so convert it to paisa
        website_url: process.env.FRONTEND_URL || "http://localhost:5173",
        purchase_order_name: `ElectricBluebook-Tax-${electricTax._id}`,
      };

      // Check if we should use demo mode
      const useDemoMode =
        process.env.USE_DEMO_PAYMENT === "true" ||
        !process.env.KHALTI_SECRET_KEY ||
        process.env.KHALTI_SECRET_KEY ===
          "test_secret_key_583b0022d828403aa655b2ed39ccaed7";

      let KhaltiPaymentResponse;

      try {
        if (useDemoMode) {
          KhaltiPaymentResponse = await demoElectricPaymentService.initiatePayment(data);
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
      } catch (error) {
        console.error("Payment initiation error:", error);
        if (error.response) {
          console.error("Error response:", error.response.data);
        }
        throw error;
      }

      // Update payment record with pidx
      payment.pidx = KhaltiPaymentResponse.pidx;
      await payment.save();

      res.status(200).json({
        result: {
          paymentData: payment,
          ElectricTaxData: electricTax,
          KhaltiPaymentResponse,
        },
        payment: {
          paymentURl: KhaltiPaymentResponse.payment_url,
          expiresAt: KhaltiPaymentResponse.expires_at,
        },
        message: "Khalti payment initiated successfully",
        meta: null,
      });
    } catch (exception) {
      console.error("Electric Khalti Payment Error:", exception);

      // Log detailed error information
      if (exception.response) {
        console.error("API Response Error:", {
          status: exception.response.status,
          data: exception.response.data,
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
      
      // Handle MongoDB validation errors
      if (exception.name === 'ValidationError') {
        console.error("MongoDB Validation Error:", exception.message);
        return res.status(400).json({
          message: `Validation error: ${exception.message}`,
          meta: null,
        });
      }
      
      // Handle MongoDB cast errors
      if (exception.name === 'CastError') {
        console.error("MongoDB Cast Error:", exception.message);
        return res.status(400).json({
          message: `Invalid data format: ${exception.message}`,
          meta: null,
        });
      }

      return res.status(500).json({
        message:
          "Something went wrong with the electric vehicle payment. Please try again later.",
        meta: null,
      });
    }
  };

  // Verifies an electric payment transaction using pidx.
  // Checks payment status via Khalti or demo mode, updates payment and electric bluebook records if successful.
  verifyElectricTransaction = async (req, res, next) => {
    try {
      const { pidx } = req.body;
      const { id } = req.params;
      const userId = req.authUser;
      
      // Validate pidx
      if (!pidx) {
        res.status(400).json({
          message:
            "Payment verification failed: Missing transaction details. Please try again.",
          meta: null,
        });
        return;
      }

      // Validate id parameter
      if (!id) {
        res.status(400).json({
          message:
            "Payment verification failed: Missing electric bluebook ID. Please try again.",
          meta: null,
        });
        return;
      }

      // Validate that id is a valid ObjectId
      const mongoose = require('mongoose');
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          message:
            "Payment verification failed: Invalid electric bluebook ID format. Please try again.",
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
        data = await demoElectricPaymentService.lookupPayment(pidx);
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
        // Verify that the electric bluebook exists before updating
        const electricBluebook = await ElectricBluebookModel.findById(id);
        if (!electricBluebook) {
          res.status(404).json({
            message: "Electric bluebook not found. Please check the bluebook ID and try again.",
            meta: null,
          });
          return;
        }

        await ElectricPaymentModel.updateOne(
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
        await ElectricBluebookModel.updateOne(
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
          message: "Electric Vehicle Transaction is verified successfully",
          meta: null,
        });
      } else {
        res.status(400).json({
          message: "Payment was not completed. Please try the payment again.",
          meta: null,
        });
      }
    } catch (exception) {
      console.error("Electric Verification Error:", exception);

      // Handle specific error types
      if (exception.code === "ECONNREFUSED" || exception.code === "ENOTFOUND") {
        return res.status(400).json({
          message:
            "Payment verification service is temporarily unavailable. Please try again in a few minutes.",
          meta: null,
        });
      }

      return res.status(500).json({
        message:
          "Something went wrong with the electric vehicle payment verification. Please try again later.",
        meta: null,
      });
    }
  };

  // Verifies OTP for electric payment confirmation.
  // Checks if OTP is valid and not expired, then confirms the payment.
  verifyElectricOtp = async (req, res, next) => {
    try {
      const { paymentId, otp } = req.body;
      const userId = req.authUser._id;

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
      const payment = await ElectricPaymentModel.findById(paymentId);
      if (!payment) {
        return res.status(404).json({
          message: "Payment not found.",
          meta: null,
        });
      }

      // Check if payment belongs to user
      if (payment.userId.toString() !== userId.toString()) {
        return res.status(403).json({
          message: "Access denied.",
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

      // Clear OTP but keep payment pending for Khalti
      payment.otp = null;
      payment.otpExpiresAt = null;
      await payment.save();

      return res.status(200).json({
        message: "Payment confirmed successfully.",
        meta: null,
      });
    } catch (exception) {
      console.error("Electric OTP Verification Error:", exception);
      return res.status(500).json({
        message:
          "Something went wrong with the electric vehicle OTP verification. Please try again later.",
        meta: null,
      });
    }
  };

  // Demo payment completion endpoint for electric vehicles (for testing only)
  completeDemoElectricPayment = async (req, res, next) => {
    try {
      const { pidx } = req.body;

      if (!pidx) {
        return res.status(400).json({
          message: "Payment ID (pidx) is required",
          meta: null,
        });
      }

      await demoElectricPaymentService.completePayment(pidx);

      res.status(200).json({
        result: {
          pidx: pidx,
          status: "Completed",
        },
        message: "Demo electric payment completed successfully",
        meta: null,
      });
    } catch (exception) {
      console.error("Demo Electric Payment Error:", exception);
      return res.status(500).json({
        message:
          "Something went wrong with the demo electric payment. Please try again later.",
        meta: null,
      });
    }
  };
}

module.exports = new ElectricPaymentController(); 