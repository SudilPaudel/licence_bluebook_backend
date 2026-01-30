const mongoose = require("mongoose");

const ElectricTaxSchema = new mongoose.Schema({
    baseTax:{
        type: Number,
        require: true
    },
    renewalCharge:{
        type: Number,
        require: true
    },
    fineAmount:{
        type: Number,
        default: 0,
        require: true
    },
    oldVehicleTax: {
        type: Number,
        default: 0,
        require: true
    },
    TotalTaxAmount: {
        type: Number,
        require: true
    },
    vehicleType: {
        type: String,
        require: true
    },
    batteryCapacity: {
        type: Number,
        require: true
    },
    createdBy:{
        type: mongoose.Types.ObjectId,
        ref: "User",
        default: null
    },
    updatededBy:{
        type: mongoose.Types.ObjectId,
        ref: "User",
        default: null
    }
},
{
    timestamps: true,
    autoCreate: true,
    autoIndex: true
}
)

const ElectricTaxModel = mongoose.model("ElectricTax", ElectricTaxSchema)

module.exports = ElectricTaxModel; 