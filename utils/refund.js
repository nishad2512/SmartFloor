import Order from "../models/orderModel.js";
import User from "../models/userModel.js";

export const calculateRefundAmount = (order, item) => {
    const totalOrderSubtotal = order.subTotal || 1;

    const totalDiscountGiven = order.coupenDiscount || 0;
    const itemDiscountShare = (item.subTotal / totalOrderSubtotal) * totalDiscountGiven;

    const totalTax = order.tax || 0;
    const itemTaxShare = (item.subTotal / totalOrderSubtotal) * totalTax;

    let refundAmount = (item.subTotal - itemDiscountShare) + itemTaxShare;

    return refundAmount;
};

async function refund(order, item) {

    const refundAmount = calculateRefundAmount(order, item);

    order.refund += refundAmount;
    order.totalAmount -= refundAmount;

    const user = await User.findById(order.user);
    user.wallet += refundAmount;

    user.walletHistory.push({
        amount: refundAmount,
        type: "credit",
        reason: `Refund for order ${order.orderId}`,
        date: new Date()
    });

    await user.save();
}

export default refund;