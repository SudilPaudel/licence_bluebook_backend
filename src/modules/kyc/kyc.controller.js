const UserModel = require('../user/user.model');

class KycController {
    // Submit KYC form
    submitKyc = async (req, res, next) => {
        try {
            const userId = req.authUser._id;
            const {
                fullName,
                fullNameNepali,
                dateOfBirth,
                gender,
                nationality,
                province,
                district,
                municipality,
                wardNo,
                tole,
                citizenshipNo,
                citizenshipIssueDate,
                citizenshipIssueDistrict,
                fatherName,
                motherName,
                grandfatherName
            } = req.body;

            // Get file paths if uploaded
            const frontImage = req.files?.frontImage ? `/uploads/kyc/${req.files.frontImage[0].filename}` : null;
            const backImage = req.files?.backImage ? `/uploads/kyc/${req.files.backImage[0].filename}` : null;

            if (!frontImage || !backImage) {
                return res.status(400).json({ message: 'Both front and back citizenship images are required' });
            }

            // Update user with KYC details
            const user = await UserModel.findByIdAndUpdate(
                userId,
                {
                    kycStatus: 'pending',
                    kycDetails: {
                        fullName,
                        fullNameNepali,
                        dateOfBirth,
                        gender,
                        nationality,
                        province,
                        district,
                        municipality,
                        wardNo,
                        tole,
                        citizenshipNo,
                        citizenshipIssueDate,
                        citizenshipIssueDistrict,
                        fatherName,
                        motherName,
                        grandfatherName,
                        frontImage,
                        backImage,
                        submittedAt: new Date()
                    }
                },
                { new: true }
            ).select('-password -activationToken');

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.status(200).json({
                message: 'KYC submitted successfully',
                result: user
            });
        } catch (exception) {
            console.error('KYC submission error:', exception);
            res.status(500).json({ 
                message: exception.message || 'Failed to submit KYC', 
                error: exception.message 
            });
        }
    }

    // Get current user's KYC status
    getMyKyc = async (req, res, next) => {
        try {
            const userId = req.authUser._id;
            
            const user = await UserModel.findById(userId).select('kycStatus kycDetails');
            
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.status(200).json({
                kycStatus: user.kycStatus,
                kycDetails: user.kycDetails
            });
        } catch (exception) {
            console.error('Get KYC error:', exception);
            res.status(500).json({ 
                message: exception.message || 'Failed to get KYC status', 
                error: exception.message 
            });
        }
    }

    // Update KYC details (resets status to pending for re-verification)
    updateKyc = async (req, res, next) => {
        try {
            const userId = req.authUser._id;
            const {
                fullName,
                fullNameNepali,
                dateOfBirth,
                gender,
                nationality,
                province,
                district,
                municipality,
                wardNo,
                tole,
                citizenshipNo,
                citizenshipIssueDate,
                citizenshipIssueDistrict,
                fatherName,
                motherName,
                grandfatherName
            } = req.body;

            // Get file paths if uploaded
            const frontImage = req.files?.frontImage ? `/uploads/kyc/${req.files.frontImage[0].filename}` : null;
            const backImage = req.files?.backImage ? `/uploads/kyc/${req.files.backImage[0].filename}` : null;

            // Get existing KYC details to preserve images if not re-uploaded
            const existingUser = await UserModel.findById(userId);
            const existingKyc = existingUser?.kycDetails || {};

            // Use new images if uploaded, otherwise keep existing
            const finalFrontImage = frontImage || existingKyc.frontImage;
            const finalBackImage = backImage || existingKyc.backImage;

            if (!finalFrontImage || !finalBackImage) {
                return res.status(400).json({ message: 'Both front and back citizenship images are required' });
            }

            // Update user with KYC details and reset status to pending
            const user = await UserModel.findByIdAndUpdate(
                userId,
                {
                    kycStatus: 'pending',
                    kycDetails: {
                        fullName: fullName || existingKyc.fullName,
                        fullNameNepali: fullNameNepali || existingKyc.fullNameNepali,
                        dateOfBirth: dateOfBirth || existingKyc.dateOfBirth,
                        gender: gender || existingKyc.gender,
                        nationality: nationality || existingKyc.nationality,
                        province: province || existingKyc.province,
                        district: district || existingKyc.district,
                        municipality: municipality || existingKyc.municipality,
                        wardNo: wardNo || existingKyc.wardNo,
                        tole: tole || existingKyc.tole,
                        citizenshipNo: citizenshipNo || existingKyc.citizenshipNo,
                        citizenshipIssueDate: citizenshipIssueDate || existingKyc.citizenshipIssueDate,
                        citizenshipIssueDistrict: citizenshipIssueDistrict || existingKyc.citizenshipIssueDistrict,
                        fatherName: fatherName || existingKyc.fatherName,
                        motherName: motherName || existingKyc.motherName,
                        grandfatherName: grandfatherName || existingKyc.grandfatherName,
                        frontImage: finalFrontImage,
                        backImage: finalBackImage,
                        submittedAt: new Date(),
                        updatedAt: new Date()
                    }
                },
                { new: true }
            ).select('-password -activationToken');

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.status(200).json({
                message: 'KYC updated successfully. Your verification is pending review.',
                result: user
            });
        } catch (exception) {
            console.error('KYC update error:', exception);
            res.status(500).json({ 
                message: exception.message || 'Failed to update KYC', 
                error: exception.message 
            });
        }
    }

    // Admin: Get all users with KYC status
    getAllUsersKyc = async (req, res, next) => {
        try {
            const users = await UserModel.find({})
                .select('name email kycStatus kycDetails createdAt')
                .sort({ createdAt: -1 });

            res.status(200).json({
                result: users
            });
        } catch (exception) {
            console.error('Get all users KYC error:', exception);
            res.status(500).json({ 
                message: exception.message || 'Failed to get users', 
                error: exception.message 
            });
        }
    }

    // Admin: Get specific user's KYC details
    getUserKyc = async (req, res, next) => {
        try {
            const { userId } = req.params;
            
            const user = await UserModel.findById(userId).select('kycStatus kycDetails name email');
            
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.status(200).json({
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email
                },
                kycStatus: user.kycStatus,
                kycDetails: user.kycDetails
            });
        } catch (exception) {
            console.error('Get user KYC error:', exception);
            res.status(500).json({ 
                message: exception.message || 'Failed to get user KYC', 
                error: exception.message 
            });
        }
    }

    // Admin: Approve KYC
    approveKyc = async (req, res, next) => {
        try {
            const { userId } = req.params;
            
            const user = await UserModel.findByIdAndUpdate(
                userId,
                {
                    kycStatus: 'verified',
                    'kycDetails.verifiedAt': new Date()
                },
                { new: true }
            ).select('-password -activationToken');

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.status(200).json({
                message: 'KYC approved successfully',
                result: user
            });
        } catch (exception) {
            console.error('Approve KYC error:', exception);
            res.status(500).json({ 
                message: exception.message || 'Failed to approve KYC', 
                error: exception.message 
            });
        }
    }

    // Admin: Reject KYC
    rejectKyc = async (req, res, next) => {
        try {
            const { userId } = req.params;
            const { reason } = req.body;
            
            const user = await UserModel.findByIdAndUpdate(
                userId,
                {
                    kycStatus: 'rejected',
                    'kycDetails.rejectedAt': new Date(),
                    'kycDetails.rejectionReason': reason || 'KYC verification failed'
                },
                { new: true }
            ).select('-password -activationToken');

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.status(200).json({
                message: 'KYC rejected',
                result: user
            });
        } catch (exception) {
            console.error('Reject KYC error:', exception);
            res.status(500).json({ 
                message: exception.message || 'Failed to reject KYC', 
                error: exception.message 
            });
        }
    }
}

module.exports = new KycController();
