import express from "express";
import Admin from "../models/adminModel.js";
import { compare } from "../services/authServices.js";
import { createAdminToken, maxAge } from "../utils/generateToken.js";
import { checkAdmin } from "../middlewares/adminAuthMiddleware.js";

const router = express.Router();

router.use(checkAdmin);

router.get("/", (req, res) => {
    if (!res.locals.admin) {
        return res.redirect("/admin/login");
    }
    res.render("admin/dashboard");
});

router.get("/login", (req, res) => {
    res.render("admin/login");
});

router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email: email });

    if (admin && (await compare(password, admin.password))) {
        const token = createAdminToken(admin._id);
        res.cookie("admin-jwt", token, {
            httpOnly: false,
            maxAge: maxAge * 1000,
        });

        res.redirect("/admin");
    } else {
        res.redirect("/admin/login");
    }
});

router.get('/logout', (req, res) => {
    res.locals.admin = null;
    res.cookie("admin-jwt", "loggedout", {
        httpOnly: false,
        maxAge: 1000,
    });
    res.redirect("/admin/login");
});

export default router;
