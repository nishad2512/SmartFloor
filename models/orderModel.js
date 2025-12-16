import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    orderId: {
        type: String,
        unique: true,
        required: true,
        default: () => {
            return 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 100000); 
        }
    },
    address: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Address",
        required: true
    },
    paymentMethod: {
        type: String,
        required: true
    },
    items: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product",
                required: true
            },
            variant: {
                type: mongoose.Schema.Types.ObjectId,
                required: true
            },
            quantity: {
                type: Number,
                required: true
            },
            subTotal: {
                type: Number,
                required: true
            },
            status: {
                type: String,
                enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled", "Returned"],
                default: "Pending"
            },
            returnReason: {
                type: String,
            }
        }
    ],
    totalAmount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled", "Returned"],
        default: "Pending"
    },
    returnReason: {
        type: String,
    }
}, { timestamps: true });

const Order = mongoose.model("Order", orderSchema);

export default Order;