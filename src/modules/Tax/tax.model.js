const mongoose = require("mongoose");


const TaxSchema = new mongoose.Schema({
    baseTax:{
        type: Number,
        require: true
    },
    renewalCharge:{
        type: Number,
        require: 'true'
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

const TaxModel = mongoose.model("Tax", TaxSchema)

module.exports = TaxModel;