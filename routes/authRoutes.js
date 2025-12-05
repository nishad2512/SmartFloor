import express from "express";
import passport from "passport";
import GoogleStrategy from "passport-google-oauth2";
import * as userController from "../controllers/userControllers/authController.js";
import User from "../models/userModel.js";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

router.get(
    "/google",
    passport.authenticate("google", {
        scope: ["profile", "email"],
    })
);

router.get(
    "/google/smartfloor",
    passport.authenticate("google", { session: false }),
    userController.googleAuth
);


passport.use(
    "google",
    new GoogleStrategy(
        {
            clientID:
                process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
            userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
        },
        async (accessToken, refreshToken, profile, cb) => {
            console.log(profile);
            try {
                let user = await User.findOne({ email: profile.email });
                if (!user) {
                    let newUser = await User.insertOne({
                        email: profile.email,
                        password: "google",
                        name: profile.displayName,
                    });
                    cb(null, newUser);
                } else {
                    cb(null, user);
                }
            } catch (err) {
                cb(err);
            }
        }
    )
);

export default router;