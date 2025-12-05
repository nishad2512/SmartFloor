import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

export const requireAuth = (req, res, next) => {
    const token = req.cookies.jwt;

    if (token) {
        jwt.verify(token, "smart-floor", (err, decode) => {
            if (err) {
                console.log(err.message);
                res.redirect("/login");
            } else {
                console.log(decode);
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
        jwt.verify(token, "smart-floor", (err, decodedToken) => {
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
                    next();
                } else {
                    res.locals.user = user;
                    next();
                }
            }
        });
    } else {
        res.locals.user = null;
        next();
    }
};
