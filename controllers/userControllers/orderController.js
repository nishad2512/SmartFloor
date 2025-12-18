import Order from "../../models/orderModel.js";
import Return from "../../models/returnModel.js";

export const orderConfirmation = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const userId = req.userId;
        const order = await Order.findOne({ orderId: orderId, user: userId }).populate('items.product').populate('address').populate('user');

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

export const orders = async (req, res) => {
    try {
        const userId = req.userId;
        const orders = await Order.find({ user: userId }).sort({ createdAt: -1 })

        res.render('user/order/orders', { orders });

    } catch (error) {
        console.error(error);
        req.flash("error", "Something went wrong.");
        res.redirect('/profile/orders');
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

        const order = await Order.findOne({ orderId, user: userId });

        if (!order) {
            return res.json({ success: false, message: "Invalid Order" })
        }

        order.cancelReason = reason;
        order.status = 'Cancelled';
        await order.save();

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

        const order = await Order.findOne({ orderId, user: req.userId });

        if (!order) {
            return res.json({ success: false, message: "Invalid Order" })
        }

        const item = order.items.id(itemId);

        if (!item) {
            return res.json({ success: false, message: "Item not found" })
        }

        item.status = 'Cancelled';
        item.cancelReason = reason;

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

        // Create return requests for all items
        for (const item of order.items) {
            if (item.status === 'Delivered') { // Only return delivered items
                const existingReturn = await Return.findOne({ orderId: order._id, itemId: item._id });
                if (!existingReturn) {
                    await new Return({
                        orderId: order._id,
                        userId,
                        itemId: item._id,
                        reason,
                        status: 'Return Request',
                        refundAmount: item.subTotal
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

        await new Return({
            orderId: order._id,
            userId: req.userId,
            itemId: item._id,
            reason,
            status: 'Return Request',
            refundAmount: item.subTotal
        }).save();

        item.status = 'Return Request';
        item.returnReason = reason;

        // Check if all items are now returned/requested
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

        // Find the specific return document and populate everything needed
        const returnDoc = await Return.findOne({ orderId, itemId, userId })
            .populate({
                path: 'orderId',
                populate: { path: 'address' } // Get address from the order
            })

        if (!returnDoc) {
            req.flash("error", "Return record not found");
            return res.redirect('/profile/orders');
        }

        // Since itemId is a sub-document ID in the Order, we find the specific item details
        const order = returnDoc.orderId;
        const item = order.items.id(itemId);
        
        // Manually find the variant from the populated product
        // We assume the order.items.product was populated or we fetch it here
        await order.populate('items.product');
        const variant = item.product.variants.id(item.variant);

        res.render('user/order/returnDetails', { 
            returnDoc, 
            order, 
            item, 
            variant 
        });

    } catch (error) {
        console.error("Return Details Error:", error);
        req.flash("error", "Something went wrong while fetching return details");
        res.redirect('/profile/orders');
    }
}