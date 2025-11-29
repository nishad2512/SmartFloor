import User from "../models/userModel.js";
import createToken from "../utils/generateToken.js";
import { maxAge } from "../utils/generateToken.js";
import crypto from "crypto";
import sendOTPEmail from "../utils/email.js";

function generateOtp() {
    return crypto.randomInt(100000, 999999).toString();
}

export const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        let user = await User.findOne({ email: email, password: password });
        if (user) {
            const token = createToken(user._id);

            res.cookie("jwt", token, {
                httpOnly: false,
                maxAge: 1000,
            });

            return res.redirect("/");
        }
        res.redirect("/login");
    } catch (err) {
        console.error(err);
    }
};

export const signup = async (req, res) => {
    const { name, email, password, referral } = req.body;

    try {
        let user = await User.findOne({ email: email });
        if (user) {
            return res.status(400).send("User already exists");
        }
        const otp = generateOtp();
        sendOTPEmail(email, otp);
        req.session.otp = otp;
        req.session.expires = Date.now() + 60 * 1000;
        req.session.user = {
            name: name,
            email: email,
            password: password,
            referral: referral,
        };
        res.redirect("/otp");
    } catch (err) {
        console.error(err);
    }
};

export const otp = (req, res) => {
    let error = req.session.otpErr || null;
    res.render("user/otp", { expiry: req.session.expires, email: req.session.user.email, err: error });
    if (error) req.session.otpErr = null;
};

export const verify = async (req, res) => {
    const { digit1, digit2, digit3, digit4, digit5, digit6 } = req.body;
    const enteredOTP = `${digit1}${digit2}${digit3}${digit4}${digit5}${digit6}`;
    console.log(enteredOTP);

    if (Date.now() >= req.session.expires) {
        req.session.otpErr = "Expired OTP";
        return res.redirect("/otp");
    }

    if (enteredOTP == req.session.otp) {
        try {
            const newUser = new User(req.session.user);
            await newUser.save();
            const token = createToken(newUser._id);

            res.cookie("jwt", token, {
                httpOnly: false,
                maxAge: maxAge * 1000,
            });

            return res.redirect("/");
        } catch (err) {
            console.error(err.message);
        }
    }
    req.session.otpErr = "Invalid OTP";
    res.redirect("/otp");
};

export const resend = (req, res) => {
    const email = req.session.user.email
    console.log(email)
    const otp = generateOtp();
    sendOTPEmail(email, otp);
    req.session.otp = otp;
    req.session.expires = Date.now() + 60 * 1000;
    res.redirect('/otp');
};
