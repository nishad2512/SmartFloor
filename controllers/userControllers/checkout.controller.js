import Cart from "../../models/cartModel.js";
import Order from "../../models/orderModel.js";
import Product from "../../models/productModel.js";
import Offer from "../../models/offerModel.js";
import Coupen from "../../models/coupenModel.js";
import * as checkoutService from "../../services/userServices/checkout.service.js";
import { Address } from "../../models/userModel.js";

export const checkout = async (req, res) => {
    try {
        const userId = req.userId;
        
        const checkoutData = await checkoutService.buildCheckout(userId, req.query, req);

        if (checkoutData.mode === 'single') {
            req.session.item = {
                product: checkoutData.product,
                variant: checkoutData.variant,
                quantity: checkoutData.quantity,
                totalAmount: checkoutData.totalAmount,
                offerId: checkoutData.offerId,
                offerPrice: checkoutData.offerPrice,
            };
        }

        res.render("user/checkout/checkout", checkoutData);
    } catch (error) {
        console.error(error);
        req.flash("error", error.message || "An error occurred while processing checkout. Please try again.");
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

        const cartItems = await Cart.find({ user: userId }).populate("product");
        const item = req.session.item;

        const recentOrder = await Order.findOne({
            user: userId,
            status: 'Pending',
            createdAt: { $gte: new Date(Date.now() - 60 * 1000) }
        }).sort({ createdAt: -1 }).lean();

        if (!item && cartItems.length === 0) {
            if (recentOrder) return res.json({ success: true, orderId: recentOrder.orderId });
            return res.json({ success: false, message: "Cart is empty" });
        }

        const addressDoc = await Address.findById(addressId);

        const addressSnapshot = addressDoc.toObject({ 
            transform: (doc, ret) => {
                delete ret._id; // Remove the ID during conversion
                delete ret.__v; // Remove the version key
                return ret;
            }
        });

        const newOrder = new Order({
            user: userId,
            address: addressSnapshot,
            subTotal: totalAmount,
            tax,
        });

        // 2. Handle Direct Purchase (Single Item)
        if (item) {
            let product = await Product.findById(item.product._id);
            let variant = product.variants.id(item.variant);

            if (!variant || variant.stock < item.quantity) {
                return res.json({ success: false, message: "Product out of stock" });
            }

            if (recentOrder && recentOrder.items[0]?.product.toString() === item.product._id.toString()) {
                return res.json({ success: true, orderId: recentOrder.orderId });
            }

            const shippingOffer = await Offer.findOne({
                isActive: true, start: { $lte: now }, end: { $gte: now }, type: "shipping",
                $or: [{ products: product._id }, { category: product.category }, { scope: "all" }],
            }).lean();
            if (shippingOffer) qualifiesForFreeShipping = true;

            newOrder.items.push({
                product: item.product._id,
                variant: item.variant,
                quantity: item.quantity,
                subTotal: item.totalAmount,
                offerId: item.offerId,
                offerPrice: item.offerPrice,
            });

            variant.stock -= item.quantity;
            await product.save();
            req.session.item = null;

        } else {
            // 3. Handle Cart Purchase (Bulk)
            const productIds = cartItems.map(i => i.product._id);
            const categories = cartItems.map(i => i.product.category);

            const shippingOffers = await Offer.find({
                isActive: true, type: "shipping", start: { $lte: now }, end: { $gte: now },
                $or: [{ products: { $in: productIds } }, { category: { $in: categories } }, { scope: "all" }]
            }).lean();
            if (shippingOffers.length > 0) qualifiesForFreeShipping = true;

            const bulkOps = [];
            for (const cartItem of cartItems) {

                const variant = cartItem.product.variants.id(cartItem.variant);
                if (!variant || variant.stock < cartItem.quantity) {
                    return res.json({ success: false, message: `${cartItem.product.name} is out of stock.` });
                }

                newOrder.items.push({
                    product: cartItem.product._id,
                    variant: cartItem.variant,
                    quantity: cartItem.quantity,
                    subTotal: cartItem.total,
                    offerId: cartItem.offerId,
                    offerPrice: cartItem.offerPrice,
                });

                bulkOps.push({
                    updateOne: {
                        filter: {
                            _id: cartItem.product._id,
                            "variants._id": cartItem.variant,
                            "variants.stock": { $gte: cartItem.quantity }
                        },
                        update: { $inc: { "variants.$.stock": -cartItem.quantity } }
                    }
                });
            }

            if (bulkOps.length > 0) await Product.bulkWrite(bulkOps);
            await Cart.deleteMany({ user: userId });
        }

        if (qualifiesForFreeShipping || totalAmount > 5000) shipping = 0;

        const coupen = await Coupen.findOne({ code: coupenCode, isActive: true, expirationDate: { $gte: new Date() } }).lean();
        if (coupen) {
            coupenDiscount = coupen.discountType === "percentage"
                ? (coupen.maxDiscountAmount ? Math.min((totalAmount * coupen.discountValue) / 100, coupen.maxDiscountAmount)
                : (totalAmount * coupen.discountValue) / 100)
                : coupen.discountValue;
        }

        newOrder.shipping = shipping;
        newOrder.tax = tax;
        newOrder.coupenDiscount = coupenDiscount.toFixed(2);
        newOrder.coupenCode = coupenCode;
        newOrder.totalAmount = (totalAmount + shipping + tax - coupenDiscount).toFixed(2);

        await newOrder.save();
        res.json({ success: true, orderId: newOrder.orderId });

    } catch (error) {
        console.error("Order Placement Error:", error);
        res.status(500).json({ success: false, message: "Something went wrong" });
    }
};

export const applyCoupen = async (req, res) => {
    try {

        const { code, currentTotal, fullTotal } = req.body;

        const coupen = await Coupen.findOne({
            code,
            isActive: true,
            expirationDate: { $gte: new Date() },
            $or: [
                { usageLimit: null },
                { $expr: { $lt: ["$usedCount", "$usageLimit"] } }
            ]
        });

        if (!coupen) {
            return res.json({ success: false, message: "Invalid or expired coupon" });
        }

        if (coupen.minPurchaseAmount > currentTotal) {
            return res.json({ success: false, message: "minimum purchase amount is not covered" })
        }

        const used = await Order.findOne({ user: req.userId, coupenCode: code }).lean();

        if (used) {
            return res.json({ success: false, message: "Coupon already used" });
        }

        let discountAmount = 0;

        if (coupen.discountType === "percentage") {
            discountAmount = coupen.maxDiscountAmount
                ? Math.min((currentTotal * coupen.discountValue) / 100, coupen.maxDiscountAmount)
                : (currentTotal * coupen.discountValue) / 100;
        } else {
            discountAmount = coupen.discountValue;
        }

        coupen.usedCount++;

        await coupen.save();

        if (discountAmount > currentTotal) discountAmount = currentTotal;

        console.log("Discount Amount:", discountAmount);
        console.log("Full Total:", fullTotal);

        const newTotal = fullTotal - discountAmount;

        console.log("New Total after applying coupon:", newTotal);

        res.json({
            success: true,
            newTotal: Math.round(newTotal),
            discountAmount: Math.round(discountAmount)
        });

    } catch (error) {
        console.error(error);
    }
}