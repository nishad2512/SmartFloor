import User from "../models/userModel.js";

async function refund(order, item) {
    const totalOrderSubtotal = order.subTotal;

    const totalDiscountGiven = order.coupenDiscount || 0;
    const itemDiscountShare = (item.subTotal / totalOrderSubtotal) * totalDiscountGiven;

    const totalTax = order.tax || 0;
    const itemTaxShare = (item.subTotal / totalOrderSubtotal) * totalTax;

    const finalRefund = (item.subTotal - itemDiscountShare) + itemTaxShare;

    const user = await User.findById(order.user);
    user.wallet += Math.round(finalRefund);

    user.walletHistory.push({
        amount: Math.round(finalRefund),
        type: "credit",
        reason: `Refund for order ${order.orderId}`,
        date: new Date
    });

    await user.save();
    console.log(user);
}

export default refund;