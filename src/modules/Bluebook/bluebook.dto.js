const Joi = require ('joi');
const bluebookCreateDTO = Joi.object({
    vehicleRegNo: Joi.string().required(),
    vehicleType: Joi.string().required(),
    VehicleRegistrationDate: Joi.string().required(),
    vehicleOwnerName: Joi.string().required(),
    taxPayDate: Joi.string().required(),
    taxExpireDate: Joi.string().required(),
    vehicleModel: Joi.string().required(),
    manufactureYear: Joi.string().required(),
    chasisNumber: Joi.string().required(),
    vehicleNumber: Joi.string().required(),
    vehicleEngineCC: Joi.number().required(),
    vehicleColor: Joi.string().required(),

})

module.exports = {
    bluebookCreateDTO,
}