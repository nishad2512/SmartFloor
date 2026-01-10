import mongoose from "mongoose";
import slugUpdater from "mongoose-slug-updater"; // Changed this

mongoose.plugin(slugUpdater); // Use the updater instead

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        slug: { 
            type: String, 
            slug: "name",
            unique: true
        },
        description: {
            type: String,
            required: true,
        },
        specifications: {
            type: String,
            default: "There are no specifications available.",
        },
        highlights: {
            type: String,
            default: "There are no highlights available.",
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
        arModelPath: {
            type: String,
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
        reviews: [
            {
                rating: Number,
                title: String,
                review: String,
                author: String,
                date: Date
            }
        ]
    },
    { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);

export default Product;
