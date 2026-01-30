const Joi = require('joi');
const electricBluebookCreateDTO = Joi.object({
    vehicleRegNo: Joi.string().required(),
    vehicleType: Joi.string().required(),
    vehicleRegistrationDate: Joi.date().required(),
    vehicleOwnerName: Joi.string().required(),
    taxPayDate: Joi.date().required(),
    taxExpireDate: Joi.date().required(),
    vehicleModel: Joi.string().required(),
    manufactureYear: Joi.string().required(),
    chasisNumber: Joi.string().required(),
    vehicleNumber: Joi.string().required(),
    vehicleBatteryCapacity: Joi.number().required(),
    vehicleColor: Joi.string().required(),
})

module.exports = {
    electricBluebookCreateDTO,
}