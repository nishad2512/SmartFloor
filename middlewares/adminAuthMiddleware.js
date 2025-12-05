import jwt from "jsonwebtoken";
import Admin from "../models/adminModel.js";

export const checkAdmin = (req, res, next) => {
    const token = req.cookies["admin-jwt"];
    if (token) {
        jwt.verify(token, "smartFloor-admin", async (err, decodedToken) => {
            if (err) {
                res.locals.admin = null;
                next();
            } else {
                let admin = await Admin.findById(decodedToken.id);
                res.locals.admin = admin;
                next();
            }
        });
    } else {
        res.locals.admin = null;
        next();
    }
};

export const redirectIfLoggedIn = (req, res, next) => {
    const token = req.cookies["admin-jwt"];

    if (token) {
        jwt.verify(token, "smartFloor-admin", (err, decodedToken) => {
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