import Cart from "../../models/cartModel.js";
import Product from "../../models/productModel.js";

export const cart = async (req, res) => {
    try {
        const userId = req.userId;
        const cartItems = await Cart.find({ user: userId }).populate("product");
        const formattedCart = cartItems
            .map((item) => {
                const variant = item.product.variants.id(item.variant);

                if (!variant) {
                    return null; // or handle error
                }

                return {
                    cartItemId: item._id,
                    productId: item.product._id,
                    name: item.product.name,
                    image: item.product.productImages[0],
                    size: variant.size,
                    price: variant.price,
                    quantity: item.quantity,
                    total: item.total,
                };
            })
            .filter(Boolean);
        const totalAmount = formattedCart.reduce((sum, item) => sum + item.total, 0);

        res.render("user/cart/cart", { formattedCart, totalAmount: totalAmount.toLocaleString('en-IN') });
    } catch (error) {
        console.error(error);
        req.flash("error", "Error loading cart");
        res.redirect("/");
    }
};

export const addToCart = async (req, res) => {
    try {
        const userId = req.userId;
        const { productId, variantId, quantity } = req.body;
        let cartItem = await Cart.findOne({
            user: userId,
            product: productId,
            variant: variantId,
        });
        const product = await Product.findOne({ _id: productId, isActive: true });

        if (!product) {
            req.flash("error", "Product not found");
            return res.json({ success: false, message: "Product not found" });
        }

        const variant = product.variants.id(variantId);

        if (!variant) {
            req.flash("error", "Invalid product variant");
            return res.json({ success: false, message: "Invalid product variant" });
        }

        if (cartItem && (cartItem.quantity + quantity) > variant.stock && cartItem.quantity + quantity <= 500) {
            cartItem.quantity = variant.stock;
            cartItem.total = variant.stock * variant.price;
            await cartItem.save();
            req.flash("success", `Only ${variant.stock} items available in stock, ${variant.stock} items added.`);
            return res.json({ success: true });
        }

        if (!cartItem && parseInt(quantity) > variant.stock && quantity <= 500) {
            cartItem = new Cart({
                user: userId,
                product: productId,
                variant: variantId,
                quantity: variant.stock,
                total: variant.stock * variant.price
            });
            await cartItem.save();
            req.flash("success", `Only ${variant.stock} items available in stock, ${variant.stock} items added.`);
            return res.json({ success: true });
        }

        if (cartItem && cartItem.quantity + quantity <= 500) {

            cartItem.quantity += quantity;
            cartItem.total = cartItem.quantity * variant.price;
            await cartItem.save();

            req.flash("success", `Product quantity increased by ${quantity} in cart`);
            res.json({ success: true });

        } else if (!cartItem && quantity <= 500) {
            cartItem = new Cart({
                user: userId,
                product: productId,
                variant: variantId,
                quantity: quantity,
                total: quantity * variant.price
            });
            await cartItem.save();

            req.flash("success", "Product added to cart");
            res.json({ success: true });
        }

        req.flash("error", "You can only add a maximum of 500 items at once");
        res.json({ success: false, message: "Maximum limit exceeded" });
    } catch (error) {
        console.error(error);
        req.flash("error", "Error adding to cart");
        res.json({ success: false });
    }
};

export const updateCartQuantity = async (req, res) => {
    try {
        const { cartItemId } = req.params;
        const { quantity } = req.body;

        const cartItem = await Cart.findById(cartItemId).populate("product");

        if (quantity < 1) {
            return res.status(400).json({ success: false, message: "Quantity must be at least 1" });
        }
        
        if (!cartItem) {
            return res.status(404).json({ success: false, message: "Cart item not found" });
        }

        // Find variant
        const variant = cartItem.product.variants.id(cartItem.variant);

        if (!variant) {
            return res.status(400).json({ success: false, message: "Variant not found" });
        }

        // Stock check
        if (quantity > 500) {
            return res.status(400).json({
                message: "You can only add a maximum of 500 items at once",
                success: false,
                quantity: cartItem.quantity
            });
        }

        if (quantity > variant.stock) {
            return res.status(400).json({
                message: "Product stock limit reached",
                success: false,
                quantity: cartItem.quantity
            });
        }

        cartItem.quantity = quantity;
        cartItem.total = variant.price * quantity;
        await cartItem.save();

        const cartItems = await Cart.find({ user: req.userId }).populate("product");
        const totalAmount = cartItems.reduce((sum, item) => {
            return sum + item.total;
        }, 0);

        res.json({
            success: true,
            message: "Quantity updated",
            quantity: cartItem.quantity,
            itemTotal: variant.price * cartItem.quantity,
            cartTotal: totalAmount.toLocaleString('en-IN')
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

export const removeFromCart = async (req, res) => {
    try {
        const { cartItemId } = req.params;

        const cartItem = await Cart.findById(cartItemId);

        if (!cartItem) {
            res.json({success: false, message: "Item not found"})
        }

        await Cart.deleteOne({_id: cartItemId});
        req.flash("success", "Item deleted successfully");
        res.json({success: true});

    } catch (error) {
        console.error(error);
        req.flash("error", "Server issue");
    }
}