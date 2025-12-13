import Admin from "../../models/adminModel.js";
import { compare } from "../../services/authServices.js";
import { createAdminToken, maxAge } from "../../utils/generateToken.js";

const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await Admin.findOne({ email: email });

        if (admin && (await compare(password, admin.password))) {
            const token = createAdminToken(admin._id);
            res.cookie("admin-jwt", token, {
                httpOnly: false,
                maxAge: maxAge * 1000,
            });
            req.flash("success", "Logged in successfully");
            res.redirect("/admin/dashboard");
        } else {
            req.flash("error", "Invalid email or password");
            res.redirect("/admin/login");
        }
    } catch (error) {
        console.error(error);
        req.flash("error", "An error occurred during login");
        res.redirect("/admin/login");
    }
}

export default adminLogin;