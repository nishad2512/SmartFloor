import jwt from "jsonwebtoken";
import Admin from "../models/adminModel.js";

export const checkAdmin = (req, res, next) => {
    if (req.path === "/login") {
        return next();
    }
    const token = req.cookies["admin-jwt"];
    if (token) {
        jwt.verify(token, process.env.JWT_SECRET_ADMIN, async (err, decodedToken) => {
            if (err) {
                res.locals.admin = null;
                return res.redirect("/admin/login");
            } else {
                res.locals.admin = true;
                next();
            }
        });
    } else {
        res.locals.admin = null;
        return res.redirect("/admin/login");
    }
};

export const redirectIfLoggedIn = (req, res, next) => {
    const token = req.cookies["admin-jwt"];

    if (token) {
        jwt.verify(token, process.env.JWT_SECRET_ADMIN, (err, decodedToken) => {
            if (err) {
                next();
            } else {
                res.redirect("/admin/dashboard");
            }
        });
    } else {
        next();
    }
};