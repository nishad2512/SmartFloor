import express from "express";
import * as userController from "../controllers/userControllers.js"
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

router.get("/login", (req, res) => {
    res.render("user/login");
});

router.post("/login", userController.login);

router.get("/signup", (req, res) => {
    res.render("user/signup");
});

router.post("/signup", userController.signup);

router.get('/otp', userController.otp);
router.post('/verify', userController.verify);

router.get('/resend', userController.resend);

export default router;
