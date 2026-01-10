import Order from "../models/orderModel.js";

const getSalesData = async (query) => {
    const { period, startDate, endDate, status, paymentMethod } = query;

    let filter = {}; // Only count successful sales

    // 1. Handle Date Logic
    let start = new Date();
    start.setHours(0, 0, 0, 0);

    if (period === 'daily') {
        filter.createdAt = { $gte: start };
    } else if (period === 'weekly') {
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
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

    // 2. Handle Status Logic
    if (status && status !== "") {
        filter.status = status;
    }

    // 3. Handle Payment Method Logic
    if (paymentMethod && paymentMethod !== "") {
        filter.paymentMethod = paymentMethod;
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 }).populate('user');

    // Calculate Stats
    const overallOrderAmount = orders.reduce((val, acc) => val + acc.totalAmount, 0);
    let salesAggregation = [];
    if (status && status !== "Delivered") {
        salesAggregation = [{ revenue: 0, count: 0 }]; 
    } else {
        const revenueFilter = { ...filter, status: "Delivered" };
        
        salesAggregation = await Order.aggregate([
            { $match: revenueFilter },
            { 
                $group: { 
                    _id: null, 
                    revenue: { $sum: "$totalAmount" }, 
                    count: { $sum: { $sum: '$items.quantity' } } 
                } 
            }
        ]);
    }

    const overallSalesCount = salesAggregation.length > 0 ? salesAggregation[0].count : 0;
    const totalRevenue = salesAggregation.length > 0 ? salesAggregation[0].revenue : 0;
    const overallDiscount = orders.reduce((val, acc) => val + (acc.coupenDiscount || 0), 0);

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
        paymentMethod
    };
};

export default getSalesData;