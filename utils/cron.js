import cron from "node-cron";
import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";

async function scheduleCron() {
    cron.schedule("* * * * *", async () => {
        try {
            const orders = await Order.find({
                createdAt: { $lte: new Date(Date.now() - 10 * 60 * 1000) },
                paymentStatus: "pending",
                paymentMethod: { $ne: "cod" },
                status: { $ne: "Cancelled" }
            });

            if (orders.length > 0) {
                console.log(`Cron: Found ${orders.length} unpaid orders to cancel.`);

                for (const order of orders) {
                    order.status = "Cancelled";
                    order.cancelReason = "Payment Timeout (Auto-Cancelled)";
                    for (const item of order.items) {
                        item.status = "Cancelled";
                        const product = await Product.findById(item.product);
                        if (product) {
                            const variant = product.variants.id(item.variant);
                            if (variant) {
                                variant.stock += item.quantity;
                                await product.save();
                            }
                        }
                    }
                    await order.save();
                    console.log(`Cron: Cancelled Order ${order.orderId}`);
                }
            }

        } catch (error) {
            console.error("Cron Error updating order statuses:", error);
        }
    });
};

export default scheduleCron;