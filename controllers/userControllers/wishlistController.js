import Wishlist from "../../models/wishlistModel.js";

export const wishlist = async (req, res) => {
    try {

        const userId = req.userId;
        const wishlistItems = await Wishlist.find({ user: userId }).populate('product');

        const variants = wishlistItems.map(item => {
            return item.product.variants.id(item.variant)
        });

        res.render('user/wishlist/wishlist', {wishlistItems, variants});
        
    } catch (error) {
        console.error("Error fetching wishlist:", error);
        res.status(500).send("Internal Server Error");
    }
};

