const Joi = require('joi');
const registerDTO = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    citizenshipNo: Joi.string().required(),
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
    role: Joi.string().valid('admin', 'user').default('user'),
})
const loginDTO = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
})
module.exports = {
    loginDTO,
    registerDTO
}