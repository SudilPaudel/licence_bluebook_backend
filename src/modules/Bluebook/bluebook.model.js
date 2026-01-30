const mongoose = require("mongoose");
// seperate schema for address as 2 of the attribute shares the same schema 


const BluebookSchema = new mongoose.Schema({
    vehicleRegNo:{
        type: String,
        require: true
    },
    vehicleType:{
        type: String,
        require: true
    },
    VehicleRegistrationDate:{
        type: Date,
        require: true
    },
    vehicleOwnerName:{
        type: String,
        require: true
    },
    vehicleModel:{
        type:  String,
        require: true
    },
    manufactureYear:{
        type: Number,
        require: true
    },
    chasisNumber:{
        type: String,
        require: true
    },
    vehicleColor: {
        type:String,
        require: true
    },
    vehicleEngineCC:{
        type: Number,
        require: true
    },
    vehicleNumber:{
        type: String,
        require: true,
    },
    taxPayDate: {
        type: Date,
        require: true

    },
    taxExpireDate:{
        type:Date,
        require: true
    },
    status:{
        type: String,
        enum: ["pending","verified","rejected"],
        default: "pending"
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

const BluebookModel = mongoose.model("Bluebook", BluebookSchema)

module.exports = BluebookModel ;