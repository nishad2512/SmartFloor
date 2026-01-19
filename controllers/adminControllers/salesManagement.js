import getSalesData from "../../utils/salesData.js";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";

export const sales = async (req, res) => {
    try {
        const data = await getSalesData(req.query);
        res.render('admin/salesManagement/sales', data);
    } catch (error) {
        console.error(error);
        req.flash("error", "Failed to load sales report.");
        res.redirect('/admin/dashboard');
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
            refunds
        } = await getSalesData(req.query);

        const doc = new PDFDocument({ margin: 30, size: "A4" });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            "attachment; filename=sales_report.pdf"
        );

        doc.pipe(res);

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

        let cardY = doc.y;
        const cardWidth = 120;
        const cardHeight = 70;
        const gap = 15;

        const cards = [
            { title: "Orders", value: orders.length },
            { title: "Sales Count", value: overallSalesCount },
            { title: "Revenue", value: `₹ ${totalRevenue.toFixed(2)}` },
            { title: "Discount", value: `₹ ${overallDiscount.toFixed(2) || 0}` },
            { title: "Refunds", value: `₹ ${refunds.toFixed(2) || 0}` },
        ];

        cards.forEach((card, i) => {
            let x = 30 + i * (cardWidth + gap);

            if (i > 3 ) {
                x = 30 + (i - 4) * (cardWidth + gap);
                cardY += cardHeight + gap;
            }

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

        orders.forEach((order, index) => {
            if (y > 760) {
                doc.addPage();
                y = 50;
                drawTableHeader();
            }

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
            doc.text(`₹ ${order.totalAmount.toFixed(2)}`, 495, y + 6);

            y += 22;
        });

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
        res.status(500).send("Unable to generate PDF report. Please try again.");
    }
};

export const downloadSalesExcel = async (req, res) => {
    try {
        const { orders } = await getSalesData(req.query);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        worksheet.title = 'Sales Report - SmartFloor';

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
                amount: order.totalAmount.toFixed(2)
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=sales_report.xlsx');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("Error generating Excel:", error);
        res.status(500).send("Unable to generate Excel report. Please try again.");
    }
};