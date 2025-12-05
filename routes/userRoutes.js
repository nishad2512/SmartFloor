import express from "express";
import * as userController from "../controllers/userControllers/authController.js";
import * as productController from "../controllers/userControllers/productController.js";
import {
    requireAuth,
    redirectIfLoggedIn,
    checkUser,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(checkUser);

router.get("/", (req, res) => {
    res.render("user/index");
});

router.get("/login", redirectIfLoggedIn, (req, res) => {
    res.render("user/auth/login");
});

router.post("/login", userController.login);

router.get("/signup", redirectIfLoggedIn, (req, res) => {
    res.render("user/auth/signup");
});

router.post("/signup", userController.signup);

router.get("/otp", userController.otp);
router.post("/otp", userController.verify);

router.get("/resend", userController.resend);

router.get('/logout', userController.logout);

router.get('/forgot-password', userController.forgot);

router.post('/forgot-password', userController.reset);

router.get('/resetPassword/:token', (req, res) => {
    res.render('user/auth/reset', {token: req.params.token});
})
router.post('/resetPassword/:token', userController.resetPassword);

// products

router.get('/products', productController.products);

router.get('/products/:category', productController.filterByCategory);

router.get('/products/product/:id', productController.productDetails);

export default router;
