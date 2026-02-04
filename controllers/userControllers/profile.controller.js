import User from "../../models/userModel.js";
import { Address } from "../../models/userModel.js";
import { sendOtp } from "../../utils/sms.js";
import crypto from "crypto";
import { sendOTPEmail } from "../../utils/email.js"
import { createHash, compare } from "../../services/authServices.js";

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
        req.flash("error", "Failed to load profile. Please try again.");
        res.redirect("/");
    }
};

export const editDetails = async (req, res) => {
    try {
        const { name } = req.body;

        if (!name || name.trim().length === 0) {
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(400).json({ success: false, message: "Name cannot be empty" });
            }
            req.flash("error", "Name cannot be empty");
            return res.redirect("/profile/details");
        }

        const user = await User.findById(req.userId);

        user.name = name.trim();
        if (req.file) {
            user.avatar = req.file.path;
        }
        await user.save();

        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(200).json({ success: true, message: "Profile updated successfully" });
        }

        req.flash("success", "Profile updated successfully");
        res.redirect("/profile/details");

    } catch (error) {
        console.error(error);
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(400).json({ success: false, message: "Failed to update profile details." });
        }
        req.flash("error", "Failed to update profile details.");
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
        req.flash("error", "Failed to send OTP.");
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
        req.flash("error", "Verification failed.");
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
        req.flash("error", "Failed to initiate email change.");
        res.redirect("/profile/details");
    }
}

export const newMailPage = async (req, res) => {
    try {
        res.render("user/profile/editEmail");
    } catch (error) {
        console.error(error);
        req.flash("error", "Failed to load email change page.");
        res.redirect("/profile/details");
    }
}

export const newMail = async (req, res) => {
    try {
        const { email: rawEmail } = req.body;
        const email = rawEmail.trim();

        const currentUser = await User.findById(req.userId);

        if (currentUser.email === email) {
            if (req.xhr || req.headers['content-type'] === 'application/json' || req.headers.accept.indexOf('json') > -1) {
                return res.status(400).json({ success: false, message: "This is already your email" });
            }
            req.flash("error", "This is already your email");
            return res.redirect("/profile/new-mail");
        }

        // Basic email regex validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            if (req.xhr || req.headers['content-type'] === 'application/json' || req.headers.accept.indexOf('json') > -1) {
                return res.status(400).json({ success: false, message: "Invalid email format" });
            }
            req.flash("error", "Invalid email format");
            return res.redirect("/profile/new-mail");
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email: email });
        if (existingUser) {
            if (req.xhr || req.headers['content-type'] === 'application/json' || req.headers.accept.indexOf('json') > -1) {
                return res.status(400).json({ success: false, message: "Email already in use by another account" });
            }
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

        if (req.xhr || req.headers['content-type'] === 'application/json' || req.headers.accept.indexOf('json') > -1) {
            return res.status(200).json({ success: true, message: "OTP sent to " + email, redirectUrl: "/profile/verify-email-otp" });
            // Assuming explicit redirect or frontend handling
        }

        req.flash("success", "OTP sent to " + email);
        res.render("user/auth/otp", {
            expiry: req.session.expires,
            email: email,
        });
    } catch (error) {
        console.error(error);
        if (req.xhr || req.headers['content-type'] === 'application/json' || req.headers.accept.indexOf('json') > -1) {
            return res.status(400).json({ success: false, message: "Failed to process email change." });
        }
        req.flash("error", "Failed to process email change.");
        res.redirect("/profile/details");
    }
}

export const wallet = async (req, res) => {
    try {
        const userId = req.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const skip = (page - 1) * limit;

        const user = await User.findById(userId);

        // Sort history by date descending
        const sortedHistory = user.walletHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Paginate
        const transactions = sortedHistory.slice(skip, skip + limit);
        const hasMore = sortedHistory.length > (skip + limit);

        if (req.xhr || req.query.ajax) {
            return res.json({
                success: true,
                transactions,
                hasMore
            });
        }

        res.render('user/profile/wallet', {
            user,
            transactions: sortedHistory.slice(0, 5), // Initial load
            hasMore: sortedHistory.length > 5
        });
    } catch (error) {
        console.error("Wallet error:", error);
        req.flash("error", "Failed to load wallet.");
        res.redirect("/profile/details");
    }
};

export const changePasswordPage = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        res.render("user/profile/changePassword", { user });
    } catch (error) {
        console.error(error);
        req.flash("error", "Failed to load change password page.");
        res.redirect("/profile/details");
    }
};

export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters long" });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, message: "New passwords do not match" });
        }

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (user.password === "google") {
            return res.status(400).json({ success: false, message: "You cannot change password for Google account" });
        }

        const isMatch = await compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Incorrect current password" });
        }

        user.password = await createHash(newPassword);
        await user.save();

        res.json({ success: true, message: "Password updated successfully" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to update password" });
    }
};