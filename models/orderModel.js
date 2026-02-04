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
        name: String,
        email: String,
        phone: String,
        address1: String,
        address2: String,
        city: String,
        state: String,
        zip: String,
        type: { type: String }
    },
    paymentMethod: {
        type: String,
    },
    paymentStatus: {
        type: String,
        enum: ["pending", "paid", "failed"],
        default: "pending"
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
            offerId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Offer"
            },
            offerPrice: {
                type: Number
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
                enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled", "Returned", "Return Request"],
                default: "Pending"
            },
            returnReason: {
                type: String,
            },
            cancelReason: {
                type: String,
            }
        }
    ],
    subTotal: {
        type: Number,
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    tax: {
        type: Number,
        required: true
    },
    coupenDiscount: {
        type: Number
    },
    coupenCode: {
        type: String
    },
    shipping: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled", "Returned", "Return Request"],
        default: "Pending"
    },
    returnReason: {
        type: String,
    },
    cancelReason: {
        type: String,
    },
    refund: {
        type: Number,
        default: 0
    },
    cancelled: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

const Order = mongoose.model("Order", orderSchema);

export default Order;