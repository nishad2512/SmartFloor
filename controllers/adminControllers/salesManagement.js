import Order from "../../models/orderModel.js";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";

const getSalesData = async (query) => {
    const { period, startDate, endDate } = query;

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

    const orders = await Order.find(filter).populate('user');

    // Calculate Stats
    const overallOrderAmount = orders.reduce((val, acc) => val + acc.totalAmount, 0);
    const salesAggregation = await Order.aggregate([
        { $match: { ...filter, status: "Delivered" } },
        { $group: { _id: null, revenue: { $sum: "$totalAmount" }, count: { $sum: { $sum: '$items.quantity' } } } }
    ]);

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
        orders
    };
};

export const sales = async (req, res) => {
    try {
        const data = await getSalesData(req.query);
        res.render('admin/salesManagement/sales', data);
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
}

export const downloadSalesPDF = async (req, res) => {
    try {
        const {
            orders,
            overallOrderAmount,
            totalRevenue,
            overallSalesCount,
            overallDiscount,
            period,
            startDate,
            endDate
        } = await getSalesData(req.query);

        const doc = new PDFDocument({ margin: 30, size: "A4" });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            "attachment; filename=sales_report.pdf"
        );

        doc.pipe(res);

        /* =========================
           HEADER
        ========================= */
        doc
            .fontSize(22)
            .font("Helvetica-Bold")
            .text("Sales Report", { align: "center" });

        doc
            .moveDown(0.5)
            .fontSize(10)
            .font("Helvetica")
            .fillColor("gray")
            .text(
                `Generated on: ${new Date().toLocaleString()}`,
                { align: "center" }
            );

        doc.moveDown(2);
        doc.fillColor("black");

        /* =========================
           SUMMARY CARDS
        ========================= */
        const cardY = doc.y;
        const cardWidth = 120;
        const cardHeight = 70;
        const gap = 15;

        const cards = [
            { title: "Orders", value: orders.length },
            { title: "Sales Count", value: overallSalesCount },
            { title: "Revenue", value: `₹ ${totalRevenue.toFixed(2)}` },
            { title: "Discount", value: `₹ ${overallDiscount || 0}` }
        ];

        cards.forEach((card, i) => {
            const x = 30 + i * (cardWidth + gap);

            doc
                .roundedRect(x, cardY, cardWidth, cardHeight, 8)
                .fill("#F3F4F6");

            doc
                .fillColor("#374151")
                .fontSize(10)
                .font("Helvetica-Bold")
                .text(card.title, x + 10, cardY + 10);

            doc
                .fontSize(16)
                .fillColor("#111827")
                .text(card.value, x + 10, cardY + 35);
        });

        doc.moveDown(6);
        doc.fillColor("black");

        /* =========================
           FILTER INFO
        ========================= */
        // doc
        //     .fontSize(11)
        //     .font("Helvetica-Bold")
        //     .text("Report Filters");

        // doc
        //     .moveDown(0.5)
        //     .font("Helvetica")
        //     .fontSize(10)
        //     .text(`Period: ${period || "All"}`)
        //     .text(`From: ${startDate || "-"}`)
        //     .text(`To: ${endDate || "-"}`);

        // doc.moveDown(1.5);

        /* =========================
           TABLE HEADER
        ========================= */
        let y = doc.y;

        const drawTableHeader = () => {
            doc
                .rect(30, y, 550, 25)
                .fill("#111827");

            doc
                .fillColor("white")
                .font("Helvetica-Bold")
                .fontSize(10);

            doc.text("Date", 35, y + 7);
            doc.text("Order ID", 90, y + 7);
            doc.text("Customer", 165, y + 7);
            doc.text("Payment", 265, y + 7);
            doc.text("Status", 345, y + 7);
            doc.text("Coupon", 415, y + 7);
            doc.text("Amount", 495, y + 7);

            y += 25;
            doc.fillColor("black").font("Helvetica");
        };

        drawTableHeader();

        /* =========================
           TABLE ROWS
        ========================= */
        orders.forEach((order, index) => {
            if (y > 760) {
                doc.addPage();
                y = 50;
                drawTableHeader();
            }

            // Row background (zebra style)
            if (index % 2 === 0) {
                doc
                    .rect(30, y, 550, 22)
                    .fill("#F9FAFB");
                doc.fillColor("black");
            }

            doc.fontSize(9);

            doc.text(
                new Date(order.createdAt).toLocaleDateString(),
                35,
                y + 6
            );
            doc.text(order.orderId.split("-")[2], 90, y + 6);
            doc.text(order.user?.name || "Guest", 165, y + 6);
            doc.text(order.paymentMethod, 265, y + 6);
            doc.text(order.status, 345, y + 6);
            doc.text(order.coupenCode || "-", 415, y + 6);
            doc.text(`₹ ${order.totalAmount}`, 495, y + 6);

            y += 22;
        });

        /* =========================
           FOOTER
        ========================= */
        doc
            .fontSize(9)
            .fillColor("gray")
            .text(
                "This is a system generated report.",
                30,
                800,
                { align: "center", width: 550 }
            );

        doc.end();
    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).send("Error generating PDF");
    }
};

export const downloadSalesExcel = async (req, res) => {
    try {
        const { orders } = await getSalesData(req.query);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        worksheet.columns = [
            { header: "Date", key: "date", width: 15 },
            { header: "Order ID", key: "orderId", width: 20 },
            { header: "Customer", key: "customer", width: 20 },
            { header: "Payment", key: "payment", width: 15 },
            { header: "Status", key: "status", width: 15 },
            { header: "Coupon", key: "coupon", width: 15 },
            { header: "Discount", key: "discount", width: 15 },
            { header: "Total Amount", key: "amount", width: 18 }
        ];

        orders.forEach(order => {
            worksheet.addRow({
                date: new Date(order.createdAt).toLocaleDateString(),
                orderId: order.orderId.split("-")[2],
                customer: order.user?.name || "Guest",
                payment: order.paymentMethod,
                status: order.status,
                coupon: order.coupenCode || "-",
                discount: order.coupenDiscount || 0,
                amount: order.totalAmount
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=sales_report.xlsx');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("Error generating Excel:", error);
        res.status(500).send("Error generating Excel");
    }
};