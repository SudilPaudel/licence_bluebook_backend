const { createPdfDoc, renderAdminReport, renderPaymentReceipt } = require('../../utils/pdfTemplates');
const UserModel = require('../user/user.model');
const BluebookModel = require('../Bluebook/bluebook.model');
const PaymentModel = require('../payment/payment.model');
const ElectricPaymentModel = require('../ElectricPayment/electricPayment.model');
const ElectricBluebookModel = require('../ElectricBluebook/electricBluebook.model');

class AdminController {
    // Generates a comprehensive PDF report for users, bluebooks, or payments based on the 'type' parameter.
    generateReport = async (req, res, next) => {
        try {
            const { type } = req.params;

            const doc = createPdfDoc({
                info: {
                    Title: `${type.toUpperCase()} Report - DOTM Bluebook System`,
                    Author: 'Department of Transport Management',
                    Subject: `${type.toUpperCase()} Administrative Report`,
                    Keywords: 'bluebook, renewal, report, dotm, nepal',
                    CreationDate: new Date(),
                },
            });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${type}_report_${new Date().toISOString().split('T')[0]}.pdf"`);

            doc.on('error', (error) => {
                console.error('PDF generation error:', error);
                if (!res.headersSent) {
                    res.status(500).json({ message: 'PDF generation failed', error: error.message });
                }
            });

            doc.pipe(res);

            let data = [];
            let statistics = {};

            switch (type) {
                case 'users':
                    data = await UserModel.find({}).select('-password -activationToken -emailOtp -resetToken -resetOtp').sort({ createdAt: -1 });
                    statistics = this.calculateUserStatistics(data);
                    break;
                case 'bluebooks': {
                    const petrolBluebooks = await BluebookModel.find({}).sort({ createdAt: -1 });
                    const electricBluebooks = await ElectricBluebookModel.find({}).sort({ createdAt: -1 });
                    data = [
                        ...petrolBluebooks.map((b) => ({ ...b.toObject(), category: 'Petrol' })),
                        ...electricBluebooks.map((b) => ({ ...b.toObject(), category: 'Electric' })),
                    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    statistics = this.calculateBluebookStatistics(data);
                    break;
                }
                case 'payments': {
                    const regularPayments = await PaymentModel.find({}).populate('userId', 'name email').sort({ createdAt: -1 });
                    const electricPayments = await ElectricPaymentModel.find({}).populate('userId', 'name email').sort({ createdAt: -1 });
                    data = [
                        ...regularPayments.map((p) => ({ ...p.toObject(), category: 'Petrol' })),
                        ...electricPayments.map((p) => ({ ...p.toObject(), category: 'Electric' })),
                    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    statistics = this.calculatePaymentStatistics(data);
                    break;
                }
                default:
                    throw { code: 400, message: 'Invalid report type' };
            }

            renderAdminReport(doc, { type, data, statistics });
            doc.end();
        } catch (exception) {
            if (!res.headersSent) {
                res.status(500).json({
                    message: 'Failed to generate report',
                    error: exception.message || 'Unknown error',
                });
            }
        }
    }

    // Calculates user statistics
    calculateUserStatistics = (users) => {
        const total = users.length;
        const active = users.filter((u) => u.status === 'active').length;
        const inactive = users.filter((u) => u.status === 'inactive').length;
        const admin = users.filter((u) => u.role === 'admin').length;
        const regular = users.filter((u) => u.role === 'user').length;
        const verified = users.filter((u) => u.emailVerified).length;
        const unverified = users.filter((u) => !u.emailVerified).length;
        const kycVerified = users.filter((u) => u.kycStatus === 'verified').length;
        const kycPending = users.filter((u) => u.kycStatus === 'pending').length;

        return {
            total,
            active,
            inactive,
            admin,
            regular,
            verified,
            unverified,
            kycVerified,
            kycPending,
            activePercentage: total > 0 ? ((active / total) * 100).toFixed(1) : 0,
            verifiedPercentage: total > 0 ? ((verified / total) * 100).toFixed(1) : 0,
            adminPercentage: total > 0 ? ((admin / total) * 100).toFixed(1) : 0,
        };
    }

    calculateBluebookStatistics = (bluebooks) => {
        const total = bluebooks.length;
        const pending = bluebooks.filter((b) => b.status === 'pending').length;
        const verified = bluebooks.filter((b) => b.status === 'verified').length;
        const rejected = bluebooks.filter((b) => b.status === 'rejected').length;
        const petrol = bluebooks.filter((b) => b.category === 'Petrol').length;
        const electric = bluebooks.filter((b) => b.category === 'Electric').length;
        const motorcycle = bluebooks.filter((b) => b.vehicleType === 'motorcycle').length;
        const car = bluebooks.filter((b) => b.vehicleType === 'car').length;
        const truck = bluebooks.filter((b) => b.vehicleType === 'truck').length;
        const other = total - motorcycle - car - truck;

        const now = new Date();
        const expiringSoon = bluebooks.filter((b) => {
            if (!b.taxExpireDate) return false;
            const daysLeft = Math.ceil((new Date(b.taxExpireDate) - now) / (1000 * 60 * 60 * 24));
            return daysLeft >= 0 && daysLeft <= 30;
        }).length;

        const expired = bluebooks.filter((b) => {
            if (!b.taxExpireDate) return false;
            return new Date(b.taxExpireDate) < now;
        }).length;

        return {
            total,
            pending,
            verified,
            rejected,
            petrol,
            electric,
            motorcycle,
            car,
            truck,
            other,
            expiringSoon,
            expired,
            verifiedPercentage: total > 0 ? ((verified / total) * 100).toFixed(1) : 0,
            pendingPercentage: total > 0 ? ((pending / total) * 100).toFixed(1) : 0,
        };
    }

    // Calculates payment statistics
    calculatePaymentStatistics = (payments) => {
        const total = payments.length;
        const isSuccessful = (p) => ['successful', 'paid'].includes(p.status) || ['successful', 'paid'].includes(p.paymentStatus);
        const successful = payments.filter(isSuccessful).length;
        const pending = payments.filter((p) => !isSuccessful(p) && (p.status === 'pending' || p.paymentStatus === 'pending')).length;
        const failed = payments.filter((p) => p.status === 'failed' || p.paymentStatus === 'failed').length;
        const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const successfulAmount = payments.filter(isSuccessful).reduce((sum, p) => sum + (p.amount || 0), 0);

        return {
            total,
            successful,
            pending,
            failed,
            totalAmount: totalAmount.toFixed(2),
            successfulAmount: successfulAmount.toFixed(2),
            successRate: total > 0 ? ((successful / total) * 100).toFixed(1) : 0,
            averageAmount: total > 0 ? (totalAmount / total).toFixed(2) : 0
        };
    }

    // Retrieves all payment records, populates user info, and returns a summary with meta statistics.
    getAllPayments = async (req, res, next) => {
        try {
            const payments = await PaymentModel.find({}).populate('userId', 'name email');
            
            const formattedPayments = payments.map(payment => ({
                _id: payment._id,
                transactionId: payment.transactionId || 'N/A',
                userName: payment.userId ? payment.userId.name : 'Unknown',
                amount: payment.amount || 0,
                status: payment.status || 'pending',
                createdAt: payment.createdAt
            }));

            res.json({
                result: formattedPayments,
                message: "Payments fetched successfully",
                meta: {
                    total: formattedPayments.length,
                    successful: formattedPayments.filter(p => p.status === 'successful').length,
                    pending: formattedPayments.filter(p => p.status === 'pending').length,
                    failed: formattedPayments.filter(p => p.status === 'failed').length
                }
            });
        } catch (exception) {
            next(exception);
        }
    }

    // Gathers and returns overall system statistics: user, bluebook, and payment counts.
    getSystemStats = async (req, res, next) => {
        try {
            const totalUsers = await UserModel.countDocuments({});
            const activeUsers = await UserModel.countDocuments({ status: 'active' });
            const totalBluebooks = await BluebookModel.countDocuments({});
            const pendingBluebooks = await BluebookModel.countDocuments({ status: 'pending' });
            const verifiedBluebooks = await BluebookModel.countDocuments({ status: 'verified' });
            const totalPayments = await PaymentModel.countDocuments({});

            res.json({
                result: {
                    totalUsers,
                    activeUsers,
                    totalBluebooks,
                    pendingBluebooks,
                    verifiedBluebooks,
                    totalPayments
                },
                message: "System statistics fetched successfully",
                meta: null
            });
        } catch (exception) {
            next(exception);
        }
    }

    // Generates and returns a modern PDF receipt for a specific payment
    getPaymentReceipt = async (req, res, next) => {
        try {
            const { paymentId } = req.params;
            
            // Find payment in both regular and electric payment collections
            let payment = await PaymentModel.findById(paymentId).populate('userId', 'name email role status');
            let isElectric = false;

            if (!payment) {
                payment = await ElectricPaymentModel.findById(paymentId).populate('userId', 'name email role status');
                isElectric = true;
            }

            if (!payment) {
                return res.status(404).json({
                    message: "Payment not found",
                    meta: null
                });
            }

            // Get bluebook details
            let bluebook = null;
            if (isElectric && payment.electricBluebookId) {
                bluebook = await ElectricBluebookModel.findById(payment.electricBluebookId);
            } else if (!isElectric && payment.bluebookId) {
                bluebook = await BluebookModel.findById(payment.bluebookId);
            }

            const doc = createPdfDoc({
                info: {
                    Title: 'Official Payment Receipt - DOTM',
                    Author: 'Department of Transport Management',
                    Subject: 'Vehicle Tax Payment Receipt',
                    Keywords: 'payment, receipt, bluebook, tax, nepal',
                    CreationDate: new Date(),
                },
            });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="payment-receipt-${payment.transactionId || payment._id}.pdf"`);

            doc.pipe(res);
            renderPaymentReceipt(doc, {
                payment,
                bluebook,
                isElectric,
                user: payment.userId,
            });
            doc.end();

        } catch (exception) {
            next(exception);
        }
    }

    // Fetches all users, removes sensitive fields, and returns user data with meta statistics.
    getAllUsers = async (req, res, next) => {
        try {
            const users = await UserModel.find({}).select('-password -activationToken');
            
            res.json({
                result: users,
                message: "Users fetched successfully",
                meta: {
                    total: users.length,
                    active: users.filter(u => u.status === 'active').length,
                    inactive: users.filter(u => u.status === 'inactive').length,
                    admin: users.filter(u => u.role === 'admin').length,
                    user: users.filter(u => u.role === 'user').length
                }
            });
        } catch (exception) {
            next(exception);
        }
    }

    // Updates a user's information by ID after validating input and existence.
    // Returns the updated user data.
    updateUser = async (req, res, next) => {
        try {
            const id = req.params.id;
            const updateData = req.body;
            
            // Check if user exists
            const existingUser = await UserModel.findById(id);
            if (!existingUser) {
                throw { code: 404, message: 'User not found' };
            }
            
            // Validate required fields
            if (updateData.email && !updateData.email.includes('@')) {
                throw { code: 400, message: 'Invalid email format' };
            }
            
            if (updateData.role && !['admin', 'user'].includes(updateData.role)) {
                throw { code: 400, message: 'Invalid role. Must be admin or user' };
            }
            
            if (updateData.status && !['active', 'inactive'].includes(updateData.status)) {
                throw { code: 400, message: 'Invalid status. Must be active or inactive' };
            }
            
            // Update the user
            const updatedUser = await UserModel.findByIdAndUpdate(
                id, 
                updateData, 
                { new: true, runValidators: true }
            ).select('-password -activationToken');
            
            res.json({
                result: updatedUser,
                message: "User updated successfully",
                meta: null
            });
        } catch (exception) {
            next(exception);
        }
    }

    // Deletes a user by ID after checking existence and ensuring the user is not an admin.
    deleteUser = async (req, res, next) => {
        try {
            const id = req.params.id;
            
            // Check if user exists
            const existingUser = await UserModel.findById(id);
            if (!existingUser) {
                throw { code: 404, message: 'User not found' };
            }
            
            // Prevent deleting admin users
            if (existingUser.role === 'admin') {
                throw { code: 400, message: 'Cannot delete admin users' };
            }
            
            // Delete the user
            await UserModel.findByIdAndDelete(id);
            
            res.json({
                result: null,
                message: "User deleted successfully",
                meta: null
            });
        } catch (exception) {
            next(exception);
        }
    }

    // Toggles a user's status (active/inactive) by ID and returns the updated user.
    toggleUserStatus = async (req, res, next) => {
        try {
            const id = req.params.id;
            
            // Check if user exists
            const existingUser = await UserModel.findById(id);
            if (!existingUser) {
                throw { code: 404, message: 'User not found' };
            }
            
            // Toggle status
            const newStatus = existingUser.status === 'active' ? 'inactive' : 'active';
            const updatedUser = await UserModel.findByIdAndUpdate(
                id,
                { status: newStatus },
                { new: true, runValidators: true }
            ).select('-password -activationToken');
            
            res.json({
                result: updatedUser,
                message: `User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
                meta: null
            });
        } catch (exception) {
            next(exception);
        }
    }
}

const adminCtrl = new AdminController();
module.exports = adminCtrl;