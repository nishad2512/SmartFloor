import Cart from "../../models/cartModel.js";
import User, { Address } from "../../models/userModel.js";
import Order from "../../models/orderModel.js";
import Product from "../../models/productModel.js";
import applyOffer from "../../utils/offerFetch.js";
import Offer from "../../models/offerModel.js";
import Coupen from "../../models/coupenModel.js";

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
        const coupens = await Coupen.find();
        const user = await User.findById(userId);

        if (productId && variantId && quantity) {
            const product = await Product.findById(productId);
            if (!product.isActive) {
                req.flash("error", "Product not found")
                return res.redirect('/products')
            }
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
                totalAmount,
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
                coupens,
                user
            });
        }

        const cartItems = await Cart.find({ user: userId }).populate("product");
        if (cartItems.some(item => !item.product.isActive)) {
            req.flash("error", "There are Unavailable products")
            return res.redirect('/cart')
        }
        totalAmount = cartItems.reduce((sum, item) => sum + item.total, 0);

        const offerPromises = cartItems.map(async (item) => {

            const product = await Product.findById(item.product);
        
            if (!product) return { hasOffer: false };

            const offer = await Offer.findOne({
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

            return { hasOffer: !!offer };
        });

        const results = await Promise.all(offerPromises);

        const anyItemsHaveOffers = results.some(res => res.hasOffer);

        if (!anyItemsHaveOffers || totalAmount < 5000) {
            shipping = 200
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
            coupens,
            user
        });
    } catch (error) {
        console.error(error);
        req.flash("error", "Something went wrong.");
        res.redirect("/cart");
    }
};

export const placeOrder = async (req, res) => {
    try {
        const { addressId, coupenCode, totalAmount } = req.body;
        const userId = req.userId;
        let shipping = 200;
        let tax = (totalAmount * 18) / 100;
        let qualifiesForFreeShipping = false;
        const now = new Date();
        let coupenDiscount = 0;

        const newOrder = new Order({
            user: userId,
            address: addressId,
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
                subTotal: item.totalAmount,
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

        if (qualifiesForFreeShipping || totalAmount > 5000) {
            shipping = 0;
        }

        const coupen = await Coupen.findOne({code: coupenCode, isActive: true, expirationDate: {$gte: new Date}});
        if (coupen && coupen.discountType == "percentage") {
            coupenDiscount = (totalAmount * coupen.discountValue) / 100;
        } else if (coupen && coupen.discountType == "fixed") {
            coupenDiscount = coupen.discountValue;
        }

        const total = (totalAmount + shipping + tax) - coupenDiscount;

        newOrder.shipping = shipping;
        newOrder.tax = tax;
        newOrder.coupenDiscount = coupenDiscount;
        newOrder.coupenCode = coupenCode;
        newOrder.totalAmount = total;

        await newOrder.save();

        res.json({ success: true, orderId: newOrder.orderId });
    } catch (error) {
        console.error(error);
        req.flash("error", "Something went wrong");
        res.redirect("/checkout");
    }
};

export const applyCoupen = async (req, res) => {
    try {

        const { code, currentTotal } = req.body;

        const coupen = await Coupen.findOne({ 
            code, 
            isActive: true,
            expirationDate: { $gte: new Date() } 
        });

        if (!coupen) {
            return res.json({ success: false, message: "Invalid or expired coupon" });
        }

        if (coupen.minPurchaseAmount > currentTotal) {
            res.json({success: false, message: "minimum purchase amount is not covered"})
        }

        let discountAmount = 0;

        // 3. Calculate Discount
        if (coupen.discountType === "percentage") {
            discountAmount = (currentTotal * coupen.discountValue) / 100;
            // Optional: You might want to cap percentage discounts (e.g., max ₹500)
        } else {
            discountAmount = coupen.discountValue;
        }

        // Ensure discount doesn't exceed the total
        if (discountAmount > currentTotal) discountAmount = currentTotal;

        const newTotal = currentTotal - discountAmount;

        res.json({ 
            success: true, 
            newTotal: Math.round(newTotal), 
            discountAmount: Math.round(discountAmount) 
        });

    } catch (error) {
        console.error(error);
    }
}