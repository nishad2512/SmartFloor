import Order from "../../models/orderModel.js";
import Return from "../../models/returnModel.js";
import Product from "../../models/productModel.js";
import refund from "../../utils/refund.js";

export const orders = async (req, res) => {
    try {
        const { search, status, sort, page = 1 } = req.query;
        const limit = 5;
        const skip = (page - 1) * limit;

        let query = {};

        if (search) {
            query.$or = [
                { orderId: { $regex: search, $options: 'im' } }
            ];
        }

        if (status) {
            query.status = status;
        }

        let sortQuery = { createdAt: -1 };
        if (sort === 'oldest') {
            sortQuery = { createdAt: 1 };
        } else if (sort === 'amount_desc') {
            sortQuery = { totalAmount: -1 };
        } else if (sort === 'amount_asc') {
            sortQuery = { totalAmount: 1 };
        }

        const totalOrders = await Order.countDocuments(query);
        const orders = await Order.find(query)
            .sort(sortQuery)
            .populate('user')
            .skip(skip)
            .limit(limit);

        const totalPages = Math.ceil(totalOrders / limit);

        res.render('admin/orderManagement/orders', {
            orders,
            currentPage: parseInt(page),
            totalPages,
            search,
            status,
            sort,
            totalOrders,
            limit,
            skip
        });

    } catch (error) {
        console.error(error);
        req.flash("error", "Failed to fetch orders.");
        res.redirect('/admin/dashboard');
    }
}

export const orderDetails = async (req, res) => {
    try {

        const orderId = req.params.orderId
        const order = await Order.findById(orderId).populate('items.product').populate('user').populate('address');
        const variants = order.items.map(item => {
            let variant = item.product.variants.id(item.variant);
            return {
                size: variant.size,
                price: variant.price,
                stock: variant.stock
            }
        })

        res.render('admin/orderManagement/order-details', { order, variants });

    } catch (error) {
        console.error(error);
        req.flash("error", "Failed to load order details.");
        res.redirect('/admin/orders');
    }
}

export const updateStatus = async (req, res) => {
    try {

        const orderId = req.params.orderId;
        const { status } = req.body;
        const order = await Order.findById(orderId);
        const statuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Return Request', 'Returned']

        if (statuses.indexOf(order.status) > statuses.indexOf(status)) {
            req.flash("error", "You can't change status in reverse.");
            return res.json({ success: false });
        }
        order.items.forEach(item => {
            if (statuses.indexOf(item.status) < statuses.indexOf(status)) {
                item.status = status
            }
        });

        order.status = status;

        if (order.paymentMethod == 'cod' && status == 'Delivered') {
            order.paymentStatus = 'paid';
        }

        await order.save();

        req.flash("success", "Status changed successfully");
        res.json({ success: true });

    } catch (error) {
        console.error(error);
        req.flash("error", "Failed to update status.");
        res.status(500).json({ success: false });
    }
}

export const returns = async (req, res) => {
    try {

        const totalCount = await Return.countDocuments();
        const page = req.query.page || 1;
        const limit = 5;
        const skip = (page - 1) * limit;
        const totalPages = Math.ceil(totalCount / limit);

        const returns = await Return.find().skip(skip).limit(limit).sort({ createdAt: -1 }).populate('userId').populate({
            path: 'orderId',
            populate: {
                path: 'items.product'
            }
        });

        res.render('admin/orderManagement/returns', { returns, page, totalCount, totalPages, skip, limit });

    } catch (error) {
        console.error(error);
        req.flash("error", "Failed to load returns.");
        res.redirect('/admin/dashboard');
    }
}


export const returnDetails = async (req, res) => {
    try {
        const returnId = req.params.returnId;
        const returnRequest = await Return.findById(returnId)
            .populate('userId')
            .populate({
                path: 'orderId',
                populate: {
                    path: 'items.product'
                }
            });

        if (!returnRequest) {
            req.flash("error", "Return request not found.");
            return res.redirect('/admin/returns');
        }

        const orderItem = returnRequest.orderId.items.find(item => item._id.toString() === returnRequest.itemId.toString());

        let variant = null;
        if (orderItem && orderItem.product && orderItem.product.variants) {
            variant = orderItem.product.variants.id(orderItem.variant);
        }

        res.render('admin/orderManagement/return-details', {
            returnRequest,
            orderItem,
            variant
        });

    } catch (error) {
        console.error(error);
        req.flash("error", "Failed to load return details.");
        res.redirect('/admin/returns');
    }
}

export const updateReturnStatus = async (req, res) => {
    try {
        const returnId = req.params.returnId;
        const { status } = req.body;
        const returnRequest = await Return.findById(returnId);

        if (!returnRequest) {
            return res.status(404).json({ success: false, message: "Return request not found" });
        }

        const order = await Order.findById(returnRequest.orderId)
        const item = order.items.id(returnRequest.itemId);

        if (item.status == "Return Request" && status == "Approved") {
            await refund(order, item);
        }

        returnRequest.status = status;
        await returnRequest.save();

        if (status === 'Refunded') {
            if (item) {
                item.status = 'Returned';
                let product = await Product.findById(item.product);
                let variant = product.variants.id(item.variant);
                variant.stock = variant.stock + item.quantity;
                await product.save();
            }
            if (order.items.every(i => i.status == 'Returned' || i.status == 'Cancelled')) {
                order.status = 'Returned';
            }
            await order.save();
        }
        req.flash('success', 'Status changed successfully')
        res.json({ success: true });

    } catch (error) {
        console.error(error);
        req.flash("error", "Failed to update return status.");
        res.status(500).json({ success: false });
    }
}