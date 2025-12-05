import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true,
        },
        productImages: {
            type: [String],
            required: true,
            validate: {
                validator: function (array) {
                    return array.length >= 3;
                },
                message: "You must upload at least 3 images.",
            },
        },
        variants: [
            {
                size: { type: String, required: true },
                price: { type: Number, required: true },
                stock: { type: Number, required: true, min: 0 },
            },
        ],
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);

export default Product;
