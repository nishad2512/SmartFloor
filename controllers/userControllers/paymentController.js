import Razorpay from "razorpay";
import crypto from "crypto";
import dotenv from "dotenv";
import Order from "../../models/orderModel.js";
import User from "../../models/userModel.js";

dotenv.config();

export const payment = async (req, res) => {
    try {
        // console.log(req.params.orderId);

        const order = await Order.findOne({
            orderId: req.params.orderId,
        }).populate("items.product");
        const user = await User.findById(req.userId);

        if (order.paymentStatus == 'paid' || order.paymentMethod == 'cod') {
            req.flash('error', 'Order already placed');
            return res.redirect('/profile/orders')
        }

        res.render("user/payment/payment", {
            order,
            user,
            razorpayKeyId: "rzp_test_RysFjKh7FeeVsH"
        });
    } catch (error) {
        console.error(error);
    }
};

export const placeOrder = async (req, res) => {
    try {

        const { selectedMethod, orderId } = req.body;

        const order = await Order.findById(orderId);
        const user = await User.findById(req.userId);

        if (!user || !order) {
            return res.json({ success: false, message: "Order/User is not valid" });
        }

        if (selectedMethod == 'wallet') {
            user.wallet -= order.totalAmount;
            user.walletHistory.push({
                amount: order.totalAmount,
                type: 'debit',
                reason: `Paid for order ${order.orderId}.`,
                date: new Date
            });

            order.paymentMethod = 'wallet';
            order.paymentStatus = 'paid';
        } else {
            order.paymentMethod = 'cod';
            order.paymentStatus = 'pending';
        }

        await user.save();
        await order.save();

        return res.json({ success: true });

    } catch (error) {
        console.error(error);
    }
};

// razorpay

const razorpay = new Razorpay({
    key_id: "rzp_test_RysFjKh7FeeVsH",
    key_secret: "8rI3WgnoM97JOj8mJ6vX7xTq",
});

export const createOrder = async (req, res) => {
    try {

        let amount = req.body?.amount;

        if (req.body.orderId) {
            
            const orderData = await Order.findById(req.body.orderId);

            if (!orderData) {
                return res.status(404).json({ success: false, message: "Order not found" });
            }

            amount = orderData.totalAmount;

            if (amount < 1) {
                return res.status(400).json({ success: false, message: "Amount must be at least 1 INR" });
            }

        }

        const options = {
            amount: Math.round(amount * 100),
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
        };

        const order = await razorpay.orders.create(options);

        // console.log("Razorpay Order Created:", order);

        res.json({
            success: true,
            order,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
};

export const verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac("sha256", "8rI3WgnoM97JOj8mJ6vX7xTq")
            .update(body)
            .digest("hex");

        if (expectedSignature === razorpay_signature) {
            // ✅ Payment verified
            // Update order status in DB

            if (req.body.orderId) {
                const order = await Order.findById(req.body.orderId);

                order.paymentStatus = "paid";
                order.paymentMethod = "razorpay";

                await order.save();
            } else {
                const user = await User.findById(req.userId);

                user.wallet += Number(req.body.amount);
                user.walletHistory.push({
                    amount: req.body.amount,
                    type: 'credit',
                    reason: `Added ${req.body.amount} to wallet.`,
                    date: new Date
                });

                await user.save();
            }

            return res.json({ success: true });
        } else {
            if (req.body.orderId) {
                const order = await Order.findById(req.body.orderId).populate('items.product')
                order.paymentStatus = "failed";
                order.paymentMethod = "razorpay";
                // order.status = "Cancelled";
                // order.items.forEach(async (item) => {
                //     item.status = "Cancelled"
                //     const variant = await item.product.variants.id(item.variant);
                //     variant.stock += item.quantity;
                // });
                // order.cancelReason = "Payment failed";

                await order.save();
            }

            return res.json({ success: false });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
};

export const failedPage = async (req, res) => {
    try {

        const orderId = req.params.orderId;
        const userId = req.userId;
        const order = await Order.findOne({ _id: orderId, user: userId }).populate('items.product').populate('address').populate('user');

        if (!order) {
            req.flash("error", "Order not found");
            return res.redirect('/profile/orders');
        }

        // const estDelivery = new Date(order.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000)

        res.render('user/payment/paymentFailed', { order });

    } catch (error) {
        console.error(error);
    }
}