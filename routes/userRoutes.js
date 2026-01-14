import express from "express";
import * as userController from "../controllers/userControllers/authController.js";
import * as productController from "../controllers/userControllers/productController.js";
import * as profileController from "../controllers/userControllers/profileController.js";
import * as addressController from "../controllers/userControllers/addressController.js";
import * as cartController from "../controllers/userControllers/cartController.js";
import * as wishlistController from "../controllers/userControllers/wishlistController.js";
import * as checkoutController from "../controllers/userControllers/checkoutController.js";
import * as orderController from "../controllers/userControllers/orderController.js";
import * as paymentController from "../controllers/userControllers/paymentController.js";
import * as chatController from "../controllers/userControllers/chatController.js";
import {
    requireAuth,
    redirectIfLoggedIn,
    checkUser,
} from "../middlewares/authMiddleware.js";
import nocache from "nocache";
import {upload} from "../utils/cloudinary.js";

const router = express.Router();

router.use(checkUser);
router.use(nocache());

router.post('/chat', chatController.chatWithBot);

router.get("/", async (req, res) => {
    const products = await productController.getFeaturedProducts();
    console.log(products);
    res.render("user/index", { products });
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
router.use(requireAuth);

router.get('/products', productController.products);

router.get('/products/:category', productController.filterByCategory);

router.get('/products/product/:id', productController.productDetails);

// profile -----------------


// profile auth routes

router.get('/profile/details', profileController.profile);

router.get('/profile/details/edit', (req, res) => {
    res.render("user/profile/editDetails")
});

router.patch('/profile/details/edit', upload.single("image"), profileController.editDetails);

router.post('/profile/send-otp', profileController.sendVerify);

router.post('/profile/verify-otp', profileController.verifyOtp);

router.get('/profile/change-mail', profileController.changeMail);

router.get('/profile/new-mail', profileController.newMailPage);

router.patch('/profile/new-mail', profileController.newMail);

// profile address routes

router.get('/profile/addresses', addressController.addresses);

router.get('/profile/addresses/add', addressController.addAddressPage);

router.post('/profile/addresses/add', addressController.addAddress);

router.delete('/profile/addresses/delete/:id', addressController.deleteAddress);

router.get('/profile/addresses/edit/:id', addressController.editAddressPage);

router.patch('/profile/addresses/edit/:id', addressController.editAddress);

// cart routes

router.get('/cart', cartController.cart);

router.post('/cart/add', cartController.addToCart);

router.patch('/cart/update/:cartItemId', cartController.updateCartQuantity);

router.delete('/cart/delete/:cartItemId', cartController.removeFromCart);

// wishlist routes

router.get('/wishlist', wishlistController.wishlist);

router.post('/wishlist/add', wishlistController.addToWishlist);

router.delete('/wishlist/remove', wishlistController.removeFromWishlist);

// checkout routes

router.get('/checkout', checkoutController.checkout);

router.post('/checkout/place-order', checkoutController.placeOrder);

router.post('/checkout/apply-coupen', checkoutController.applyCoupen);

// orders routes

router.get('/profile/orders', orderController.orders)

router.get('/order/confirmation/:orderId', orderController.orderConfirmation);

router.get('/order/invoice/:orderId', orderController.downloadInvoice);

router.get('/profile/order/details/:orderId', orderController.orderDetails);

router.patch('/profile/orders/cancel/:orderId', orderController.cancelOrder);

router.patch('/profile/orders/return/:orderId', orderController.returnOrder);

router.patch('/profile/orders/item/cancel/:orderId/:itemId', orderController.cancelOrderItem);

router.patch('/profile/orders/item/return/:orderId/:itemId', orderController.returnOrderItem);

router.get('/profile/orders/returnDetails/:orderId/:itemId', orderController.returnDetails);

router.get('/profile/orders/review/:productId', orderController.reviewPage);

router.post('/profile/orders/review/:productId', orderController.addReview);

// wallet routes

router.get('/profile/wallet', profileController.wallet)

// payment routes

router.get('/payment/:orderId', paymentController.payment);

router.get('/payment/failed/:orderId', paymentController.failedPage);

router.post('/payment/create-order', paymentController.createOrder);

router.post('/payment/verify-payment', paymentController.verifyPayment);

router.post('/payment/place-order', paymentController.placeOrder);

export default router;
