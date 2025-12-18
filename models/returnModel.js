import mongoose from "mongoose";

const returnSchema = new mongoose.Schema({
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    itemId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["Return Request", "Approved", "Rejected", "Picked", "Returned"],
        default: "Return Request"
    },
    refundAmount: {
        type: Number,
        required: true
    }
}, { timestamps: true });

const Return = mongoose.model("Return", returnSchema);

export default Return;
