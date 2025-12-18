import express from "express";
import * as userController from "../controllers/userControllers/authController.js";
import * as productController from "../controllers/userControllers/productController.js";
import * as profileController from "../controllers/userControllers/profileController.js";
import * as addressController from "../controllers/userControllers/addressController.js";
import * as cartController from "../controllers/userControllers/cartController.js";
import * as wishlistController from "../controllers/userControllers/wishlistController.js";
import * as checkoutController from "../controllers/userControllers/checkoutController.js";
import * as orderController from "../controllers/userControllers/orderController.js";
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

router.get("/about", (req, res) => {
    res.render("user/about");
});

router.get("/contact", (req, res) => {
    res.render("user/contact");
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

// profile -----------------

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

router.delete('/profile/addresses/delete/:id', requireAuth, addressController.deleteAddress);

router.get('/profile/addresses/edit/:id', requireAuth, addressController.editAddressPage);

router.patch('/profile/addresses/edit/:id', requireAuth, addressController.editAddress);

// cart routes

router.get('/cart', requireAuth, cartController.cart);

router.post('/cart/add', requireAuth, cartController.addToCart);

router.patch('/cart/update/:cartItemId', requireAuth, cartController.updateCartQuantity);

router.delete('/cart/delete/:cartItemId', requireAuth, cartController.removeFromCart);

// wishlist routes

router.get('/wishlist', requireAuth, wishlistController.wishlist);

// checkout routes

router.get('/checkout', requireAuth, checkoutController.checkout);

router.post('/checkout/place-order', requireAuth, checkoutController.placeOrder);

// orders routes

router.get('/profile/orders', requireAuth, orderController.orders)

router.get('/order/confirmation/:orderId', requireAuth, orderController.orderConfirmation);

router.get('/profile/order/details/:orderId', requireAuth, orderController.orderDetails);

router.patch('/profile/orders/cancel/:orderId', requireAuth, orderController.cancelOrder);

router.patch('/profile/orders/return/:orderId', requireAuth, orderController.returnOrder);

router.patch('/profile/orders/item/cancel/:orderId/:itemId', requireAuth, orderController.cancelOrderItem);

router.patch('/profile/orders/item/return/:orderId/:itemId', requireAuth, orderController.returnOrderItem);

router.get('/profile/orders/returnDetails/:orderId/:itemId', requireAuth, orderController.returnDetails);

export default router;
