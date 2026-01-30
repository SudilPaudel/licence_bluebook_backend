const mongoose = require("mongoose");

// seperate schema for address as 2 of the attribute shares the same schema 
const AddressSchema = new mongoose.Schema({
    houseNo: String,
    streetName: String,
    province: String,
    district: String

})

const UserSchema = new mongoose.Schema({
    name:{
        type: String,
        require: true,
        min: 2,
        max: 50
    },
    email:{
        type: String,
        unique: true,
        require: true
    },
citizenshipNo:{
        type: String,
        unique: false,
        require: true
    },
    password:{
        type: String,
        require: true
    },
    role:{
        type: String,
        enum: ['admin','user'],
        default: "user"
    },
    activationToken:{
        type: String
    },
    status:{
        type: String,
        enum: ["active","inactive","pending"],
        default: "pending"
    },
    emailOtp: {
        type: String,
        default: null
    },
    emailOtpExpiresAt: {
        type: Date,
        default: null
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    phone:{
        type: String
    },
    image: String,
    resetToken:{
        type: String,
        default: null
    },
    resetTokenExpiresAt: {
        type: Date,
        default: null
    },
    address:{
        permanentAddress: AddressSchema,
        temporaryAddress: AddressSchema
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


const UserModel = mongoose.model("User", UserSchema)

module.exports = UserModel;