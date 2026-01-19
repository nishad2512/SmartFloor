import Order from "../../models/orderModel.js";
import Return from "../../models/returnModel.js";
import Product from "../../models/productModel.js";
import generateInvoice from "../../utils/invoice.js";
import refund, { calculateRefundAmount } from "../../utils/refund.js";
import User from "../../models/userModel.js";
import Coupen from "../../models/coupenModel.js";

export const orderConfirmation = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const userId = req.userId;
        const order = await Order.findOne({ _id: orderId, user: userId }).populate('items.product').populate('address').populate('user');

        if (!order) {
            req.flash("error", "Order not found");
            return res.redirect('/profile/orders');
        }

        const estDelivery = new Date(order.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000)

        res.render('user/order/orderConfirmation', { order, estDelivery });

    } catch (error) {
        console.error(error);
        req.flash("error", "Something went wrong.");
        res.redirect('/profile/orders');
    }
};

export const downloadInvoice = async (req, res) => {
    try {
        const { orderId } = req.params;

        // Fetch order and populate product details
        const order = await Order.findOne({ orderId }).populate('items.product').populate('address').populate('user');

        if (!order) {
            return res.status(404).send('Order not found');
        }

        // Set Headers to tell browser this is a PDF file to download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${orderId}.pdf`);

        // Generate PDF
        generateInvoice(order, res);

    } catch (error) {
        console.error('Invoice Error:', error);
        res.status(500).send('Error generating invoice');
    }
};

export const orders = async (req, res) => {
    try {
        const userId = req.userId;
        const { status, sort, search, page = 1 } = req.query;
        const limit = 5;
        const skip = (page - 1) * limit;

        let query = { user: userId };

        // SEARCH
        if (search) {
            const products = await Product.find({ name: { $regex: search, $options: 'i' } }).select('_id');
            const productIds = products.map(p => p._id);

            // Update query to be OR: OrderID matches OR items.product is in productIds
            const searchCondition = {
                $or: [
                    { orderId: { $regex: search, $options: 'im' } },
                    { "items.product": { $in: productIds } }
                ]
            };
            // Merge with user filter
            query = { ...query, ...searchCondition };
        }

        // FILTER
        if (status && status !== 'All') {
            query.status = status;
        }

        // SORT
        let sortOption = { createdAt: -1 }; // Default Newest
        if (sort === 'Oldest') sortOption = { createdAt: 1 };
        if (sort === 'Price: Low to High') sortOption = { totalAmount: 1 };
        if (sort === 'Price: High to Low') sortOption = { totalAmount: -1 };

        const orders = await Order.find(query)
            .populate('items.product')
            .sort(sortOption)
            .skip(skip)
            .limit(limit);

        const finalCount = await Order.countDocuments(query);
        const totalPages = Math.ceil(finalCount / limit);

        res.render('user/order/orders', {
            orders: orders,
            currentPage: parseInt(page),
            totalPages,
            status,
            sort,
            search
        });

    } catch (error) {
        console.error(error);
        req.flash("error", "Something went wrong.");
        res.redirect('/profile/details');
    }
}

export const orderDetails = async (req, res) => {
    try {
        const userId = req.userId;
        const orderId = req.params.orderId
        const order = await Order.findOne({ orderId, user: userId }).populate("items.product").populate("address")
        const variants = order.items.map(item => {
            let variant = item.product.variants.id(item.variant);
            return {
                size: variant.size,
                price: variant.price,
                stock: variant.stock
            }
        })
        const estDelivery = new Date(order.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000)

        res.render('user/order/orderDetails', { order, estDelivery, variants });

    } catch (error) {
        console.error(error);
        req.flash("error", "Something went wrong.");
        res.redirect('/profile/orders');
    }
}

export const cancelOrder = async (req, res) => {
    try {

        const { reason } = req.body;
        const orderId = req.params.orderId;
        const userId = req.userId;

        const order = await Order.findOne({ orderId, user: userId }).populate('items.product')

        if (!order) {
            return res.json({ success: false, message: "Invalid Order" })
        }

        let shouldRefund = true;
        if (order.paymentMethod === 'cod' && order.paymentStatus !== 'paid') {
            shouldRefund = false;
        }

        let totalRefundAmount = 0;

        for (const item of order.items) {
            if (item.status !== 'Cancelled' && item.status !== 'Returned' && item.status !== 'Return Request') {

                item.status = 'Cancelled';
                item.cancelReason = reason;

                const product = await Product.findById(item.product);
                if (product) {
                    const variant = product.variants.id(item.variant);
                    if (variant) {
                        variant.stock = variant.stock + item.quantity;
                        await product.save();
                    }
                }

                if (shouldRefund) {
                    totalRefundAmount += calculateRefundAmount(order, item);
                }
            }
        }

        if (shouldRefund && order.shipping > 0) {
            totalRefundAmount += order.shipping;
        }

        order.cancelReason = reason;
        order.status = 'Cancelled';
        await order.save();

        if (shouldRefund && totalRefundAmount > 0) {
            const user = await User.findById(order.user);
            const finalRefund = Math.round(totalRefundAmount);
            user.wallet += finalRefund;

            user.walletHistory.push({
                amount: finalRefund,
                type: "credit",
                reason: `Refund for order #${order.orderId.split('-')[2]} - Order Cancellation`,
                date: new Date()
            });
            await user.save();
        }

        res.json({ success: true });

    } catch (error) {
        console.error(error);
        req.flash("error", "Something went wrong.");
        res.redirect('/profile/orders');
    }
}

export const cancelOrderItem = async (req, res) => {
    try {

        const { reason } = req.body;
        const orderId = req.params.orderId;
        const itemId = req.params.itemId;
        let finalRefund = 0;

        const order = await Order.findOne({ orderId, user: req.userId });

        if (!order) {
            return res.json({ success: false, message: "Invalid Order" })
        }

        const item = order.items.id(itemId);

        if (!item) {
            return res.json({ success: false, message: "Item not found" })
        }

        let shouldRefund = true;
        if (order.paymentMethod === 'cod' && order.paymentStatus !== 'paid') {
            shouldRefund = false;
        }

        let refundAmount = calculateRefundAmount(order, item);

        if (order.coupenCode) {
            const coupen = await Coupen.findOne({ code: order.coupenCode });
            if (coupen && coupen.minPurchaseAmount > 0) {
                if (order.items.length > 1 && (order.subTotal - refundAmount) < coupen.minPurchaseAmount) {
                    return res.json({ success: false, message: "Order sub-total will become below the minimum purchase amount for the coupon. You will need to cancel the entire order." });
                }
            }
        }

        if (shouldRefund) {

            const activeItems = order.items.filter(i => i.status !== 'Cancelled' && i.status !== 'Returned');
            const isLastItem = activeItems.length === 1 && activeItems[0]._id.toString() === itemId.toString();

            if (isLastItem && order.shipping > 0) {
                refundAmount += order.shipping;
            }

            finalRefund = Math.floor(refundAmount);

            const user = await User.findById(order.user);
            user.wallet += finalRefund;
            user.walletHistory.push({
                amount: finalRefund,
                type: "credit",
                reason: `Refund for order #${order.orderId.split('-')[2]} - Item Cancellation`,
                date: new Date()
            });
            await user.save();
        }

        item.status = 'Cancelled';
        item.cancelReason = reason;

        order.refund += finalRefund;
        order.totalAmount -= refundAmount;

        const product = await Product.findById(item.product);
        const variant = product.variants.id(item.variant);
        variant.stock = variant.stock + item.quantity;
        await product.save();

        const cancel = order.items.every(i => i.status == 'Cancelled');

        if (cancel) {
            order.status = 'Cancelled';
            req.flash("success", "This order is cancelled");
        }
        await order.save();

        res.json({ success: true });

    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message })
    }
}


export const returnOrder = async (req, res) => {
    try {
        const { reason } = req.body;
        const orderId = req.params.orderId;
        const userId = req.userId;

        const order = await Order.findOne({ orderId, user: userId });

        if (!order) {
            return res.json({ success: false, message: "Invalid Order" })
        }

        for (const item of order.items) {
            if (item.status === 'Delivered') {
                const existingReturn = await Return.findOne({ orderId: order._id, itemId: item._id });
                if (!existingReturn) {
                    const refundAmt = calculateRefundAmount(order, item);

                    await new Return({
                        orderId: order._id,
                        userId,
                        itemId: item._id,
                        reason,
                        status: 'Return Request',
                        refundAmount: refundAmt
                    }).save();

                    item.status = 'Return Request';
                    item.returnReason = reason;
                }
            }
        }

        order.status = 'Return Request';
        order.returnReason = reason;
        await order.save();

        res.json({ success: true });

    } catch (error) {
        console.error(error);
        req.flash("error", "Something went wrong.");
        res.redirect('/profile/orders');
    }
}

export const returnOrderItem = async (req, res) => {
    try {
        const { reason } = req.body;
        const orderId = req.params.orderId;
        const itemId = req.params.itemId;

        const order = await Order.findOne({ orderId, user: req.userId });

        if (!order) {
            return res.json({ success: false, message: "Invalid Order" })
        }

        const item = order.items.id(itemId);

        if (!item) {
            return res.json({ success: false, message: "Item not found" })
        }

        const existingReturn = await Return.findOne({ orderId: order._id, itemId: item._id });
        if (existingReturn) {
            return res.json({ success: false, message: "Return request already exists for this item" });
        }

        const refundAmt = calculateRefundAmount(order, item);

        await new Return({
            orderId: order._id,
            userId: req.userId,
            itemId: item._id,
            reason,
            status: 'Return Request',
            refundAmount: refundAmt
        }).save();

        item.status = 'Return Request';
        item.returnReason = reason;

        const allReturned = order.items.every(i => i.status === 'Return Request' || i.status === 'Returned');
        if (allReturned) {
            order.status = 'Return Request';
        }
        await order.save();

        res.json({ success: true });

    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message })
    }
}

export const returnDetails = async (req, res) => {
    try {
        const { orderId, itemId } = req.params;
        const userId = req.userId;

        const returnDoc = await Return.findOne({ orderId, itemId, userId })
            .populate({
                path: 'orderId',
                populate: { path: 'address' }
            })

        if (!returnDoc) {
            req.flash("error", "Return record not found");
            return res.redirect('/profile/orders');
        }

        const order = returnDoc.orderId;
        const item = order.items.id(itemId);

        const totalOrderSubtotal = order.subTotal;

        const totalDiscountGiven = order.coupenDiscount || 0;
        const itemDiscountShare = (item.subTotal / totalOrderSubtotal) * totalDiscountGiven;

        const totalTax = order.tax || 0;
        const itemTaxShare = (item.subTotal / totalOrderSubtotal) * totalTax;

        const finalRefund = (item.subTotal - itemDiscountShare) + itemTaxShare;

        await order.populate('items.product');
        const variant = item.product.variants.id(item.variant);

        res.render('user/order/returnDetails', {
            returnDoc,
            order,
            item,
            variant,
            itemTaxShare,
            itemDiscountShare,
            finalRefund
        });

    } catch (error) {
        console.error("Return Details Error:", error);
        req.flash("error", "Something went wrong while fetching return details");
        res.redirect('/profile/orders');
    }
}

export const reviewPage = async (req, res) => {
    try {

        const product = await Product.findById(req.params.productId);
        const order = await Order.findOne({ orderId: req.query.orderId });

        res.render('user/products/review', { product, order });

    } catch (error) {
        console.error(error);
        req.flash("error", "Failed to load review page.");
        res.redirect('/profile/orders');
    }
}

export const addReview = async (req, res) => {
    try {

        const product = await Product.findById(req.params.productId);
        const user = await User.findById(req.userId).lean();

        product.reviews.push({
            title: req.body.title,
            review: req.body.review,
            author: user.name,
            date: new Date,
            rating: req.body.rating
        });

        await product.save();

        req.flash("success", "Review added successfully");
        res.redirect('/profile/orders');

    } catch (error) {
        console.error(error);
        req.flash("error", "Failed to add review.");
        res.redirect('/profile/orders');
    }
}