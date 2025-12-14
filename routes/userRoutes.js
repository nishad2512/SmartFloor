import express from "express";
import * as userController from "../controllers/userControllers/authController.js";
import * as productController from "../controllers/userControllers/productController.js";
import * as profileController from "../controllers/userControllers/profileController.js";
import * as addressController from "../controllers/userControllers/addressController.js";
import {
    requireAuth,
    redirectIfLoggedIn,
    checkUser,
} from "../middlewares/authMiddleware.js";
import nocache from "nocache";
import upload from "../utils/cloudinary.js";

const router = express.Router();

router.use(checkUser);
router.use(nocache());

router.get("/", (req, res) => {
    res.render("user/index");
});

router.route("/login")
    .get(redirectIfLoggedIn, (req, res) => {
        res.render("user/auth/login");
    })
    .post(userController.login);

router.route("/signup")
    .get(redirectIfLoggedIn, (req, res) => {
        res.render("user/auth/signup");
    })
    .post(userController.signup);

router.route("/otp")
    .get(redirectIfLoggedIn, userController.otp)
    .post(userController.verify);

router.get("/resend", redirectIfLoggedIn, userController.resend);

router.get('/logout', userController.logout);

router.route('/forgot-password')
    .get(userController.forgot)
    .post(userController.reset);

router.route('/resetPassword/:token')
    .get((req, res) => {
        res.render('user/auth/reset', { token: req.params.token });
    })
    .post(userController.resetPassword);

// products

router.get('/products', productController.products);

router.get('/products/:category', productController.filterByCategory);

router.get('/products/product/:id', productController.productDetails);

// profile

// profile auth routes

router.get('/profile/details', requireAuth, profileController.profile);

router.get('/profile/details/edit', requireAuth, (req, res) => {
    res.render("user/profile/editDetails")
});

router.patch('/profile/details/edit', requireAuth, upload.single("image"), profileController.editDetails);

router.post('/profile/send-otp', profileController.sendVerify);

router.post('/profile/verify-otp', requireAuth, profileController.verifyOtp);

router.get('/profile/change-mail', requireAuth, profileController.changeMail);

router.get('/profile/new-mail', requireAuth, profileController.newMailPage);

router.patch('/profile/new-mail', requireAuth, profileController.newMail);

// profile address routes

router.get('/profile/addresses', requireAuth, addressController.addresses);

router.get('/profile/addresses/add', requireAuth, addressController.addAddressPage);

router.post('/profile/addresses/add', requireAuth, addressController.addAddress);

export default router;
