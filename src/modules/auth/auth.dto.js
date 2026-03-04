const Joi = require('joi');

// Nepal citizenship number: exactly 11 numeric digits
const citizenshipNoSchema = Joi.string()
    .pattern(/^\d{11}$/)
    .required()
    .messages({ 'string.pattern.base': 'Citizenship number must be exactly 11 numeric digits' });

const registerDTO = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    citizenshipNo: citizenshipNoSchema,
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
    role: Joi.string().valid('admin', 'user').default('user'),
})
const loginDTO = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

module.exports = {
    loginDTO,
    registerDTO,
    citizenshipNoSchema
};