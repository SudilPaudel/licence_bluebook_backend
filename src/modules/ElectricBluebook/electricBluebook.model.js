const mongoose = require('mongoose');

const ElectricBluebookSchema = new mongoose.Schema({
    isElectric:{
        type: Boolean,
        default: true
    },
    vehicleRegNo: {
        type: String,
        require: true
    },
    vehicleType: {
        type: String,
        require: true
    },
    vehicleRegistrationDate: {
        type: Date,
        require: true
    },
    vehicleOwnerName: {
        type: String,
        require: true
    },
    vehicleModel: {
        type: String,
        require: true
    },
    manufactureYear: {
        type: String,
        require: true
    },
    chasisNumber: {
        type: String,
        require: true
    },
    vehicleColor: {
        type: String,
        require: true
    },
    vehicleBatteryCapacity: {
        type: Number,
        require: true
    },
    vehicleNumber: {
        type: String,
        require: true,
    },
    taxPayDate: {
        type: Date,
        require: true

    },
    taxExpireDate: {
        type: Date,
        require: true
    },
    status: {
        type: String,
        enum: ["pending", "verified", "rejected"],
        default: "pending"
    },

    createdBy: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        default: null
    },
    updatededBy: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        default: null
    }
},{
    timestamps: true,
    autoCreate: true,
    autoIndex: true
})

const ElectricBluebookModel = mongoose.model('ElectricBluebook', ElectricBluebookSchema);
module.exports = ElectricBluebookModel;