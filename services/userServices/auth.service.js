import crypto from "crypto";
import User from "../../models/userModel.js";
import { sendOTPEmail, sendResetEmail } from "../../utils/email.js";
import { createHash, compare } from "../authServices.js";
import generateCode from "../../utils/referral.js";

/* ---------------- OTP ---------------- */

const generateOtp = () => crypto.randomInt(100000, 999999).toString();

/* ---------------- LOGIN ---------------- */

export const loginUser = async (email, password) => {
    const user = await User.findOne({ email });
    if (!user || !(await compare(password, user.password)))
        throw new Error("INVALID_CREDENTIALS");

    if (user.isBlocked) throw new Error("BLOCKED");

    return user;
};

/* ---------------- SIGNUP ---------------- */

export const startSignup = async ({ name, email, password, referral }) => {
    const existing = await User.findOne({ email });
    if (existing) throw new Error("EMAIL_EXISTS");

    let referrer = null;
    if (referral) {
        referrer = await User.findOne({ referral });
        if (!referrer) throw new Error("INVALID_REFERRAL");
    }

    const referralCode = generateCode(name);
    const otp = generateOtp();

    await sendOTPEmail(email, otp);

    return {
        otp,
        expires: Date.now() + 60 * 1000,
        referrerId: referrer?._id,
        userData: {
            name,
            email,
            password: await createHash(password),
            referral: referralCode,
        },
    };
};

/* ---------------- OTP VERIFY ---------------- */

export const verifyOtp = async (session, enteredOtp) => {
    if (Date.now() > session.expires) throw new Error("OTP_EXPIRED");
    if (enteredOtp !== session.otp) throw new Error("INVALID_OTP");

    // EMAIL CHANGE
    if (session.newMail) {
        const user = await User.findById(session.tempUserId);
        user.email = session.newMail;
        await user.save();

        session.newMail = null;
        session.changeMail = null;
        session.tempUserId = null;

        return { type: "EMAIL_CHANGED" };
    }

    if (session.changeMail) {
        return { type: "CHANGE_MAIL_VERIFIED" };
    }

    // SIGNUP
    const newUser = new User(session.user);

    if (session.referrerId) {
        newUser.wallet += 500;
        newUser.walletHistory.push({
            amount: 500,
            type: "credit",
            reason: "Refer and win",
            date: new Date(),
        });

        const referrer = await User.findById(session.referrerId);
        referrer.wallet += 1000;
        referrer.walletHistory.push({
            amount: 1000,
            type: "credit",
            reason: "Refer and win",
            date: new Date(),
        });

        await referrer.save();
    }

    await newUser.save();

    return { type: "SIGNED_UP", user: newUser };
};

/* ---------------- RESEND OTP ---------------- */

export const resendOtp = async (email) => {
    const otp = generateOtp();
    await sendOTPEmail(email, otp);

    console.log("Generated OTP for signup:", otp);
    return { otp, expires: Date.now() + 60 * 1000 };
};

/* ---------------- GOOGLE ---------------- */

export const googleLogin = async (user) => {
    if (!user) throw new Error("NO_USER");
    if (user.isBlocked) throw new Error("BLOCKED");
    return user;
};

/* ---------------- RESET PASSWORD ---------------- */

export const startPasswordReset = async (email, req) => {
    const user = await User.findOne({ email });
    if (!user) throw new Error("NO_USER");

    const token = crypto.randomBytes(32).toString("hex");
    req.session.urlToken = token;
    req.session.tokenUserId = user._id;

    const url = `${req.protocol}://${req.get("host")}/resetPassword/${token}`;
    await sendResetEmail(email, url);
};

export const resetPassword = async (tokenFromUrl, session, newPassword) => {
    if (tokenFromUrl !== session.urlToken) throw new Error("INVALID_TOKEN");

    const user = await User.findById(session.tokenUserId);
    if (!user) throw new Error("NO_USER");

    user.password = await createHash(newPassword);
    await user.save();

    session.urlToken = null;
    session.tokenUserId = null;
};
