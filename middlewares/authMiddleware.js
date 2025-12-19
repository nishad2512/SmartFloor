import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import Cart from "../models/cartModel.js";

export const requireAuth = (req, res, next) => {
    const token = req.cookies.jwt;

    if (token) {
        jwt.verify(token, process.env.JWT_SECRET_USER, (err, decode) => {
            if (err) {
                console.log(err.message);
                res.redirect("/login");
            } else {
                req.userId = decode.id;
                next();
            }
        });
    } else {
        res.redirect("/login");
    }
};

export const redirectIfLoggedIn = (req, res, next) => {
    const token = req.cookies.jwt;

    if (token) {
        jwt.verify(token, process.env.JWT_SECRET_USER, (err, decodedToken) => {
            if (err) {
                next();
            } else {
                res.redirect("/");
            }
        });
    } else {
        next();
    }
};

export const checkUser = (req, res, next) => {
    const token = req.cookies.jwt;
    if (token) {
        jwt.verify(token, "smart-floor", async (err, decodedToken) => {
            if (err) {
                res.locals.user = null;
                next();
            } else {
                let user = await User.findById(decodedToken.id);
                if (user && user.isBlocked) {
                    res.clearCookie("jwt");
                    res.locals.user = null;
                    req.flash("error", "Your account has been blocked. Please contact support.");
                    next();
                } else {
                    res.locals.user = user;
                    const cartCount = await Cart.countDocuments({ user: user._id });
                    res.locals.cartCount = cartCount;
                    next();
                }
            }
        });
    } else {
        res.locals.user = null;
        next();
    }
};
