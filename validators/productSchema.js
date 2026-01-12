import Joi from 'joi';

const productSchema = Joi.object({
    name: Joi.string().trim().min(2).required().messages({
        'string.empty': 'Product Name is required.',
        'string.min': 'Product Name must be at least 2 characters long.',
        'any.required': 'Product Name is required.'
    }),
    description: Joi.string().trim().min(10).required().messages({
        'string.empty': 'Product Description is required.',
        'string.min': 'Product Description must be at least 10 characters long.',
        'any.required': 'Product Description is required.'
    }),
    category: Joi.string().required().messages({
        'string.empty': 'Category is required.',
        'any.required': 'Category is required.'
    }),
    specifications: Joi.string().allow('').optional(),
    highlights: Joi.string().allow('').optional(),

    variants: Joi.array().items(
        Joi.object({
            size: Joi.string().trim().required(),
            price: Joi.number().min(0).required(),
            stock: Joi.number().min(0).required()
        })
    ).min(1).required().messages({
        'array.min': 'At least one valid variant is required.',
        'any.required': 'Variants are required.'
    })
});

export default productSchema;
