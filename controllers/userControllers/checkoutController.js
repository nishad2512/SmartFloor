import Cart from "../../models/cartModel.js";
import { Address } from "../../models/userModel.js";
import Order from "../../models/orderModel.js";
import Product from "../../models/productModel.js";

export const checkout = async (req, res) => {
    try {
        const userId = req.userId
        const cartItems = await Cart.find({ user: userId }).populate("product");
        const totalAmount = cartItems.reduce((sum, item) => sum + item.total, 0);
        let shipping = 0;
        if (totalAmount < 50000) {
            shipping = 200;
        }
        let tax = (totalAmount * 18) / 100;

        const total = totalAmount + shipping + tax;

        if (!cartItems || cartItems.length == 0) {
            req.flash("error", "There are no products.");
            return res.redirect('/cart');
        }

        const addresses = await Address.find({ user: userId });

        res.render('user/checkout/checkout', { cartItems, totalAmount, addresses, shipping, tax, total });

    } catch (error) {
        console.error(error);
        req.flash("error", "Something went wrong.");
        res.redirect('/cart');
    }
}

export const placeOrder = async (req, res) => {
    try {

        const { addressId, paymentMethod, totalAmount } = req.body;
        const userId = req.userId;
        let shipping = 0;
        if (totalAmount < 50000) {
            shipping = 200;
        }
        let tax = (totalAmount * 18) / 100;

        const total = totalAmount + shipping + tax;

        const newOrder = new Order({
            user: userId,
            address: addressId,
            paymentMethod: paymentMethod,
            subTotal: totalAmount,
            totalAmount: total,
            shipping,
            tax
        });

        const cartItems = await Cart.find({ user: userId }).populate("product");

        cartItems.forEach(async item => {
            newOrder.items.push({
                product: item.product._id,
                variant: item.variant,
                quantity: item.quantity,
                subTotal: item.total,
            });
            let product = await Product.findById(item.product._id);
            let variant = product.variants.id(item.variant);
            variant.stock = variant.stock - item.quantity;
            await product.save();
        });

        await newOrder.save();

        await Cart.deleteMany({ user: userId });

        res.json({ success: true, orderId: newOrder.orderId });

    } catch (error) {
        console.error(error);
        req.flash("error", "Something went wrong")
        res.redirect('/checkout');
    }
}