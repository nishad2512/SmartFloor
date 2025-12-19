import Cart from "../../models/cartModel.js";
import { Address } from "../../models/userModel.js";
import Order from "../../models/orderModel.js";
import Product from "../../models/productModel.js";

export const checkout = async (req, res) => {
    try {
        const userId = req.userId
        const { productId, variantId, quantity } = req.query;
        let totalAmount = 0;
        let shipping = 0;
        let tax = 0;
        let total = 0;
        const addresses = await Address.find({ user: userId });

        if (productId && variantId && quantity) {

            const product = await Product.findById(productId)
            const variant = product.variants.id(variantId);
            totalAmount = variant.price * quantity;
            if (totalAmount < 50000) {
                shipping = 200;
            }
            tax = (totalAmount * 18) / 100;
            total = totalAmount + shipping + tax;
            // req.session.order = {product, variant, quantity};
            res.render('user/checkout/checkout', { product, totalAmount, addresses, shipping, tax, total, quantity });

        }

        tax = (totalAmount * 18) / 100;
        total = totalAmount + shipping + tax;

        const cartItems = await Cart.find({ user: userId }).populate("product");
        totalAmount = cartItems.reduce((sum, item) => sum + item.total, 0);
        if (totalAmount < 50000) {
            shipping = 200;
        }

        if (!cartItems || cartItems.length == 0) {
            req.flash("error", "There are no products.");
            return res.redirect('/cart');
        }

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

        // if(req.session.product) {
        //     const product = req.session.product
        //     newOrder.items.push({
        //         product: product._id,
        //         variant: item.variant,
        //         quantity: item.quantity,
        //         subTotal: item.total,
        //     });
        // }

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