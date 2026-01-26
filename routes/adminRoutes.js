import express from "express";
import { checkAdmin, redirectIfLoggedIn } from "../middlewares/adminAuthMiddleware.js";
import * as categories from "../controllers/adminControllers/categoryManagement.js";
import * as users from "../controllers/adminControllers/userManagement.js";
import * as products from "../controllers/adminControllers/productManagement.js";
import * as orders from "../controllers/adminControllers/orderManagement.js";
import * as offers from "../controllers/adminControllers/offerManagement.js";
import * as coupens from "../controllers/adminControllers/coupenManagement.js";
import * as sales from "../controllers/adminControllers/salesManagement.js";
import dashboard from "../controllers/adminControllers/dashboardManagement.js";
import adminLogin from "../controllers/adminControllers/admin.auth.js";
import { upload } from "../utils/cloudinary.js";
import nocache from "nocache";

const router = express.Router();

router.use(nocache());


router.route("/login")
    .get(redirectIfLoggedIn, (req, res) => {
        res.render("admin/login");
    })
    .post(adminLogin);


router.use(checkAdmin);


router.get("/dashboard", dashboard);

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


router.patch("/categories/block/:id", categories.blockCategory);

// userManagement

router.get("/customers", users.users)

router.patch("/customers/block/:id", users.blockUser);

// productManagement

router.get("/products", products.products)

router.route("/products/create")
    .get(products.createProductPage)
    .post(upload.array('images', 5), (err, req, res, next) => {
        console.log(err);
        next()
    }, products.createProduct);

router.route("/products/edit/:id")
    .get(products.editProductPage)
    .patch(upload.array('images', 5), products.editProduct);


router.patch("/products/block/:id", products.blockProduct);

// orderManagement

router.get('/orders', orders.orders);

router.get('/returns', orders.returns);

router.get('/orders/details/:orderId', orders.orderDetails);

router.patch('/orders/update-status/:orderId', orders.updateStatus);

router.get('/returns/details/:returnId', orders.returnDetails);

router.patch('/returns/update-status/:returnId', orders.updateReturnStatus);

// offer routes

router.get('/offers', offers.offers);

router.route('/offers/create')
    .get(offers.createOfferPage)
    .post(offers.createOffer)

router.route('/offers/edit/:id')
    .get(offers.editOfferPage)
    .patch(offers.editOffer)

router.patch('/offers/block/:id', offers.blockOrUnblock);

// coupen routes

router.get('/coupens', coupens.coupens);

router.route('/coupens/create')
    .get(coupens.createPage)
    .post(coupens.create)

router.route('/coupens/edit/:id')
    .get(coupens.editPage)
    .patch(coupens.edit)

router.patch('/coupens/block/:id', coupens.block);

// sales routes

router.get('/sales', sales.sales);

router.get('/sales/download/pdf', sales.downloadSalesPDF);

router.get('/sales/download/excel', sales.downloadSalesExcel);



// logout

router.post('/logout', (req, res) => {
    res.locals.admin = null;
    res.cookie("admin-jwt", "loggedout", {
        httpOnly: false,
        maxAge: 1000,
    });
    res.redirect("/admin/login");
});

export default router;
