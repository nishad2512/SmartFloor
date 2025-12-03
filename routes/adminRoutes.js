import express from "express";
import Admin from "../models/adminModel.js";
import { compare } from "../services/authServices.js";
import { createAdminToken, maxAge } from "../utils/generateToken.js";
import { checkAdmin, redirectIfLoggedIn } from "../middlewares/adminAuthMiddleware.js";
import * as categories from "../controllers/adminControllers/categoryManagement.js";
import * as users from "../controllers/adminControllers/userManagement.js"

const router = express.Router();

router.use(checkAdmin);

router.get("/", (req, res) => {
    res.render("admin/dashboard");
});

router.get("/login", redirectIfLoggedIn, (req, res) => {
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

// categoryManagement

router.get("/categories", categories.categories);

router.get("/categories/create", (req, res) => {
    res.render("admin/categoryManagement/createCategory");
});

router.post("/categories/create", categories.createCategory);

router.get("/categories/edit/:id", categories.editPage);

router.post("/categories/edit/:id", categories.editCategory);

router.get("/categories/delete/:id", categories.deleteCategory);

// userManagement

router.get("/customers", users.users)

router.get("/customers/block/:id", users.blockUser);

router.get("/customers/unblock/:id", users.unblockUser);

router.get('/logout', (req, res) => {
    res.locals.admin = null;
    res.cookie("admin-jwt", "loggedout", {
        httpOnly: false,
        maxAge: 1000,
    });
    res.redirect("/admin/login");
});

export default router;
