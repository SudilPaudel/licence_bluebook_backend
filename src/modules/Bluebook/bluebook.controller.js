const authSvc = require("../auth/auth.service");
const bluebookSvc = require("./bluebook.service");
const { createPdfDoc, renderBluebookCertificate } = require('../../utils/pdfTemplates');

require("dotenv").config();

class BluebookController {
    // Handles creation of a new bluebook record using request data and authenticated user.
    createBluebook = async (req, res, next) => {
        try {
            // Check if user has verified KYC
            const user = await authSvc.findOneUser({ _id: req.authUser._id });
            if (!user) {
                throw { code: 404, message: 'User not found' };
            }
            if (user.kycStatus !== 'verified') {
                throw { code: 403, message: 'KYC verification required before registering a bluebook. Please complete your KYC first.' };
            }
            
            const data = bluebookSvc.transformCreateData(req);
            const bluebooknewData = {
                ...data,
                createdBy: req.authUser
            }
            const bluebookData = await bluebookSvc.createBluebook(bluebooknewData);
            res.status(201).json({
                result: bluebookData,
                message: "Bluebook Created Successfully",
                meta: null
            })
        } catch (exception) {
            next(exception)
        }
    }

    // Verifies a bluebook by ID and updates its status to 'verified'.
    verifyBluebook = async (req, res, next) => {
        try {
            const id = req.params.id
            const asssociatedBluebook = await bluebookSvc.findOneBluebook({
                _id: id
            })
            if (!asssociatedBluebook) {
                throw { code: 400, message: 'Bluebook with the id doessnot exists' }
            }
            const updatedResult = await bluebookSvc.verifydata({
                status: 'verified'

            }, asssociatedBluebook._id)
            res.json({
                result: updatedResult,
                message: "Bluebook verified successfully. "
            })
        } catch (exception) {
            next(exception)
        }
    }

    // Fetches bluebooks based on provided search fields in the request body.
    fetchBluebook = async (req, res, next) => {
        try {
            // Build dynamic query from provided fields
            const { vehicleRegNo, vehicleOwnerName, vehicleModel, vehicleNumber } = req.body;
            const query = {};
            if (vehicleRegNo) query.vehicleRegNo = vehicleRegNo;
            if (vehicleOwnerName) query.vehicleOwnerName = vehicleOwnerName;
            if (vehicleModel) query.vehicleModel = vehicleModel;
            if (vehicleNumber) query.vehicleNumber = vehicleNumber;

            if (Object.keys(query).length === 0) {
                return res.status(400).json({ message: "Please provide at least one search field." });
            }

            // Find all matching bluebooks
            const bluebookData = await bluebookSvc.findManyBluebooks(query);

            if (!bluebookData || bluebookData.length === 0) {
                return res.status(404).json({ message: "No bluebook record with the provided data" });
            }

            // Optionally, filter for only verified bluebooks
            // const verifiedBluebooks = bluebookData.filter(bb => bb.status === "verified");

            res.status(200).json({
                result: bluebookData,
                message: "Bluebook(s) fetched successfully",
                meta: null
            });
        } catch (exception) {
            next(exception)
        }
    }

    // Fetches a single bluebook by its ID and checks its verification status.
    fetchBluebookById = async (req, res, next) => {
        try {
            const id = req.params.id
            const bluebookData = await bluebookSvc.findOneBluebook({
                _id: id
            })
            if(bluebookData.status === "pending"){
                res.status(400).json({
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
            next(exception)
        }
    }

    // Retrieves all bluebooks created by the currently authenticated user.
    getMyBluebook = async (req, res, next) => {
        try {
            const userId = req.authUser._id; // assuming it's added by middleware
            let page = parseInt(req.query.page) || 1;
            if (page < 1) page = 1;

            let limit = parseInt(req.query.limit) || 10;
            if (limit < 1) limit = 10;

            const { bluebooks, count } = await bluebookSvc.findManyBluebooks(
                { createdBy: userId },
                { page, limit }
            );

            res.status(200).json({
                result: bluebooks,
                message: "Fetched user's bluebooks successfully",
                meta: {
                    total: count,
                    currentPage: page,
                    totalPages: Math.ceil(count / limit),
                }
            });
        } catch (exception) {
            next(exception)
        }
    }

    // Generates and streams a PDF certificate for a bluebook if the user has permission.
    downloadBluebook = async (req, res, next) => {
        try {
            const id = req.params.id;
            const bluebookData = await bluebookSvc.findOneBluebook({ _id: id });
            
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

            if (bluebookData.status !== 'verified') {
                return res.status(403).json({
                    message: "Bluebook must be verified before it can be downloaded",
                    meta: null
                });
            }

            const doc = createPdfDoc({
                info: {
                    Title: 'Vehicle Registration Certificate - Bluebook',
                    Author: 'Department of Transport Management',
                    Subject: 'Motor Vehicle Registration Certificate',
                    Keywords: 'bluebook, vehicle, registration, certificate, nepal',
                    CreationDate: new Date(),
                },
            });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="bluebook-${bluebookData.vehicleRegNo}.pdf"`);

            doc.pipe(res);
            renderBluebookCertificate(doc, bluebookData, 'petrol');
            doc.end();

        } catch (exception) {
            next(exception);
        }
    }

    // Admin methods
    // Fetches all bluebooks for admin, with meta statistics for pending and verified.
    getAllBluebooks = async (req, res, next) => {
        try {
            const { bluebooks, count } = await bluebookSvc.findManyBluebooks({});
            const all = bluebooks || [];
            
            res.status(200).json({
                result: all,
                message: "All bluebooks fetched successfully",
                meta: {
                    total: count,
                    pending: all.filter(bb => bb.status === 'pending').length,
                    verified: all.filter(bb => bb.status === 'verified').length
                }
            });
        } catch (exception) {
            next(exception);
        }
    }

    // Fetches all bluebooks with status 'pending' for admin review.
    getPendingBluebooks = async (req, res, next) => {
        try {
            const { bluebooks, count } = await bluebookSvc.findManyBluebooks({ status: 'pending' });
            const pending = bluebooks || [];
            
            res.status(200).json({
                result: pending,
                message: "Pending bluebooks fetched successfully",
                meta: {
                    total: count
                }
            });
        } catch (exception) {
            next(exception);
        }
    }

    // Fetches all bluebooks with status 'verified' for admin.
    getVerifiedBluebooks = async (req, res, next) => {
        try {
            const { bluebooks, count } = await bluebookSvc.findManyBluebooks({ status: 'verified' });
            const verified = bluebooks || [];
            
            res.status(200).json({
                result: verified,
                message: "Verified bluebooks fetched successfully",
                meta: {
                    total: count
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
            const associatedBluebook = await bluebookSvc.findOneBluebook({
                _id: id
            });
            
            if (!associatedBluebook) {
                throw { code: 400, message: 'Bluebook with the id does not exist' };
            }
            
            if (associatedBluebook.status !== 'pending') {
                throw { code: 400, message: 'Only pending bluebooks can be rejected' };
            }
            
            const updatedResult = await bluebookSvc.verifydata({
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

    updateReminderPreference = async (req, res, next) => {
        try {
            const id = req.params.id;
            const { sendExpiryReminder } = req.body;

            if (typeof sendExpiryReminder !== 'boolean') {
                throw { code: 400, message: 'sendExpiryReminder must be a boolean value' };
            }

            const bluebook = await bluebookSvc.findOneBluebook({ _id: id });
            if (!bluebook) {
                throw { code: 404, message: 'Bluebook not found' };
            }

            if (bluebook.createdBy.toString() !== req.authUser._id.toString()) {
                throw { code: 403, message: "You don't have permission to update this bluebook" };
            }

            const updatedBluebook = await bluebookSvc.updateBluebook(
                { sendExpiryReminder },
                id
            );

            res.json({
                result: updatedBluebook,
                message: sendExpiryReminder
                    ? 'Expiry reminder enabled successfully'
                    : 'Expiry reminder disabled successfully',
                meta: null,
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
            const existingBluebook = await bluebookSvc.findOneBluebook({ _id: id });
            if (!existingBluebook) {
                throw { code: 404, message: 'Bluebook not found' };
            }
            
            // Validate required fields
            const requiredFields = [
                'vehicleRegNo', 'vehicleOwnerName', 'vehicleType', 'vehicleModel',
                'manufactureYear', 'chasisNumber', 'vehicleColor', 'vehicleEngineCC', 'vehicleNumber'
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
            const updatedBluebook = await bluebookSvc.updateBluebook(updateData, id);
            
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

const bluebookCtrl = new BluebookController()
module.exports = bluebookCtrl;