import User from "../models/userModel.js";
import { createToken, maxAge } from "../utils/generateToken.js";
import crypto from "crypto";
import { sendOTPEmail, sendResetEmail } from "../utils/email.js";
import { createHash, compare } from "../services/authServices.js";

function generateOtp() {
    return crypto.randomInt(100000, 999999).toString();
}

function createUrl() {}

export const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        let user = await User.findOne({ email: email });
        if (user && (await compare(password, user.password))) {
            const token = createToken(user._id);

            res.cookie("jwt", token, {
                httpOnly: false,
                maxAge: maxAge * 1000,
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
            password: await createHash(password),
            referral: referral,
        };
        res.redirect("/otp");
    } catch (err) {
        console.error(err);
    }
};

export const otp = (req, res) => {
    let error = req.session.otpErr || null;
    res.render("user/otp", {
        expiry: req.session.expires,
        email: req.session.user.email,
        err: error,
    });
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
    const email = req.session.user.email;
    console.log(email);
    const otp = generateOtp();
    sendOTPEmail(email, otp);
    req.session.otp = otp;
    req.session.expires = Date.now() + 60 * 1000;
    res.redirect("/otp");
};

export const googleAuth = (req, res) => {
    if (!req.user) return res.redirect("/login");
    let user = req.user;
    const token = createToken(user._id);

    res.cookie("jwt", token, {
        httpOnly: false,
        maxAge: maxAge * 1000,
    });
    res.redirect("/");
};

export const logout = (req, res) => {
    res.locals.user = null;
    res.cookie("jwt", "loggedout", {
        httpOnly: false,
        maxAge: 1000,
    });
    res.redirect("/login");
};

export const forgot = (req, res) => {
    res.render("user/forgot");
};

export const reset = async (req, res) => {
    const { email } = req.body;
    let user = await User.findOne({ email: email });
    const token = crypto.randomBytes(32).toString("hex");

    req.session.urlToken = token;
    req.session.tokenUser = user;

    const url = `${req.protocol}://${req.get(
        "host"
    )}/resetPassword/${token}`;

    sendResetEmail(email, url);
    res.redirect("/login");
};

export const resetPassword = async (req, res) => {

    const token = req.session.urlToken;
    const user = await User.findOne(req.session.tokenUser);

    if (!user || token != req.params.token) {
        return res.status(400).send('Password reset token is invalid or has expired.');
    }
    const { password } = req.body;
    user.password = await createHash(password);
    await user.save();

    res.redirect('/login');

};
