import Order from "../../models/orderModel.js";

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
        const orders = await Order.find({ user: userId })

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
        const estDelivery = new Date(order.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000)

        res.render('user/order/orderDetails', { order, estDelivery });

    } catch (error) {
        console.error(error);
        req.flash("error", "Something went wrong.");
        res.redirect('/profile/orders');
    }
}