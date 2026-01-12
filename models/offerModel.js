import mongoose from "mongoose";

const offerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    type: {
        type: String,
        enum: ["fixed", "percentage", "shipping"],
        default: "percentage"
    },
    value: {
        type: Number,
    },
    scope: {
        type: String,
        enum: ["all", "product", "category"],
        default: "all"
    },
    start: {
        type: Date,
        required: true
    },
    end: {
        type: Date,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    products: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product"
        }
    ],
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category"
    }
}, { timestamps: true });

const Offer = mongoose.model("Offer", offerSchema);

export default Offer;