const electricBluebookSvc = require("./electricBluebook.service");
const PDFDocument = require('pdfkit');

require("dotenv").config();

class ElectricBluebookController {
    createBluebook = async (req, res, next) => {
        try {
        
            const data = electricBluebookSvc.transformCreateData(req);
            const bluebooknewData = {
                ...data,
                isElectric: true,
                createdBy: req.authUser
            }

            const electricBluebookData = await electricBluebookSvc.createBluebook(bluebooknewData);

            res.status(201).json({
                result: electricBluebookData,
                message: "Bluebook Created for electric vehicle Successfully",
                meta: null
            })
        } catch (exception) {
            console.error('Error creating electric bluebook:', exception);
            next(exception);
        }

    }
    verifyBluebook = async (req, res, next) => {
        try {
            const id = req.params.id;
            const associatedBluebook = await electricBluebookSvc.findOneBluebook({
                _id: id
            })
            if (!associatedBluebook) {
                throw { code: 400, message: 'Electric Vehicle Bluebook with the id does not exist' }
            }
            const updatedResult = await electricBluebookSvc.verifydata({
                status: 'verified',
                updatededBy: req.authUser
            }, associatedBluebook._id);
            res.status(200).json({
                result: updatedResult,
                message: "Electric Vehicle Bluebook Verified Successfully"
            })
        } catch (exception) {
            next(exception);
        }
    }
    fetchBluebook = async (req, res, next) => {
        try {
            const { vehicleRegNo, vehicleOwnerName, vehicleModel, vehicleNumber } = req.body;
            const query = {};
            if (vehicleRegNo) query.vehicleRegNo = vehicleRegNo;
            if (vehicleOwnerName) query.vehicleOwnerName = vehicleOwnerName;
            if (vehicleModel) query.vehicleModel = vehicleModel;
            if (vehicleNumber) query.vehicleNumber = vehicleNumber;

            if (Object.keys(query).length === 0) {
                return res.status(400).json({ message: "Please provide at least one search field." });
            }
            const electricBluebookData = await electricBluebookSvc.findManyBluebooks(query);
            if (!electricBluebookData || electricBluebookData.length === 0) {
                return res.status(404).json({ message: "No bluebook record with the provided data" });
            }

            // Optionally, filter for only verified bluebooks
            // const verifiedBluebooks = bluebookData.filter(bb => bb.status === "verified");

            res.status(200).json({
                result: electricBluebookData,
                message: "Bluebook(s) fetched successfully",
                meta: null
            });
        } catch (exception) {
            next(exception);
        }
    }
    fetchBluebookById = async (req, res, next) => {
        try {
            const id = req.params.id
    
            const bluebookData = await electricBluebookSvc.findOneBluebook({
                _id: id
            })

            
            if (!bluebookData) {
                return res.status(404).json({
                    message: "Electric bluebook not found",
                    meta: null
                })
            }
            
            if (bluebookData.status === "pending") {
                return res.status(400).json({
                    message: "Please wait for the admin to verify the bluebook details",
                    meta: null
                })
            }
            res.status(200).json({
                result: bluebookData,
                message: "Bluebook by id fetched successfully",
                meta: null
            })
        } catch (exception) {
            console.error('Error fetching electric bluebook:', exception);
            next(exception)
        }
    }
    getMyBluebook = async (req, res, next) => {
        try {
            const userId = req.authUser._id; // assuming it's added by middleware

            const result = await electricBluebookSvc.findManyBluebooks({
                createdBy: userId
            });

            res.status(200).json({
                result: result,
                message: "Fetched user's bluebooks successfully",
                meta: null
            });
        } catch (exception) {
            next(exception)
        }
    }
    downloadBluebook = async (req, res, next) => {
        try {
            const id = req.params.id;
            const bluebookData = await electricBluebookSvc.findOneBluebook({ _id: id });

            if (!bluebookData) {
                return res.status(404).json({
                    message: "Bluebook not found",
                    meta: null
                });
            }

            // Check if user has permission to download this bluebook
            if (bluebookData.createdBy.toString() !== req.authUser._id.toString()) {
                return res.status(403).json({
                    message: "You don't have permission to download this bluebook",
                    meta: null
                });
            }

            // Create PDF document with modern settings
            const doc = new PDFDocument({
                size: 'A4',
                margin: 40,
                info: {
                    Title: 'Electric Vehicle Bluebook Certificate - Bluebook Renewal System',
                    Author: 'Department of Transport Management',
                    Subject: 'Electric Vehicle Registration Certificate',
                    Keywords: 'electric, bluebook, vehicle, registration, certificate',
                    CreationDate: new Date()
                }
            });

            // Set response headers
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="electric-bluebook-${bluebookData.vehicleRegNo}.pdf"`);

            // Pipe PDF to response
            doc.pipe(res);

            // Add modern header
            this.addElectricBluebookHeader(doc);

            // Add certificate metadata
            this.addElectricCertificateMetadata(doc, bluebookData);

            // Add vehicle information section
            this.addElectricVehicleInformationSection(doc, bluebookData);

            // Add owner information section
            this.addElectricOwnerInformationSection(doc, bluebookData);

            // Add tax information section
            this.addElectricTaxInformationSection(doc, bluebookData);

            // Add certificate footer
            this.addElectricCertificateFooter(doc);

            // Finalize PDF
            doc.end();

        } catch (exception) {
            next(exception);
        }
    }

    // Adds modern header to electric bluebook certificate
    addElectricBluebookHeader = (doc) => {
        // Header background
        doc.rect(0, 0, doc.page.width, 100)
           .fill('#10b981')
           .moveDown();

        // Title
        doc.fontSize(32)
           .font('Helvetica-Bold')
           .fill('#ffffff')
           .text('ELECTRIC VEHICLE BLUEBOOK CERTIFICATE', { align: 'center' })
           .moveDown(0.5);

        // Subtitle
        doc.fontSize(16)
           .font('Helvetica')
           .fill('#d1fae5')
           .text('Government of Nepal', { align: 'center' })
           .text('Department of Transport Management', { align: 'center' })
           .moveDown(2);

        // Reset fill color
        doc.fill('#000000');
    }

    // Adds certificate metadata
    addElectricCertificateMetadata = (doc, bluebookData) => {
        const currentDate = new Date();
        
        doc.fontSize(12)
           .font('Helvetica')
           .text(`Certificate ID: ${bluebookData._id}`, { align: 'left' })
           .text(`Generated On: ${currentDate.toLocaleDateString('en-US', { 
               year: 'numeric', 
               month: 'long', 
               day: 'numeric',
               hour: '2-digit',
               minute: '2-digit'
           })}`, { align: 'left' })
           .text(`Status: ${bluebookData.status.toUpperCase()}`, { align: 'left' })
           .moveDown(2);

        // Add separator line
        doc.moveTo(40, doc.y)
           .lineTo(doc.page.width - 40, doc.y)
           .stroke()
           .moveDown(2);
    }

    // Adds vehicle information section
    addElectricVehicleInformationSection = (doc, bluebookData) => {
        doc.fontSize(18)
           .font('Helvetica-Bold')
           .text('🔋 Electric Vehicle Information', { align: 'left' })
           .moveDown(1);

        const tableTop = doc.y;
        const tableLeft = 40;
        const tableWidth = doc.page.width - 80;

        // Vehicle details
        const vehicleDetails = [
            ['Registration Number', bluebookData.vehicleRegNo || 'N/A'],
            ['Vehicle Type', bluebookData.vehicleType || 'N/A'],
            ['Vehicle Model', bluebookData.vehicleModel || 'N/A'],
            ['Manufacture Year', bluebookData.manufactureYear ? bluebookData.manufactureYear.toString() : 'N/A'],
            ['Vehicle Number', bluebookData.vehicleNumber || 'N/A'],
            ['Chassis Number', bluebookData.chasisNumber || 'N/A'],
            ['Vehicle Color', bluebookData.vehicleColor || 'N/A'],
            ['Battery Capacity', bluebookData.vehicleBatteryCapacity ? `${bluebookData.vehicleBatteryCapacity} kWh` : 'N/A']
        ];

        // Draw vehicle details table
        this.drawElectricCertificateTable(doc, tableTop, tableLeft, tableWidth, vehicleDetails, '#10b981');

        doc.y = tableTop + (vehicleDetails.length * 30) + 20;
        doc.moveDown(2);
    }

    // Adds owner information section
    addElectricOwnerInformationSection = (doc, bluebookData) => {
        doc.fontSize(18)
           .font('Helvetica-Bold')
           .text('👤 Owner Information', { align: 'left' })
           .moveDown(1);

        const tableTop = doc.y;
        const tableLeft = 40;
        const tableWidth = doc.page.width - 80;

        // Owner details
        const ownerDetails = [
            ['Owner Name', bluebookData.vehicleOwnerName || 'N/A'],
            ['Registration Date', bluebookData.vehicleRegistrationDate ? new Date(bluebookData.vehicleRegistrationDate).toLocaleDateString() : 'N/A']
        ];

        // Draw owner details table
        this.drawElectricCertificateTable(doc, tableTop, tableLeft, tableWidth, ownerDetails, '#3b82f6');

        doc.y = tableTop + (ownerDetails.length * 30) + 20;
        doc.moveDown(2);
    }

    // Adds tax information section
    addElectricTaxInformationSection = (doc, bluebookData) => {
        doc.fontSize(18)
           .font('Helvetica-Bold')
           .text('💰 Tax Information', { align: 'left' })
           .moveDown(1);

        const tableTop = doc.y;
        const tableLeft = 40;
        const tableWidth = doc.page.width - 80;

        // Tax details
        const taxDetails = [
            ['Tax Pay Date', bluebookData.taxPayDate ? new Date(bluebookData.taxPayDate).toLocaleDateString() : 'N/A'],
            ['Tax Expire Date', bluebookData.taxExpireDate ? new Date(bluebookData.taxExpireDate).toLocaleDateString() : 'N/A'],
            ['Certificate Status', bluebookData.status.toUpperCase()]
        ];

        // Draw tax details table
        this.drawElectricCertificateTable(doc, tableTop, tableLeft, tableWidth, taxDetails, '#f59e0b');

        doc.y = tableTop + (taxDetails.length * 30) + 20;
        doc.moveDown(2);
    }

    // Draws certificate table
    drawElectricCertificateTable = (doc, y, x, width, data, color) => {
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

    // Adds certificate footer
    addElectricCertificateFooter = (doc) => {
        doc.moveDown(2);
        
        // Separator line
        doc.moveTo(40, doc.y)
           .lineTo(doc.page.width - 40, doc.y)
           .stroke()
           .moveDown(1);

        // Official statement
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('This is an official certificate from the Department of Transport Management.', { align: 'center' })
           .moveDown(0.5);

        doc.fontSize(10)
           .font('Helvetica')
           .text('This certificate serves as proof of electric vehicle registration and tax payment.', { align: 'center' })
           .text('Please keep this certificate for your records.', { align: 'center' })
           .moveDown(1);

        // Contact information
        doc.fontSize(9)
           .font('Helvetica')
           .text('For any queries, please contact the Department of Transport Management.', { align: 'center' })
           .text('Email: info@transport.gov.np | Phone: +977-1-4XXXXXX', { align: 'center' })
           .moveDown(1);

        // Page number
        doc.fontSize(8)
           .font('Helvetica')
           .text('Page 1 of 1', doc.page.width - 80, doc.page.height - 30, { align: 'right' });
    }
    getAllBluebooks = async (req, res, next) => {
        try {
            const result = await electricBluebookSvc.findManyBluebooks({});

            res.status(200).json({
                result: result,
                message: "All bluebooks fetched successfully",
                meta: {
                    total: result.length,
                    pending: result.filter(bb => bb.status === 'pending').length,
                    verified: result.filter(bb => bb.status === 'verified').length
                }
            });
        } catch (exception) {
            next(exception);
        }
    }
    getPendingBluebooks = async (req, res, next) => {
            try {
                const result = await electricBluebookSvc.findManyBluebooks({ status: 'pending' });
                
                res.status(200).json({
                    result: result,
                    message: "Pending bluebooks fetched successfully",
                    meta: {
                        total: result.length
                    }
                });
            } catch (exception) {
                next(exception);
            }
        }
    
        // Fetches all bluebooks with status 'verified' for admin.
        getVerifiedBluebooks = async (req, res, next) => {
            try {
                const result = await electricBluebookSvc.findManyBluebooks({ status: 'verified' });
                
                res.status(200).json({
                    result: result,
                    message: "Verified bluebooks fetched successfully",
                    meta: {
                        total: result.length
                    }
                });
            } catch (exception) {
                next(exception);
            }
        }
    
        // Rejects a pending bluebook by ID and updates its status to 'rejected'.
        rejectBluebook = async (req, res, next) => {
            try {
                const id = req.params.id;
                const associatedBluebook = await electricBluebookSvc.findOneBluebook({
                    _id: id
                });
                
                if (!associatedBluebook) {
                    throw { code: 400, message: 'Bluebook with the id does not exist' };
                }
                
                if (associatedBluebook.status !== 'pending') {
                    throw { code: 400, message: 'Only pending bluebooks can be rejected' };
                }
                
                const updatedResult = await electricBluebookSvc.verifydata({
                    status: 'rejected'
                }, associatedBluebook._id);
                
                res.json({
                    result: updatedResult,
                    message: "Bluebook rejected successfully."
                });
            } catch (exception) {
                next(exception);
            }
        }
    
        // Updates a bluebook's information by ID after validating required fields and status.
        updateBluebook = async (req, res, next) => {
            try {
                const id = req.params.id;
                const updateData = req.body;
                
                // Check if bluebook exists
                const existingBluebook = await electricBluebookSvc.findOneBluebook({ _id: id });
                if (!existingBluebook) {
                    throw { code: 404, message: 'Bluebook not found' };
                }
                
                // Validate required fields
                const requiredFields = [
                    'vehicleRegNo', 'vehicleOwnerName', 'vehicleType', 'vehicleModel',
                    'manufactureYear', 'chasisNumber', 'vehicleColor', 'vehicleBatteryCapacity', 'vehicleNumber'
                ];
                
                for (const field of requiredFields) {
                    if (!updateData[field]) {
                        throw { code: 400, message: `${field} is required` };
                    }
                }
                
                // Validate status
                if (updateData.status && !['pending', 'verified', 'rejected'].includes(updateData.status)) {
                    throw { code: 400, message: 'Invalid status. Must be pending, verified, or rejected' };
                }
                
                // Update the bluebook
                const updatedBluebook = await electricBluebookSvc.updateBluebook(updateData, id);
                
                res.json({
                    result: updatedBluebook,
                    message: "Bluebook updated successfully",
                    meta: null
                });
            } catch (exception) {
                next(exception);
            }
        }
}

const electricBluebookCtrl = new ElectricBluebookController();
module.exports = electricBluebookCtrl;