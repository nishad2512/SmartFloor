import Cart from "../../models/cartModel.js";
import { Address } from "../../models/userModel.js";

export const checkout = async (req, res) => {
    try {
        const userId = req.userId
        const cartItems = await Cart.find({ user: userId }).populate("product");
        const totalAmount = cartItems.reduce((sum, item) => sum + item.total, 0);

        const addresses = await Address.find({ user: userId });

        res.render('user/checkout/checkout', { cartItems, totalAmount, addresses });

    } catch (error) {
        console.error(error);
        req.flash("error", "Something went wrong.");
        res.redirect('/cart');
    }
}