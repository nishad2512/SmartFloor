import Product from "../../models/productModel.js";
import Category from "../../models/categoryModel.js";

export const products = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search;

    // Price filter
    const minPrice = req.query.minPrice;
    const maxPrice = req.query.maxPrice;
    const priceFilter = {};
    if (minPrice) priceFilter.$gte = parseFloat(minPrice);
    if (maxPrice) priceFilter.$lte = parseFloat(maxPrice);
    if (Object.keys(priceFilter).length === 0) {
        priceFilter.$exists = true; // No price filter applied
    }
    console.log("Price Filter:", priceFilter);

    const filter = search ? {name: {$regex: search, $options: "i"}, "variants.price": priceFilter, isActive: true} : { "variants.price": priceFilter, isActive: true };

    const limit = 6;
    const skip = (page - 1) * limit;

    const categories = await Category.find({isActive: true});
    const productCount = await Product.countDocuments(filter);

    const totalPages = Math.ceil(productCount / limit);

    const sortBy = req.query.sort;
    let sortOption = { createdAt: -1 };
    switch (sortBy) {
        case "price-low-high":
            sortOption = { "variants.price": 1 };
            break;
        case "price-high-low":
            sortOption = { "variants.price": -1 };
            break;
        case "a-z":
            sortOption = { name: 1 };
            break;
        case "z-a":
            sortOption = { name: -1 };
            break;
    }

    console.log("Sort Option:", sortOption);

    const products = await Product.find(filter).sort(sortOption).collation({ locale: "en", strength: 2 }).skip(skip).limit(limit);
    res.render("user/products/products", { products, page, search, categories, totalPages });
}

export const filterByCategory = async (req, res) => {
    const category = req.params.category;
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search;

    // Price filter
    const minPrice = req.query.minPrice;
    const maxPrice = req.query.maxPrice;
    const priceFilter = {};
    if (minPrice) priceFilter.$gte = parseFloat(minPrice);
    if (maxPrice) priceFilter.$lte = parseFloat(maxPrice);
    if (Object.keys(priceFilter).length === 0) {
        priceFilter.$exists = true;
    }
    console.log("Price Filter:", priceFilter);

    const limit = 6;
    const skip = (page - 1) * limit;

    const categories = await Category.find({isActive: true});
    const categoryData = await Category.findOne({name: { $regex: `^${category}$`, $options: "i" }});
    if (!categoryData) {
        req.flash('error', 'Category not found');
        return res.redirect('/products');
    }
    const filter = search ? { category: categoryData._id, name: { $regex: search, $options: "i" }, "variants.price": priceFilter, isActive: true } : { category: categoryData._id, "variants.price": priceFilter, isActive: true };
    const productCount = await Product.countDocuments(filter);
    const totalPages = Math.ceil(productCount / limit);
    const sortBy = req.query.sort;
    let sortOption = { createdAt: -1 };
    switch (sortBy) {
        case "price-low-high":
            sortOption = { price: 1 };
            break;
        case "price-high-low":
            sortOption = { price: -1 };
            break;
        case "a-z":
            sortOption = { name: 1 };
            break;
        case "z-a":
            sortOption = { name: -1 };
            break;
    }

    const products = await Product.find(filter).sort(sortOption).collation({ locale: "en", strength: 2 }).skip(skip).limit(limit);
    res.render("user/products/products", { products, page, search, categories, totalPages, category });
}

export const productDetails = async (req, res) => {
    const productId = req.params.id;
    try {
        const product = await Product.findById(productId).populate("category");
        if (!product) {
            req.flash('error', 'Product not found');
            return res.redirect('/products');
        }
        const relatedProducts = await Product.find({ category: product.category._id, _id: { $ne: product._id } }).limit(3);
        res.render("user/products/product-details", { product, relatedProducts });
    } catch (error) {
        console.error(error);
        req.flash('error', 'An error occurred while fetching the product details');
        res.redirect('/products');
    }
}