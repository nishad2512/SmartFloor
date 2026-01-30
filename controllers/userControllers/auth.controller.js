import * as authService from "../../services/userServices/auth.service.js";
import { createToken, maxAge } from "../../utils/generateToken.js";

const getErrorMessage = (code) => {
    switch (code) {
        case "EMAIL_EXISTS":
            return "Email is already registered";
        case "INVALID_REFERRAL":
            return "Invalid referral code";
        case "OTP_EXPIRED":
            return "OTP has expired. Please request a new one";
        case "INVALID_OTP":
            return "Incorrect OTP. Please try again";
        case "BLOCKED":
            return "Account is blocked";
        default:
            return code || "An error occurred";
    }
};

export const login = async (req, res) => {
    try {
        const user = await authService.loginUser(
            req.body.email,
            req.body.password,
        );
        res.cookie("jwt", createToken(user._id), {
            maxAge: maxAge * 1000,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
        });

        req.flash("success", "Logged in successfully");
        res.redirect("/");
    } catch (e) {
        req.flash("error", "Invalid credentials or blocked account");
        res.redirect("/login");
    }
};

export const signup = async (req, res) => {
    try {
        const data = await authService.startSignup(req.body);

        req.session.otp = data.otp;
        req.session.expires = data.expires;
        req.session.referrerId = data.referrerId;
        req.session.user = data.userData;

        req.flash("success", "OTP sent to your email");
        res.redirect("/otp");
    } catch (e) {
        req.flash("error", getErrorMessage(e.message));
        res.redirect("/signup");
    }
};

export const otp = (req, res) => {
    try {
        res.render("user/auth/otp", {
            email: req.session.user.email,
            expiry: req.session.expires,
        });
    } catch {
        req.flash("error", "Something happened.");
        res.redirect("/");
    }
};

export const verify = async (req, res) => {
    try {
        const enteredOtp = Object.values(req.body).join("");
        const result = await authService.verifyOtp(req.session, enteredOtp);

        if (result.type === "SIGNED_UP") {
            res.cookie("jwt", createToken(result.user._id), {
                maxAge: maxAge * 1000,
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
            });
            req.flash("success", "Signup successful");
            return res.redirect("/");
        }

        if (result.type === "CHANGE_MAIL_VERIFIED") {
            req.flash("success", "Email change verified");
            return res.redirect("/profile/new-mail");
        }

        res.redirect("/profile/details");
    } catch (e) {
        req.flash("error", getErrorMessage(e.message));
        res.redirect("/otp");
    }
};

export const resend = async (req, res) => {
    try {
        const { otp, expires } = await authService.resendOtp(
            req.session.user.email,
        );
        req.session.otp = otp;
        req.session.expires = expires;

        req.flash("success", "OTP resent to your email");
        res.redirect("/otp");
    } catch {
        req.flash("error", "OTP resend failed");
        res.redirect("/otp");
    }
};

export const googleAuth = async (req, res) => {
    try {
        const user = await authService.googleLogin(req.user);
        res.cookie("jwt", createToken(user._id), {
            maxAge: maxAge * 1000,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
        });

        req.flash("success", "Logged in successfully");
        res.redirect("/");
    } catch {
        req.flash("error", "Account blocked");
        res.redirect("/login");
    }
};

export const forgot = (req, res) => {
    try {
        res.render("user/auth/forgot");
    } catch {
        req.flash(
            "error",
            "An error occurred while rendering forgot password page.",
        );
        res.redirect("/");
    }
};

export const reset = async (req, res) => {
    try {
        await authService.startPasswordReset(req.body.email, req);
        req.flash("success", "Reset link sent");
        res.redirect("/login");
    } catch {
        req.flash("error", "Invalid email");
        res.redirect("/login");
    }
};

export const resetPassword = async (req, res) => {
    try {
        await authService.resetPassword(
            req.params.token,
            req.session,
            req.body.password,
        );
        if (req.xhr || req.headers['content-type'] === 'application/json' || req.headers.accept.indexOf('json') > -1) {
            return res.status(200).json({ success: true, message: "Password reset successful" });
        }
        req.flash("success", "Password reset successful");
        res.redirect("/login");
    } catch {
        if (req.xhr || req.headers['content-type'] === 'application/json' || req.headers.accept.indexOf('json') > -1) {
            return res.status(400).json({ success: false, message: "Invalid or expired link" });
        }
        req.flash("error", "Invalid or expired link");
        res.redirect("/forgot");
    }
};

export const logout = (req, res) => {
    res.cookie("jwt", "loggedout", { maxAge: 1000 });
    req.flash("success", "Logged out successfully");
    res.redirect("/login");
};
