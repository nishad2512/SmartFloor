import Cart from "../../models/cartModel.js";
import { Address } from "../../models/userModel.js";
import Order from "../../models/orderModel.js";

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

export const placeOrder = async (req, res) => {
    try {

        const { addressId, paymentMethod } = req.body;

        const newOrder = new Order({
            user: req.userId,
            address: addressId,
            paymentMethod: paymentMethod,
            totalAmount: req.body.totalAmount,
        });

        const cartItems = await Cart.find({ user: req.userId }).populate("product");

        cartItems.forEach(item => {
            newOrder.items.push({
                product: item.product._id,
                variant: item.variant,
                quantity: item.quantity,
                subTotal: item.total,
            });
        });

        await newOrder.save();

        res.json({ success: true, orderId: newOrder.orderId });

    } catch (error) {
        console.error(error);
        req.flash("error", "Something went wrong")
        res.redirect('/checkout');
    }
}