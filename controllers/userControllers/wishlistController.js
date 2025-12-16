export const wishlist = async (req, res) => {
    try {

        res.render('user/wishlist/wishlist');
        
    } catch (error) {
        console.error("Error fetching wishlist:", error);
        res.status(500).send("Internal Server Error");
    }
};


// const userId = req.userId;
// const wishlistItems = await Wishlist.find({ user: userId }).populate('product').populate('variant');