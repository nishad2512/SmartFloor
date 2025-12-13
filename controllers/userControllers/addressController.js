import User from "../../models/userModel.js";
import { Address } from "../../models/userModel.js";



export const addresses = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await User.findById(userId); // Fetch user details
        const addresses = await Address.find({ user: userId });
        console.log("User Addresses:", addresses);
        res.render("user/profile/address", { addresses, user }); // Pass user to view
    } catch (error) {
        console.error(error);
        req.flash("error", "Error loading addresses");
        res.redirect("/profile/details");
    }
};