import mongoose from "mongoose";

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
    },
    variant: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    offerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Offer"
    },
    offerPrice: {
        type: Number
    },
    quantity: {
        type: Number,
        min: 1,
        default: 1,
        required: true
    },
    total: {
        type: Number,
        required: true
    }
}, { timestamps: true });

const Cart = mongoose.model("Cart", cartSchema);

export default Cart;