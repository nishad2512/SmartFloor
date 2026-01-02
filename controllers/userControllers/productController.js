import Product from "../../models/productModel.js";
import Category from "../../models/categoryModel.js";
import applyOffer from "../../utils/offerFetch.js"
import Wishlist from "../../models/wishlistModel.js";
import { buildProductQuery } from "../../utils/productQuery.js";

export const products = async (req, res) => {
    try {

        const data = await buildProductQuery({req});

        res.render("user/products/products", data);
    } catch (error) {
        console.error(error);
        req.flash('error', 'Error loading products');
        res.redirect('/');
    }
}

export const filterByCategory = async (req, res) => {
    try {
        
        const data = await buildProductQuery({ req, categoryName: req.params.category })

        res.render("user/products/products", data);
    } catch (error) {
        console.error(error);
        req.flash('error', 'Error filtering products');
        res.redirect('/products');
    }
}

export const productDetails = async (req, res) => {
    const productId = req.params.id;
    try {
        const product = await Product.findById(productId).populate("category").lean();

        if (!product || !product.isActive) {
            req.flash('error', 'Product not found');
            return res.redirect('/products');
        }
        const outOfStockVariants = [];
        product.variants.forEach((variant, index) => {
            if (variant.stock === 0) {
                outOfStockVariants.push(index);
            }
        });

        let offerApplied = await applyOffer(product);

        let wishlistVariantIds = [];
        if (res.locals.user) {
            const wishlistItems = await Wishlist.find({ user: res.locals.user._id, product: productId });
            wishlistVariantIds = wishlistItems.map(item => item.variant.toString());
        }

        const relatedProducts = await Product.find({ category: product.category._id, _id: { $ne: product._id } }).limit(3);
        res.render("user/products/product-details", { product: offerApplied, relatedProducts, outOfStockVariants, wishlistVariantIds });
    } catch (error) {
        console.error(error);
        req.flash('error', 'An error occurred while fetching the product details');
        res.redirect('/products');
    }
}