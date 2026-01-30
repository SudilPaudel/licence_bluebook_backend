const Joi = require('joi');

const newsCreateDTO = Joi.object({
    title: Joi.string().min(5).max(200).required(),
    content: Joi.string().min(10).max(2000).required(),
    status: Joi.string().valid('active', 'inactive', 'draft').default('draft'),
    priority: Joi.number().min(1).max(10).default(1),
    tags: Joi.array().items(Joi.string().trim()).default([]),
    image: Joi.string().allow(null).optional(),
    publishedAt: Joi.date().allow(null).default(null)
});

const newsUpdateDTO = Joi.object({
    title: Joi.string().min(5).max(200),
    content: Joi.string().min(10).max(2000),
    status: Joi.string().valid('active', 'inactive', 'draft'),
    priority: Joi.number().min(1).max(10),
    tags: Joi.array().items(Joi.string().trim()),
    image: Joi.string().allow(null).optional(),
    publishedAt: Joi.date().allow(null)
});

module.exports = {
    newsCreateDTO,
    newsUpdateDTO
}; 