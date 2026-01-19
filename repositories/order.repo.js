import Order from "../models/orderModel.js";

export const findOrdersByUserId = (userId) => {
    return Order.find({ user: userId })
        .populate("items.product")
        .sort({ createdAt: -1 });
};

export const findOrderById = (orderId) => {
    return Order.findById(orderId).populate("items.product").populate("user");
};

export const createOrder = (orderData) => {
    const order = new Order(orderData);
    return order.save();
};

export const saveOrder = (order) => {
    return order.save();
};

export const aggregateOrders = (pipeline) => {
    return Order.aggregate(pipeline);
};

export const findAllOrders = () => {
    return Order.find().populate("user").sort({ createdAt: -1 });
};

export const countDeliveredOrders = () => {
    return Order.countDocuments({ status: "Delivered" });
};

export const sumTotalSales = () => {
    return Order.aggregate([
        { $match: { status: "Delivered" } },
        { $group: { _id: null, totalSales: { $sum: "$totalAmount" } } },
    ]);
};

export const findRecentOrders = (limit) => {
    return Order.find()
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
};

export const findOrdersWithPagination = (skip, limit) => {
    return Order.find()
        .populate("user")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

export const countAllOrders = () => {
    return Order.countDocuments();
};

export const findRecentPending = (userId) =>
    Order.findOne({
        user: userId,
        status: "Pending",
        createdAt: { $gte: new Date(Date.now() - 60000) },
    }).sort({ createdAt: -1 });

export const checkAddressInOrders = (addressId) => {
    return Order.exists({ "address": addressId });
};