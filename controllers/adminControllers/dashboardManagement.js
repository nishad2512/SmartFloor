import Order from "../../models/orderModel.js";
import Product from "../../models/productModel.js";
import User from "../../models/userModel.js";
import getSalesData from "../../utils/salesData.js";

const dashboard = async (req, res) => {
    try {

        const type = req.query.type == 'yearly' ? '$year' : '$month';

        const [salesData, topCategories, topProducts, recentOrders, products, customers] = await Promise.all([
            Order.aggregate([
                { $match: { status: "Delivered" } },
                {
                    $group: {
                        _id: { [type]: "$createdAt" },
                        sales: { $sum: "$totalAmount" }
                    }
                },
                { $sort: { "_id": 1 } }
            ]),

            Order.aggregate([
                { $match: { status: "Delivered" } },
                { $unwind: "$items" },
                { $lookup: { from: "products", localField: "items.product", foreignField: "_id", as: "prod" } },
                { $unwind: "$prod" },
                { $lookup: { from: "categories", localField: "prod.category", foreignField: "_id", as: "cat" } },
                { $unwind: "$cat" },
                { $group: { _id: "$cat.name", totalSales: { $sum: "$items.subTotal" }, count: { $sum: "$items.quantity" } } },
                { $sort: { totalSales: -1 } },
                { $limit: 10 }
            ]),

            Order.aggregate([
                { $match: { status: "Delivered" } },
                { $unwind: "$items" },
                { $group: { _id: "$items.product", totalSold: { $sum: "$items.quantity" } } },
                { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "info" } },
                { $unwind: "$info" },
                { $sort: { totalSold: -1 } },
                { $limit: 10 },
                { $project: { name: "$info.name", totalSold: 1, _id: 0 } }
            ]),

            Order.find().populate('user', 'name email').sort({ createdAt: -1 }).limit(5).lean(),

            Product.find().lean(),

            User.countDocuments({
                isBlocked: false,
                createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
            })
        ]);

        const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        const formattedData = salesData.map(item => ({
            label: req.query.type === 'yearly' ? item._id : monthNames[item._id],
            sales: item.sales
        }));

        let inventoryStock = 0;
        const stockAlerts = products.filter(product => {
            const productStock = product.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
            inventoryStock += productStock;
            return productStock < 200;
        });

        const salesRecords = await getSalesData({ period: type === '$year' ? 'yearly' : 'monthly' });

        res.render('admin/dashboard', { formattedData, topCategories, topProducts, recentOrders, stockAlerts, salesRecords, inventoryStock, customers, type });
    } catch (error) {
        console.error(error);
        req.flash("error", "Failed to load dashboard data.");
        res.render('admin/dashboard', {
            formattedData: [],
            topCategories: [],
            topProducts: [],
            recentOrders: [],
            stockAlerts: [],
            salesRecords: {},
            inventoryStock: 0,
            customers: 0,
            type: req.query.type || 'monthly'
        });
    }
}

export default dashboard;