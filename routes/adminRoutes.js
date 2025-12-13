import express from "express";
import { checkAdmin, redirectIfLoggedIn } from "../middlewares/adminAuthMiddleware.js";
import * as categories from "../controllers/adminControllers/categoryManagement.js";
import * as users from "../controllers/adminControllers/userManagement.js";
import * as products from "../controllers/adminControllers/productManagement.js";
import adminLogin from "../controllers/adminControllers/admin.auth.js";
import upload from "../utils/cloudinary.js";
import nocache from "nocache";

const router = express.Router();

router.use(checkAdmin);
router.use(nocache());

router.get("/dashboard", (req, res) => {
    res.render("admin/dashboard");
});

router.route("/login")
    .get(redirectIfLoggedIn, (req, res) => {
        res.render("admin/login");
    })
    .post(adminLogin);

// categoryManagement

router.get("/categories", categories.categories);

router.route("/categories/create")
    .get((req, res) => {
        res.render("admin/categoryManagement/createCategory");
    })
    .post(categories.createCategory);

router.route("/categories/edit/:id")
    .get(categories.editPage)
    .patch(categories.editCategory);

router.get("/categories/delete/:id", categories.deleteCategory);

router.get("/categories/unblock/:id", categories.unblockCategory);

// userManagement

router.get("/customers", users.users)

router.put("/customers/block/:id", users.blockUser);

// productManagement

router.get("/products", products.products)

router.route("/products/create")
    .get(products.createProductPage)
    .post(upload.array('images', 5), products.createProduct);

router.route("/products/edit/:id")
    .get(products.editProductPage)
    .patch(upload.array('images', 5), products.editProduct);

router.get("/products/delete/:id", products.deleteProduct);

router.get("/products/unblock/:id", products.unblockProduct);

// logout

router.get('/logout', (req, res) => {
    res.locals.admin = null;
    res.cookie("admin-jwt", "loggedout", {
        httpOnly: false,
        maxAge: 1000,
    });
    res.redirect("/admin/login");
});

export default router;
