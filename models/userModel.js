import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    referral: {
        type: String,
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    avatar: {
        type: String,
    },
    phone: {
        type: String,
    }
}, { timestamps: true });

const addressSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
    },
    phone: {
        type: String,
    },
    address1: {
        type: String,
        required: true
    },
    address2: {
        type: String,
    },
    city: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    zip: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ["Home", "Work", "Other"],
        default: "Home"
    }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
export const Address = mongoose.model("Address", addressSchema);

export default User;