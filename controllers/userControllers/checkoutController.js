import Cart from "../../models/cartModel.js";
import { Address } from "../../models/userModel.js";
import Order from "../../models/orderModel.js";
import Product from "../../models/productModel.js";
import applyOffer from "../../utils/offerFetch.js";
import Offer from "../../models/offerModel.js";

export const checkout = async (req, res) => {
    try {
        const userId = req.userId;
        const { productId, variantId, quantity } = req.query;
        let totalAmount = 0;
        let shipping = 0;
        let tax = 0;
        let total = 0;
        const addresses = await Address.find({ user: userId });
        const now = new Date();

        if (productId && variantId && quantity) {
            const product = await Product.findById(productId);
            const variant = product.variants.id(variantId);

            const productObj = product.toObject();
            const productWithOffer = await applyOffer(productObj);
            const variantWithOffer = productWithOffer.variants.find(
                (v) => v._id.toString() === variantId
            );

            const unitPrice =
                variantWithOffer.offerPrice || variantWithOffer.price;

            totalAmount = unitPrice * quantity;

            const offers = await Offer.find({
                isActive: true,
                start: { $lte: now },
                end: { $gte: now },
                $or: [
                    { products: product._id },
                    { category: product.category },
                    { scope: "all" },
                ],
                type: "shipping",
            });

            if (!offers || totalAmount < 5000) {
                shipping = 200;
            }
            tax = (totalAmount * 18) / 100;
            total = totalAmount + shipping + tax;
            req.session.item = {
                product,
                variant,
                quantity: parseInt(quantity),
                total,
                offerId: productWithOffer.offer
                    ? productWithOffer.offer._id
                    : null,
                offerPrice: variantWithOffer.offerPrice || null,
            };
            return res.render("user/checkout/checkout", {
                product,
                totalAmount,
                addresses,
                shipping,
                tax,
                total,
                quantity,
            });
        }

        const cartItems = await Cart.find({ user: userId }).populate("product");
        totalAmount = cartItems.reduce((sum, item) => sum + item.total, 0);

        for (const item of cartItems) {
            const product = await Product.findById(item.product);

            const offers = await Offer.find({
                isActive: true,
                start: { $lte: now },
                end: { $gte: now },
                $or: [
                    { products: product._id },
                    { category: product.category },
                    { scope: "all" },
                ],
                type: "shipping",
            });
            if (!offers || totalAmount > 5000) {
                shipping = 200;
                break;
            }
        }

        tax = (totalAmount * 18) / 100;
        total = totalAmount + shipping + tax;

        if (!cartItems || cartItems.length == 0) {
            req.flash("error", "There are no products.");
            return res.redirect("/cart");
        }

        res.render("user/checkout/checkout", {
            cartItems,
            totalAmount,
            addresses,
            shipping,
            tax,
            total,
        });
    } catch (error) {
        console.error(error);
        req.flash("error", "Something went wrong.");
        res.redirect("/cart");
    }
};

export const placeOrder = async (req, res) => {
    try {
        const { addressId, paymentMethod, totalAmount } = req.body;
        const userId = req.userId;
        let shipping = 200;
        let tax = (totalAmount * 18) / 100;
        let qualifiesForFreeShipping = false;
        const now = new Date();

        const newOrder = new Order({
            user: userId,
            address: addressId,
            paymentMethod: paymentMethod,
            subTotal: totalAmount,
            tax,
        });

        if (req.session.item) {
            const item = req.session.item;
            let product = await Product.findById(item.product._id);
            let variant = product.variants.id(item.variant);

            const shippingOffer = await Offer.findOne({
                isActive: true,
                start: { $lte: now },
                end: { $gte: now },
                type: "shipping",
                $or: [
                    { products: product._id },
                    { category: product.category },
                    { scope: "all" },
                ],
            });

            if (shippingOffer) qualifiesForFreeShipping = true;

            newOrder.items.push({
                product: item.product._id,
                variant: item.variant,
                quantity: item.quantity,
                subTotal: item.total,
                offerId: item.offerId,
                offerPrice: item.offerPrice,
            });
            variant.stock = variant.stock - item.quantity;
            await product.save();

            req.session.item = null;
        } else {
            const cartItems = await Cart.find({ user: userId }).populate(
                "product"
            );

            for (const item of cartItems) {
                let product = await Product.findById(item.product._id);
                let variant = product.variants.id(item.variant);
                const shippingOffer = await Offer.findOne({
                    isActive: true,
                    start: { $lte: now },
                    end: { $gte: now },
                    type: "shipping",
                    $or: [
                        { products: product._id },
                        { category: product.category },
                        { scope: "all" },
                    ],
                });

                if (shippingOffer) qualifiesForFreeShipping = true;

                newOrder.items.push({
                    product: item.product._id,
                    variant: item.variant,
                    quantity: item.quantity,
                    subTotal: item.total,
                    offerId: item.offerId,
                    offerPrice: item.offerPrice,
                });
                variant.stock = variant.stock - item.quantity;
                await product.save();
            }

            await Cart.deleteMany({ user: userId });
        }

        const total = totalAmount + shipping + tax;

        if (qualifiesForFreeShipping || totalAmount > 5000) {
            shipping = 0;
        }

        newOrder.shipping = shipping;
        newOrder.tax = tax;
        newOrder.totalAmount = total;

        await newOrder.save();

        res.json({ success: true, orderId: newOrder.orderId });
    } catch (error) {
        console.error(error);
        req.flash("error", "Something went wrong");
        res.redirect("/checkout");
    }
};
