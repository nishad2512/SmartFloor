// utils/productQuery.js
import Product from "../models/productModel.js";
import Category from "../models/categoryModel.js";
import applyOffer from "./offerFetch.js";

export const buildProductQuery = async ({ req, categoryName = null }) => {
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search;
    const limit = 6;
    const skip = (page - 1) * limit;

    // Price filter
    const minPrice = req.query.minPrice;
    const maxPrice = req.query.maxPrice;

    const priceFilter = {};
    if (minPrice) priceFilter.$gte = parseFloat(minPrice);
    if (maxPrice) priceFilter.$lte = parseFloat(maxPrice);
    if (!Object.keys(priceFilter).length) priceFilter.$exists = true;

    const categories = await Category.find({ isActive: true });

    const productCounts = await Promise.all(
        categories.map(cat =>
            Product.countDocuments({ category: cat._id, isActive: true })
        )
    );

    let filter = {
        "variants.price": priceFilter,
        isActive: true
    };

    if (search) {
        filter.name = { $regex: search, $options: "i" };
    }

    let categoryData = null;
    if (categoryName) {
        categoryData = await Category.findOne({
            name: { $regex: `^${categoryName}$`, $options: "i" }
        });
        if (!categoryData) throw new Error("CATEGORY_NOT_FOUND");
        filter.category = categoryData._id;
    }

    // Sorting
    let sortOption = { createdAt: -1 };
    switch (req.query.sort) {
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

    const productCount = await Product.countDocuments(filter);
    const totalPages = Math.ceil(productCount / limit);

    let products = await Product.find(filter)
        .sort(sortOption)
        .collation({ locale: "en", strength: 2 })
        .skip(skip)
        .limit(limit)
        .lean();

    products = await Promise.all(products.map(applyOffer));

    return {
        products,
        page,
        search,
        categories,
        totalPages,
        productCounts,
        category: categoryName,
        query: req.query
    };
};
