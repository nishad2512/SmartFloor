import * as cartService from "../../services/userServices/cart.service.js";

export const cart = async (req, res) => {
    try {
        const { formatted, total } = await cartService.getCart(req.userId);
        res.render("user/cart/cart", {
            formattedCart: formatted,
            totalAmount: total.toLocaleString("en-IN"),
        });
    } catch (error) {
        console.error(error);
        req.flash("error", "An error occurred while fetching the cart. Please try again.");
        res.redirect("/");
    }
};

export const addToCart = async (req, res) => {
    try {
        const {
            finalQty,
            addedQty,
            requestedQty,
            stock,
            hardLimit,
            currentQty,
        } = await cartService.addToCart(
            req.userId,
            req.body.productId,
            req.body.variantId,
            Number(req.body.quantity)
        );

        if (addedQty < requestedQty) {
            if (addedQty === 0) {
                if (currentQty >= hardLimit) {
                    req.flash(
                        "warning",
                        `Maximum limit of ${hardLimit} items reached for this product.`
                    );
                    return res.json({ success: true });
                }
                if (stock === 0) {
                    req.flash("warning", "Product is out of stock.");
                    return res.json({ success: true });
                }
                req.flash("warning", `Only ${stock} items available in stock.`);
                return res.json({ success: true });
            }
            req.flash(
                "warning",
                `Only ${addedQty} items added to cart due to stock/limit constraints.`
            );
            return res.json({ success: true });
        }

        if (currentQty - addedQty > 0) {
            req.flash(
                "success",
                `${addedQty} items added to cart. You now have ${finalQty} items of this product in your cart.`
            );
            return res.json({ success: true });
        }

        req.flash("success", "Product added to cart successfully.");
        res.json({ success: true });
    } catch (error) {
        let message = "Failed to add to cart";
        let code = "UNKNOWN_ERROR";
        let type = "error";

        if (
            error.message === "PRODUCT_NOT_FOUND" ||
            error.message === "inactive"
        ) {
            message = "Product is unavailable or blocked by admin.";
            code = "PRODUCT_BLOCKED";
        }
        if (error.message === "INVALID_VARIANT") {
            message = "Invalid product variant";
            code = "INVALID_VARIANT";
        }
        if (error.message === "LIMIT") {
            message = "Maximum quantity limit reached for this product";
            code = "LIMIT_REACHED";
            type = "warning";
        }

        res.json({ success: false, message, code, type });
    }
};

export const updateCartQuantity = async (req, res) => {
    try {
        const { item, total } = await cartService.updateQuantity(
            req.userId,
            req.params.cartItemId,
            req.body.quantity
        );
        res.json({
            success: true,
            message: "Cart updated successfully",
            quantity: item.quantity,
            itemTotal: item.total,
            cartTotal: total.toLocaleString("en-IN"),
        });
    } catch (error) {
        let message = "Failed to update cart";
        let type = "error";
        if (error.message === "NOT_FOUND") message = "Item not found in cart";
        if (error.message === "INVALID_VARIANT") message = "Invalid variant";
        if (error.code === "LIMIT") {
            message = "Stock limit reached for this product";
            type = "warning";
        }
        // console.error(error);
        res.json({
            success: false,
            message,
            type,
            quantity: error.quantity,
            itemTotal: error.itemTotal,
        });
    }
};

export const removeFromCart = async (req, res) => {
    try {
        await cartService.removeFromCart(req.params.cartItemId);
        req.flash("success", "Item removed from cart successfully.");
        res.json({ success: true });
    } catch (error) {
        req.flash("error", "Failed to remove item from cart.");
        res.json({ success: false });
    }
};
