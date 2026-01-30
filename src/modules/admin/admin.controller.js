const PDFDocument = require('pdfkit');
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
            
            // Create PDF document with modern settings
            const doc = new PDFDocument({
                size: 'A4',
                margin: 40,
                info: {
                    Title: `${type.toUpperCase()} Report - Bluebook Renewal System`,
                    Author: 'Bluebook Renewal System',
                    Subject: `${type.toUpperCase()} Report`,
                    Keywords: 'bluebook, renewal, system, report',
                    CreationDate: new Date()
                }
            });

            // Set response headers
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${type}_report_${new Date().toISOString().split('T')[0]}.pdf"`);

            // Pipe PDF to response
            doc.pipe(res);

            // Add error handling for PDF generation
            doc.on('error', (error) => {
                console.error('PDF generation error:', error);
                if (!res.headersSent) {
                    res.status(500).json({ message: 'PDF generation failed', error: error.message });
                }
            });

            // Add modern header with logo placeholder
            this.addReportHeader(doc, type);

            // Add report metadata
            this.addReportMetadata(doc, type);

            // Get data based on type
            let data = [];
            let statistics = {};
            
            switch (type) {
                case 'users':
                    data = await UserModel.find({}).select('-password -activationToken').sort({ createdAt: -1 });
                    statistics = this.calculateUserStatistics(data);
                    break;
                case 'bluebooks':
                    data = await BluebookModel.find({}).sort({ createdAt: -1 });
                    statistics = this.calculateBluebookStatistics(data);
                    break;
                case 'payments':
                    const regularPayments = await PaymentModel.find({}).populate('userId', 'name email').sort({ createdAt: -1 });
                    const electricPayments = await ElectricPaymentModel.find({}).populate('userId', 'name email').sort({ createdAt: -1 });
                    data = [...regularPayments, ...electricPayments];
                    statistics = this.calculatePaymentStatistics(data);
                    break;
                default:
                    throw { code: 400, message: 'Invalid report type' };
            }

            // Add statistics section
            this.addStatisticsSection(doc, statistics, type);

            // Add detailed data table
            if (data.length > 0) {
                this.addDataTable(doc, data, type);
            }

            // Add summary and footer
            this.addReportFooter(doc, data.length, type);

            // Finalize PDF
            doc.end();

        } catch (exception) {
            if (!res.headersSent) {
                res.status(500).json({ 
                    message: 'Failed to generate report', 
                    error: exception.message || 'Unknown error' 
                });
            }
        }
    }

    // Adds a simple and professional header to the PDF report
    addReportHeader = (doc, type) => {
        // Simple header with border
        doc.rect(0, 0, doc.page.width, 60)
           .fill('#f8fafc')
           .stroke('#e2e8f0');

        // Title
        doc.fontSize(24)
           .font('Helvetica-Bold')
           .fill('#1e293b')
           .text(`${type.charAt(0).toUpperCase() + type.slice(1)} Report`, 40, 15)
           .moveDown(0.5);

        // Subtitle
        doc.fontSize(12)
           .font('Helvetica')
           .fill('#64748b')
           .text('Bluebook Renewal System', 40, 40)
           .moveDown(2);

        // Reset fill color
        doc.fill('#000000');
        
        // Move to content area
        doc.y = 80;
    }

    // Adds simple report metadata section
    addReportMetadata = (doc, type) => {
        const currentDate = new Date();
        
        // Simple metadata box
        doc.rect(40, doc.y, doc.page.width - 80, 50)
           .fill('#f8fafc')
           .stroke('#e2e8f0');
        
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fill('#374151')
           .text('Report Information', 50, doc.y + 5)
           .moveDown(0.5);
        
        doc.fontSize(9)
           .font('Helvetica')
           .fill('#6b7280')
           .text(`Type: ${type.charAt(0).toUpperCase() + type.slice(1)}`, 50, doc.y + 20)
           .text(`Date: ${currentDate.toLocaleDateString('en-US', { 
               year: 'numeric', 
               month: 'short', 
               day: 'numeric'
           })}`, 50, doc.y + 30)
           .text(`Time: ${currentDate.toLocaleTimeString('en-US', { 
               hour: '2-digit',
               minute: '2-digit'
           })}`, 50, doc.y + 40);
        
        doc.y += 70;
    }

    // Calculates user statistics
    calculateUserStatistics = (users) => {
        const total = users.length;
        const active = users.filter(u => u.status === 'active').length;
        const inactive = users.filter(u => u.status === 'inactive').length;
        const admin = users.filter(u => u.role === 'admin').length;
        const regular = users.filter(u => u.role === 'user').length;
        const verified = users.filter(u => u.isEmailVerified).length;
        const unverified = users.filter(u => !u.isEmailVerified).length;

        return {
            total,
            active,
            inactive,
            admin,
            regular,
            verified,
            unverified,
            activePercentage: total > 0 ? ((active / total) * 100).toFixed(1) : 0,
            adminPercentage: total > 0 ? ((admin / total) * 100).toFixed(1) : 0
        };
    }

    // Calculates bluebook statistics
    calculateBluebookStatistics = (bluebooks) => {
        const total = bluebooks.length;
        const pending = bluebooks.filter(b => b.status === 'pending').length;
        const verified = bluebooks.filter(b => b.status === 'verified').length;
        const rejected = bluebooks.filter(b => b.status === 'rejected').length;
        const motorcycle = bluebooks.filter(b => b.vehicleType === 'motorcycle').length;
        const car = bluebooks.filter(b => b.vehicleType === 'car').length;
        const truck = bluebooks.filter(b => b.vehicleType === 'truck').length;
        const other = total - motorcycle - car - truck;

        return {
            total,
            pending,
            verified,
            rejected,
            motorcycle,
            car,
            truck,
            other,
            verifiedPercentage: total > 0 ? ((verified / total) * 100).toFixed(1) : 0,
            pendingPercentage: total > 0 ? ((pending / total) * 100).toFixed(1) : 0
        };
    }

    // Calculates payment statistics
    calculatePaymentStatistics = (payments) => {
        const total = payments.length;
        const successful = payments.filter(p => p.status === 'successful' || p.paymentStatus === 'successful').length;
        const pending = payments.filter(p => p.status === 'pending' || p.paymentStatus === 'pending').length;
        const failed = payments.filter(p => p.status === 'failed' || p.paymentStatus === 'failed').length;
        const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const successfulAmount = payments
            .filter(p => p.status === 'successful' || p.paymentStatus === 'successful')
            .reduce((sum, p) => sum + (p.amount || 0), 0);

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

    // Adds simple statistics section
    addStatisticsSection = (doc, statistics, type) => {
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fill('#1e293b')
           .text('Summary Statistics', { align: 'left' })
           .moveDown(1);

        const startY = doc.y;
        const boxWidth = (doc.page.width - 80) / 2;
        const boxHeight = 50;

        // Create statistics boxes with simpler design
        if (type === 'users') {
            this.createStatBox(doc, startY, 40, boxWidth, boxHeight, 'Total Users', statistics.total, '#64748b');
            this.createStatBox(doc, startY, 40 + boxWidth, boxWidth, boxHeight, 'Active Users', statistics.active, '#64748b');
            this.createStatBox(doc, startY + boxHeight + 5, 40, boxWidth, boxHeight, 'Admins', statistics.admin, '#64748b');
            this.createStatBox(doc, startY + boxHeight + 5, 40 + boxWidth, boxWidth, boxHeight, 'Verified', statistics.verified, '#64748b');
        } else if (type === 'bluebooks') {
            this.createStatBox(doc, startY, 40, boxWidth, boxHeight, 'Total Bluebooks', statistics.total, '#64748b');
            this.createStatBox(doc, startY, 40 + boxWidth, boxWidth, boxHeight, 'Verified', statistics.verified, '#64748b');
            this.createStatBox(doc, startY + boxHeight + 5, 40, boxWidth, boxHeight, 'Pending', statistics.pending, '#64748b');
            this.createStatBox(doc, startY + boxHeight + 5, 40 + boxWidth, boxWidth, boxHeight, 'Rejected', statistics.rejected, '#64748b');
        } else if (type === 'payments') {
            this.createStatBox(doc, startY, 40, boxWidth, boxHeight, 'Total Payments', statistics.total, '#64748b');
            this.createStatBox(doc, startY, 40 + boxWidth, boxWidth, boxHeight, 'Successful', statistics.successful, '#64748b');
            this.createStatBox(doc, startY + boxHeight + 5, 40, boxWidth, boxHeight, 'Total Amount', `Rs. ${statistics.totalAmount}`, '#64748b');
            this.createStatBox(doc, startY + boxHeight + 5, 40 + boxWidth, boxWidth, boxHeight, 'Success Rate', `${statistics.successRate}%`, '#64748b');
        }

        doc.y = startY + (boxHeight * 2) + 20;
        doc.moveDown(1);
    }

    // Creates a simple statistics box
    createStatBox = (doc, startY, x, width, height, label, value, color) => {
        // Simple box with border
        doc.rect(x, startY, width, height)
           .fill('#f8fafc')
           .stroke('#e2e8f0');

        // Label
        doc.fontSize(9)
           .font('Helvetica-Bold')
           .fill('#374151')
           .text(label, x + 8, startY + 8, { width: width - 16 });

        // Value
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fill('#1e293b')
           .text(value.toString(), x + 8, startY + 25, { width: width - 16 });
    }

    // Adds simple data table
    addDataTable = (doc, data, type) => {
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fill('#1e293b')
           .text('Detailed Records', { align: 'left' })
           .moveDown(1);

        const tableTop = doc.y;
        const tableLeft = 40;
        const tableWidth = doc.page.width - 80;
        
        // Define column widths based on type
        let columns = [];
        if (type === 'users') {
            columns = [
                { name: 'Name', width: 0.25 },
                { name: 'Email', width: 0.35 },
                { name: 'Role', width: 0.15 },
                { name: 'Status', width: 0.15 },
                { name: 'Verified', width: 0.10 }
            ];
        } else if (type === 'bluebooks') {
            columns = [
                { name: 'Reg. No', width: 0.20 },
                { name: 'Owner', width: 0.25 },
                { name: 'Model', width: 0.20 },
                { name: 'Type', width: 0.15 },
                { name: 'Status', width: 0.20 }
            ];
        } else if (type === 'payments') {
            columns = [
                { name: 'Transaction ID', width: 0.25 },
                { name: 'User', width: 0.20 },
                { name: 'Amount', width: 0.15 },
                { name: 'Status', width: 0.15 },
                { name: 'Date', width: 0.25 }
            ];
        }

        // Draw table header
        this.drawTableHeader(doc, tableTop, tableLeft, tableWidth, columns);

        // Draw table rows
        let currentY = tableTop + 25;
        const rowHeight = 22;
        const maxRowsPerPage = Math.floor((doc.page.height - currentY - 100) / rowHeight);

        data.forEach((item, index) => {
            // Check if we need a new page
            if (index > 0 && index % maxRowsPerPage === 0) {
                doc.addPage();
                currentY = 80;
                this.drawTableHeader(doc, currentY - 25, tableLeft, tableWidth, columns);
            }

            this.drawTableRow(doc, currentY, tableLeft, tableWidth, columns, item, type);
            currentY += rowHeight;
        });

        doc.y = currentY + 20;
    }

    // Draws simple table header
    drawTableHeader = (doc, y, x, width, columns) => {
        let currentX = x;
        
        // Header background
        doc.rect(x, y, width, 25)
           .fill('#f1f5f9')
           .stroke('#e2e8f0');

        columns.forEach(column => {
            const columnWidth = width * column.width;
            
            // Header text
            doc.fontSize(9)
               .font('Helvetica-Bold')
               .fill('#374151')
               .text(column.name, currentX + 5, y + 6, { width: columnWidth - 10 });

            // Column separator
            if (currentX > x) {
                doc.moveTo(currentX, y)
                   .lineTo(currentX, y + 25)
                   .stroke('#e2e8f0');
            }

            currentX += columnWidth;
        });
    }

    // Draws table row
    drawTableRow = (doc, y, x, width, columns, item, type) => {
        let currentX = x;
        const rowData = this.getRowData(item, type);

        // Row background (alternating)
        const isEven = Math.floor(y / 22) % 2 === 0;
        if (isEven) {
            doc.rect(x, y, width, 22)
               .fill('#f8fafc');
        }

        columns.forEach((column, index) => {
            const columnWidth = width * column.width;
            const cellData = rowData[index] || 'N/A';
            
            // Cell text
            doc.fontSize(9)
               .font('Helvetica')
               .fill('#374151')
               .text(cellData, currentX + 5, y + 5, { width: columnWidth - 10 });

            // Column separator
            if (currentX > x) {
                doc.moveTo(currentX, y)
                   .lineTo(currentX, y + 22)
                   .stroke('#e2e8f0');
            }

            currentX += columnWidth;
        });

        // Row separator
        doc.moveTo(x, y + 22)
           .lineTo(x + width, y + 22)
           .stroke('#e2e8f0');
    }

    // Gets row data for table
    getRowData = (item, type) => {
        if (type === 'users') {
            return [
                item.name || 'N/A',
                item.email || 'N/A',
                item.role || 'N/A',
                item.status || 'N/A',
                item.isEmailVerified ? 'Yes' : 'No'
            ];
        } else if (type === 'bluebooks') {
            return [
                item.vehicleRegNo || 'N/A',
                item.vehicleOwnerName || 'N/A',
                item.vehicleModel || 'N/A',
                item.vehicleType || 'N/A',
                item.status || 'N/A'
            ];
        } else if (type === 'payments') {
            const userName = item.userId ? item.userId.name : 'Unknown';
            const amount = item.amount ? `Rs. ${item.amount}` : 'N/A';
            const status = item.status || item.paymentStatus || 'N/A';
            const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A';
            
            return [
                item.transactionId || 'N/A',
                userName,
                amount,
                status,
                date
            ];
        }
        return [];
    }

    // Adds simple report footer
    addReportFooter = (doc, totalRecords, type) => {
        doc.moveDown(2);
        
        // Simple separator line
        doc.moveTo(40, doc.y)
           .lineTo(doc.page.width - 40, doc.y)
           .stroke('#e2e8f0')
           .moveDown(1);

        // Summary
        doc.fontSize(11)
           .font('Helvetica-Bold')
           .fill('#1e293b')
           .text(`Total ${type}: ${totalRecords}`, { align: 'left' })
           .moveDown(0.5);

        doc.fontSize(9)
           .font('Helvetica')
           .fill('#64748b')
           .text('Generated by Bluebook Renewal System', { align: 'left' })
           .moveDown(1);

        // Simple page number
        doc.fontSize(8)
           .font('Helvetica')
           .fill('#94a3b8')
           .text('Page 1', doc.page.width - 80, doc.page.height - 30, { align: 'right' });
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
            let payment = await PaymentModel.findById(paymentId).populate('userId', 'name email');
            let isElectric = false;

            if (!payment) {
                payment = await ElectricPaymentModel.findById(paymentId).populate('userId', 'name email');
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

            // Create PDF document with modern settings
            const doc = new PDFDocument({
                size: 'A4',
                margin: 40,
                info: {
                    Title: 'Payment Receipt - Bluebook Renewal System',
                    Author: 'Bluebook Renewal System',
                    Subject: 'Payment Receipt',
                    Keywords: 'payment, receipt, bluebook, renewal',
                    CreationDate: new Date()
                }
            });

            // Set response headers
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="payment-receipt-${payment.transactionId || payment._id}.pdf"`);

            // Pipe PDF to response
            doc.pipe(res);

            // Add modern header
            this.addReceiptHeader(doc);

            // Add receipt metadata
            this.addReceiptMetadata(doc, payment);

            // Add payment details section
            this.addPaymentDetailsSection(doc, payment);

            // Add vehicle information section
            if (bluebook) {
                this.addVehicleDetailsSection(doc, bluebook, isElectric);
            }

            // Add user information section
            if (payment.userId) {
                this.addUserDetailsSection(doc, payment.userId);
            }

            // Add receipt footer
            this.addReceiptFooter(doc);

            // Finalize PDF
            doc.end();

        } catch (exception) {
            next(exception);
        }
    }

    // Adds modern header to payment receipt
    addReceiptHeader = (doc) => {
        // Header background
        doc.rect(0, 0, doc.page.width, 100)
           .fill('#10b981')
           .moveDown();

        // Title
        doc.fontSize(32)
           .font('Helvetica-Bold')
           .fill('#ffffff')
           .text('PAYMENT RECEIPT', { align: 'center' })
           .moveDown(0.5);

        // Subtitle
        doc.fontSize(16)
           .font('Helvetica')
           .fill('#d1fae5')
           .text('Bluebook Renewal System', { align: 'center' })
           .moveDown(2);

        // Reset fill color
        doc.fill('#000000');
    }

    // Adds receipt metadata
    addReceiptMetadata = (doc, payment) => {
        const currentDate = new Date();
        
        doc.fontSize(12)
           .font('Helvetica')
           .text(`Receipt ID: ${payment.transactionId || payment._id}`, { align: 'left' })
           .text(`Generated On: ${currentDate.toLocaleDateString('en-US', { 
               year: 'numeric', 
               month: 'long', 
               day: 'numeric',
               hour: '2-digit',
               minute: '2-digit'
           })}`, { align: 'left' })
           .text(`Payment Date: ${payment.createdAt ? new Date(payment.createdAt).toLocaleDateString('en-US', { 
               year: 'numeric', 
               month: 'long', 
               day: 'numeric'
           }) : 'N/A'}`, { align: 'left' })
           .moveDown(2);

        // Add separator line
        doc.moveTo(40, doc.y)
           .lineTo(doc.page.width - 40, doc.y)
           .stroke()
           .moveDown(2);
    }

    // Adds payment details section
    addPaymentDetailsSection = (doc, payment) => {
        doc.fontSize(18)
           .font('Helvetica-Bold')
           .text('💰 Payment Information', { align: 'left' })
           .moveDown(1);

        // Create payment details table
        const tableTop = doc.y;
        const tableLeft = 40;
        const tableWidth = doc.page.width - 80;

        // Payment details
        const paymentDetails = [
            ['Transaction ID', payment.transactionId || 'N/A'],
            ['Amount', `Rs. ${payment.amount || 0}`],
            ['Status', payment.status || payment.paymentStatus || 'N/A'],
            ['Payment Method', payment.paymentMethod || 'Khalti'],
            ['Payment Date', payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : 'N/A']
        ];

        // Draw payment details table
        this.drawReceiptTable(doc, tableTop, tableLeft, tableWidth, paymentDetails, '#10b981');

        doc.y = tableTop + (paymentDetails.length * 30) + 20;
        doc.moveDown(2);
    }

    // Adds vehicle details section
    addVehicleDetailsSection = (doc, bluebook, isElectric) => {
        doc.fontSize(18)
           .font('Helvetica-Bold')
           .text('🚗 Vehicle Information', { align: 'left' })
           .moveDown(1);

        const tableTop = doc.y;
        const tableLeft = 40;
        const tableWidth = doc.page.width - 80;

        // Vehicle details
        const vehicleDetails = [
            ['Vehicle Owner', bluebook.vehicleOwnerName || 'N/A'],
            ['Registration No', bluebook.vehicleRegNo || 'N/A'],
            ['Vehicle Model', bluebook.vehicleModel || 'N/A'],
            ['Vehicle Type', bluebook.vehicleType || 'N/A'],
            ['Vehicle Color', bluebook.vehicleColor || 'N/A'],
            ['Manufacture Year', bluebook.manufactureYear || 'N/A'],
            [isElectric ? 'Battery Capacity' : 'Engine CC', 
             isElectric ? `${bluebook.vehicleBatteryCapacity || 'N/A'} kWh` : `${bluebook.vehicleEngineCC || 'N/A'} CC`]
        ];

        // Draw vehicle details table
        this.drawReceiptTable(doc, tableTop, tableLeft, tableWidth, vehicleDetails, '#3b82f6');

        doc.y = tableTop + (vehicleDetails.length * 30) + 20;
        doc.moveDown(2);
    }

    // Adds user details section
    addUserDetailsSection = (doc, user) => {
        doc.fontSize(18)
           .font('Helvetica-Bold')
           .text('👤 User Information', { align: 'left' })
           .moveDown(1);

        const tableTop = doc.y;
        const tableLeft = 40;
        const tableWidth = doc.page.width - 80;

        // User details
        const userDetails = [
            ['Name', user.name || 'N/A'],
            ['Email', user.email || 'N/A'],
            ['Role', user.role || 'N/A'],
            ['Status', user.status || 'N/A']
        ];

        // Draw user details table
        this.drawReceiptTable(doc, tableTop, tableLeft, tableWidth, userDetails, '#8b5cf6');

        doc.y = tableTop + (userDetails.length * 30) + 20;
        doc.moveDown(2);
    }

    // Draws receipt table
    drawReceiptTable = (doc, y, x, width, data, color) => {
        const rowHeight = 30;
        let currentY = y;

        data.forEach((row, index) => {
            // Row background (alternating)
            if (index % 2 === 0) {
                doc.rect(x, currentY, width, rowHeight)
                   .fill('#f8fafc');
            }

            // Label (left column)
            doc.fontSize(10)
               .font('Helvetica-Bold')
               .fill('#374151')
               .text(row[0], x + 10, currentY + 8, { width: width * 0.4 - 20 });

            // Value (right column)
            doc.fontSize(10)
               .font('Helvetica')
               .fill('#1f2937')
               .text(row[1], x + width * 0.4 + 10, currentY + 8, { width: width * 0.6 - 20 });

            // Row separator
            doc.moveTo(x, currentY + rowHeight)
               .lineTo(x + width, currentY + rowHeight)
               .stroke('#e2e8f0');

            currentY += rowHeight;
        });

        // Table border
        doc.rect(x, y, width, data.length * rowHeight)
           .stroke(color)
           .opacity(0.5);
    }

    // Adds receipt footer
    addReceiptFooter = (doc) => {
        doc.moveDown(2);
        
        // Separator line
        doc.moveTo(40, doc.y)
           .lineTo(doc.page.width - 40, doc.y)
           .stroke()
           .moveDown(1);

        // Official statement
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('This is an official receipt from the Bluebook Renewal System.', { align: 'center' })
           .moveDown(0.5);

        doc.fontSize(10)
           .font('Helvetica')
           .text('This receipt serves as proof of payment for vehicle tax renewal.', { align: 'center' })
           .text('Please keep this receipt for your records.', { align: 'center' })
           .moveDown(1);

        // Contact information
        doc.fontSize(9)
           .font('Helvetica')
           .text('For any queries, please contact the system administrator.', { align: 'center' })
           .text('Email: admin@bluebookrenewal.com | Phone: +977-1-4XXXXXX', { align: 'center' })
           .moveDown(1);

        // Page number
        doc.fontSize(8)
           .font('Helvetica')
           .text('Page 1 of 1', doc.page.width - 80, doc.page.height - 30, { align: 'right' });
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