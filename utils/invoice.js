import PDFDocument from "pdfkit";

function generateInvoice(order, res) {
    const doc = new PDFDocument({ margin: 50, size: "A4" });

    // Stream the PDF to the response
    doc.pipe(res);

    // --- Colors ---
    const primaryColor = "#1A1A1A"; // Black
    const secondaryColor = "#757575"; // Gray
    const accentColor = "#F5F5F5"; // Light Gray Background

    // --- Header Background ---
    doc.rect(0, 0, 612, 140).fill(primaryColor);

    // --- Header Content ---
    // Logo
    doc.image("public/images/favicon.png", 50, 40, { width: 50 });

    // Company Name (White)
    doc.fillColor("white")
        .fontSize(24)
        .font("Helvetica-Bold")
        .text("SmartFloor", 110, 48);

    doc.fontSize(10)
        .font("Helvetica")
        .text("Premium Flooring Solutions", 110, 75);

    // Invoice Label (Right side)
    doc.fontSize(30)
        .font("Helvetica-Bold")
        .text("INVOICE", 400, 45, { align: "right", width: 160 });

    // Order Meta (Right side, below Invoice label)
    doc.fontSize(10)
        .font("Helvetica")
        .text(`Invoice #: INV-${order.orderId.split("-")[2]}`, 400, 85, {
            align: "right",
            width: 160,
        })
        .text(
            `Date: ${new Date(order.createdAt).toLocaleDateString("en-IN")}`,
            400,
            100,
            { align: "right", width: 160 }
        );

    // --- Billing Details ---
    const billTop = 170;

    // Bill From
    doc.fillColor(primaryColor)
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("Bill From:", 50, billTop);

    doc.fillColor(secondaryColor)
        .fontSize(10)
        .font("Helvetica")
        .text("SmartFloor Inc.", 50, billTop + 20)
        .text("123 Flooring St.", 50, billTop + 35)
        .text("Kochi, Kerala, India 682001", 50, billTop + 50)
        .text("support@smartfloor.com", 50, billTop + 65);

    // Bill To
    doc.fillColor(primaryColor)
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("Bill To:", 350, billTop);

    doc.fillColor(secondaryColor)
        .fontSize(10)
        .font("Helvetica")
        .text(order.user.name, 350, billTop + 20);

    if (order.address) {
        doc.text(`${order.address.address1 || ""}`, 350, billTop + 35);
        doc.text(
            `${order.address.city || ""}, ${order.address.state || ""} ${order.address.pincode || ""
            }`,
            350,
            billTop + 50
        );
        doc.text(`Phone: ${order.address.mobile || ""}`, 350, billTop + 65);
    } else {
        doc.text("Address not available", 350, billTop + 35);
    }

    // --- Items Table ---
    const tableTop = 300;
    const itemX = 50;
    const qtyX = 350;
    const priceX = 420;
    const totalX = 500;

    // Header Row Background
    doc.rect(50, tableTop, 500, 30).fill(accentColor);

    // Header Text
    doc.fillColor(primaryColor)
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Item Description", itemX + 10, tableTop + 10)
        .text("Qty", qtyX, tableTop + 10)
        .text("Price", priceX, tableTop + 10)
        .text("Total", totalX, tableTop + 10);

    // Items
    let y = tableTop + 40;

    order.items.forEach((item, i) => {

        let variantLabel = "";

        if (item.product && Array.isArray(item.product.variants)) {
            const foundVariant = item.product.variants.find(v => v._id && item.variant && v._id.toString() === item.variant.toString());
            if (foundVariant && foundVariant.size) {
                variantLabel = `Size: ${foundVariant.size}`;
            }
        }

        // Item Name
        doc.font("Helvetica-Bold")
            .fontSize(10)
            .text(item.product ? item.product.name : "Unknown Product", itemX + 10, y, { width: 280 });

        if (variantLabel) {
            doc.font("Helvetica")
                .fontSize(9)
                .fillColor(secondaryColor)
                .text(variantLabel, itemX + 10, y + 12, { width: 280 });
        }

        doc.fillColor(primaryColor).fontSize(10); // Reset

        doc.text(item.quantity.toString(), qtyX, y);

        // Use subTotal / quantity for unit price approximation
        const unitPrice = item.quantity > 0 ? (item.subTotal / item.quantity) : 0;
        doc.text(
            `Rs. ${unitPrice.toLocaleString("en-IN")}`,
            priceX,
            y
        );
        doc.text(
            `Rs. ${item.subTotal.toLocaleString("en-IN")}`,
            totalX,
            y
        );

        // Line Separator
        doc.moveTo(50, y + 35)
            .lineTo(550, y + 35)
            .lineWidth(0.5)
            .strokeColor("#E0E0E0")
            .stroke();

        y += 45;
    });

    // --- Summary Section ---
    y += 20;
    const summaryX = 350;

    // Subtotal
    doc.font("Helvetica")
        .fillColor(secondaryColor)
        .text("Subtotal:", summaryX, y)
        .fillColor(primaryColor)
        .text(
            `${(order.subTotal || order.totalAmount).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            })}`,
            totalX,
            y,
            { align: "right" }
        );

    y += 20;

    // Shipping
    doc.fillColor(secondaryColor)
        .text("Shipping:", summaryX, y)
        .fillColor(primaryColor)
        .text(order.shipping === 0 ? "Free" : `${order.shipping.toFixed(2)}`, totalX, y, {
            align: "right",
        });

    y += 20;

    // Tax
    if (order.tax) {
        doc.fillColor(secondaryColor)
            .text("GST (18%):", summaryX, y)
            .fillColor(primaryColor)
            .text(
                `${order.tax.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                })}`,
                totalX,
                y,
                {
                    align: "right",
                }
            );
        y += 20;
    }

    // Refund
    if (order.refund > 0) {
        doc.fillColor(secondaryColor)
            .text("Refunded Amount:", summaryX, y)
            .fillColor("#DC2626") // Red color
            .text(
                `- ${order.refund.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                })}`,
                totalX,
                y,
                {
                    align: "right",
                }
            );
        y += 20;
    }

    // Grand Total Divider
    doc.moveTo(summaryX, y + 10)
        .lineTo(550, y + 10)
        .lineWidth(1)
        .strokeColor(primaryColor)
        .stroke();

    y += 25;

    // Grand Total
    doc.fontSize(14)
        .font("Helvetica-Bold")
        .text("Grand Total:", summaryX, y)
        .text(
            `Rs. ${order.totalAmount.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            })}`,
            400,
            y,
            {
                width: 150,
                align: "right",
            }
        );

    // --- Footer Message ---
    const pageBottom = 750;
    doc.fontSize(10)
        .font("Helvetica")
        .fillColor(secondaryColor)
        .text("Thank you for your business!", 50, pageBottom, {
            align: "center",
            width: 500,
        });

    doc.end();
}

export default generateInvoice;
