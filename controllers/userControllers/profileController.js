import User from "../../models/userModel.js";
import { Address } from "../../models/userModel.js";
import { sendOtp } from "../../utils/sms.js";
import crypto from "crypto";
import { sendOTPEmail } from "../../utils/email.js"

function generateOtp() {
    return crypto.randomInt(100000, 999999).toString();
}

export const profile = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await User.findById(userId);
        const isGoogle = user.password == "google" ? true : false;
        // console.log("User Profile:", user);
        res.render("user/profile/details", { user, isGoogle });
    } catch (error) {
        console.error(error);
        req.flash("error", "Error loading profile");
        res.redirect("/");
    }
};

export const editDetails = async (req, res) => {
    try {
        const { name } = req.body;

        if (!name || name.trim().length === 0) {
            req.flash("error", "Name cannot be empty");
            return res.redirect("/profile/details");
        }

        const user = await User.findById(req.userId);

        user.name = name.trim();
        if (req.file) {
            user.avatar = req.file.path;
        }
        await user.save();

        req.flash("success", "Profile updated successfully");
        res.redirect("/profile/details");

    } catch (error) {
        console.error(error);
        req.flash("error", "Error editing user details");
        res.redirect("/profile/details");
    }
};

export const sendVerify = async (req, res) => {
    try {
        if (!req.body.phone) {
            return res.json({ success: false, message: "Phone number is required" });
        }
        const otp = generateOtp();
        req.session.mobileOtp = { otp, phone: req.body.phone };
        sendOtp(req.body.phone, otp);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        req.flash("error", "Error sending OTP to user");
        res.json({ success: false, message: "Failed to send OTP" });
    }
};

export const verifyOtp = async (req, res) => {
    try {
        const { otp, phone } = req.body;

        if (!req.session.mobileOtp) {
            return res.json({ success: false, message: "OTP session expired. Please request a new OTP." });
        }

        const data = req.session.mobileOtp;
        if (!otp) return res.json({ success: false, message: "Enter an OTP" });

        if (otp == data.otp) {
            console.log(data);

            const user = await User.findById(req.userId);

            console.log(user);
            console.log(data.phone);

            user.phone = phone;
            await user.save();

            delete req.session.mobileOtp;
            return res.json({ success: true });
        } else {
            return res.json({ success: false, message: "Invalid OTP" });
        }
    } catch (error) {
        console.error(error);
        req.flash("error", "Error editing user details");
        res.json({ success: false, message: "Verification failed" });
    }
};

export const changeMail = async (req, res) => {
    try {
        const otp = generateOtp();
        const user = await User.findById(req.userId);

        sendOTPEmail(user.email, otp);

        console.log("Generated OTP:", otp);

        req.session.otp = otp;
        req.session.expires = Date.now() + 60 * 1000;
        req.session.changeMail = true;

        req.flash("success", "OTP sent to your current email");
        res.render("user/auth/otp", {
            expiry: req.session.expires,
            email: user.email,
        });
    } catch (error) {
        console.error(error);
        req.flash("error", "Error with Email changing");
        res.redirect("/profile/details");
    }
}

export const newMailPage = async (req, res) => {
    try {
        req.flash("success", "Email verified");
        res.render("user/profile/editEmail");
    } catch (error) {
        console.error(error);
        req.flash("error", "Error with Email changing");
        res.redirect("/profile/details");
    }
}

export const newMail = async (req, res) => {
    try {
        const { email } = req.body;

        // Basic email regex validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            req.flash("error", "Invalid email format");
            return res.redirect("/profile/new-mail");
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email: email });
        if (existingUser) {
            req.flash("error", "Email already in use by another account");
            return res.redirect("/profile/new-mail");
        }

        const otp = generateOtp();
        // Store only the ID, not the whole user object, to avoid session bloating/conflicts
        req.session.tempUserId = req.userId;

        sendOTPEmail(email, otp);

        console.log("Generated OTP:", otp);

        req.session.otp = otp;
        req.session.expires = Date.now() + 60 * 1000;
        req.session.newMail = email;
        req.session.changeMail = false;

        res.render("user/auth/otp", {
            expiry: req.session.expires,
            email: email,
        });
    } catch (error) {
        console.error(error);
        req.flash("error", "Error with Email changing");
        res.redirect("/profile/details");
    }
}