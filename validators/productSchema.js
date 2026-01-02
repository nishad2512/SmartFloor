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

    // Allow single values or arrays for size, price, stock, then transform/validate in controller?
    // OR try to validate the processed variants array if we construct it first?
    // It's cleaner to validate the raw inputs if possible, but form-data makes arrays tricky (single item vs array).
    // Strategy: We will validate the 'variants' array which we construct in the controller, 
    // OR we validate the raw fields allowing single or array.

    // Initial approach: Validate the fields loosely here, but we will rely on a processed object validation 
    // or just use Joi for the main fields and keeping the variant logic we just fixed in the controller, 
    // OR better: Move the variant construction logic BEFORE validation, then validate the whole object.

    // Let's define the schema for a PRE-PROCESSED product object (easier).
    // But typically we validate req.body. 

    // Let's stick to validating the common fields first. The variant complexity (array vs string) 
    // is best handled by the normalization logic I wrote. 
    // So I will Validate the NORMALIZED variants array.

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
