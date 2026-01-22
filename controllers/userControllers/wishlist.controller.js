import Product from "../../models/productModel.js";
import Wishlist from "../../models/wishlistModel.js";

const wishlist = async (req, res) => {
    try {

        const userId = req.userId;
        const wishlistItems = await Wishlist.find({ user: userId }).populate('product');

        const variants = wishlistItems.map(item => {
            return item.product.variants.id(item.variant)
        });

        res.render('user/wishlist/wishlist', { wishlistItems, variants });

    } catch (error) {
        console.error("Error fetching wishlist:", error);
        req.flash("error", "Failed to load wishlist.");
        res.redirect("/");
    }
};

const addToWishlist = async (req, res) => {
    try {
        const userId = req.userId;
        const { productId, variantId } = req.body;

        const existingItem = await Wishlist.findOne({ user: userId, product: productId, variant: variantId });

        if (existingItem) {
            return res.status(200).json({ success: false, message: "Product already in wishlist" });
        }

        const product = await Product.findOne({ _id: productId, isActive: true });

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not available" });
        }

        const newWishlist = new Wishlist({
            user: userId,
            product: productId,
            variant: variantId
        });

        await newWishlist.save();
        res.status(200).json({ success: true, message: "Added to wishlist" });

    } catch (error) {
        console.error("Error adding to wishlist:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const removeFromWishlist = async (req, res) => {
    try {
        const userId = req.userId;
        const { itemId } = req.body;

        await Wishlist.findByIdAndDelete(itemId);

        res.status(200).json({ success: true, message: "Removed from wishlist" });

    } catch (error) {
        console.error("Error removing from wishlist:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export { wishlist, addToWishlist, removeFromWishlist };

