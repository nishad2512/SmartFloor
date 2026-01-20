import Order from "../models/orderModel.js";

const getSalesData = async (query) => {
    const { period, startDate, endDate, status, paymentMethod } = query;

    let filter = {};

    let start = new Date();
    start.setHours(0, 0, 0, 0);

    if (period === 'daily') {
        filter.createdAt = { $gte: start };
    } else if (period === 'weekly') {
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
        filter.createdAt = { $gte: start };
    } else if (period === 'monthly') {
        start.setDate(1);
        filter.createdAt = { $gte: start };
    } else if (period === 'yearly') {
        start.setMonth(0, 1);
        filter.createdAt = { $gte: start };
    } else if (period === 'custom' && startDate && endDate) {
        filter.createdAt = {
            $gte: new Date(startDate),
            $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
        };
    }

    if (status) filter.status = status;
    if (paymentMethod) filter.paymentMethod = paymentMethod;

    const revenueStatus = status == 'Cancelled' || status == 'Returned' ? true : false;
    const [orders, stats] = await Promise.all([
        Order.find(filter).sort({ createdAt: -1 }).populate('user', 'name email').lean(),
        Order.aggregate([
            { 
                $match: { 
                    ...filter, 
                    paymentStatus: "paid",
                    status: { $nin: ["Cancelled", "Returned"] }
                } 
            },
            { 
                $group: { 
                    _id: null, 
                    totalRevenue: { $sum: "$totalAmount" }, 
                    totalItemsSold: { $sum: { $sum: "$items.quantity" } } 
                } 
            }
        ])
    ]);

    let refunds = orders.reduce((acc, order) => acc + (order.refund || 0), 0) + orders.reduce((acc, order) => {
        if ((order.status === 'Cancelled' && order.paymentStatus === 'paid') || order.status === 'Returned') {
            return acc + order.totalAmount;
        }
        return acc;
    }, 0);

    const overallOrderAmount = orders.reduce((acc, order) => acc + order.totalAmount, 0);
    const overallDiscount = orders.reduce((acc, order) => acc + (order.coupenDiscount || 0), 0);
    
    const totalRevenue = stats.length > 0 ? stats[0].totalRevenue : 0;
    const overallSalesCount = stats.length > 0 ? stats[0].totalItemsSold : 0;

    return {
        orders,
        overallOrderAmount,
        overallSalesCount,
        totalRevenue,
        overallDiscount,
        period,
        startDate,
        endDate,
        status,
        refunds,
        paymentMethod
    };
};

export default getSalesData;