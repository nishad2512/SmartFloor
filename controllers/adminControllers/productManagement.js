import Product from "../../models/productModel.js";
import Category from "../../models/categoryModel.js";
import productSchema from "../../validators/productSchema.js";
import { imageToGLB } from "../../utils/generateArModel.js";

export const products = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const search = req.query.search;
        const filter = search
            ? { name: { $regex: search, $options: "i" } }
            : {};
        const limit = 5;
        const skip = (page - 1) * limit;
        const totalProducts = await Product.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limit);

        const products = await Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("category");
        res.render("admin/productManagement/products", { products, page, search, totalPages });
    } catch (error) {
        console.error(error);
        req.flash("error", "Failed to fetch products. Please try again.");
        res.redirect("/admin/dashboard");
    }
};

export const createProductPage = async (req, res) => {
    try {
        const categories = await Category.find({ isActive: true });
        res.render("admin/productManagement/createProduct", { categories });
    } catch (error) {
        console.error(error);
        req.flash("error", "Failed to load product creation page.");
        res.redirect("/admin/products");
    }
};

export const createProduct = async (req, res) => {
    try {
        const { name, description, category, stock, price, size, specifications, highlights } = req.body;

        if (!req.files || req.files.length < 3) {
            throw new Error("At least 3 product images are required.");
        }
        const images = req.files.map((file) => file.path);

        let arModelData = null;

        try {
            const glbUrl = await imageToGLB(images[0]);
            arModelData = glbUrl;
        } catch (err) {
            console.error("AR generation failed:", err.message);
        }

        const sizes = size ? (Array.isArray(size) ? size : [size]) : [];
        const prices = price ? (Array.isArray(price) ? price : [price]) : [];
        const stocks = stock ? (Array.isArray(stock) ? stock : [stock]) : [];

        const limitIterator = Math.min(sizes.length, prices.length, stocks.length);
        let normalizedVariants = [];

        for (let i = 0; i < limitIterator; i++) {
            const vSize = sizes[i]?.trim();
            const vPrice = Number(prices[i]);
            const vStock = Number(stocks[i]);

            if (vSize && !isNaN(vPrice) && !isNaN(vStock)) {
                normalizedVariants.push({
                    size: vSize,
                    price: vPrice,
                    stock: vStock,
                });
            }
        }

        const productData = {
            name,
            description,
            category,
            specifications,
            highlights,
            variants: normalizedVariants
        };

        const { error, value } = productSchema.validate(productData, { abortEarly: false });

        if (error) {
            const errorMessages = error.details.map(detail => detail.message).join(" ");
            throw new Error(errorMessages);
        }

        const categoryCheck = await Category.findById(value.category);
        if (!categoryCheck) {
            throw new Error("Invalid Category selected.");
        }

        const newProduct = new Product({
            name: value.name,
            description: value.description,
            specifications: value.specifications,
            highlights: value.highlights,
            category: value.category,
            variants: value.variants,
            productImages: images,
            arModelPath: arModelData
        });

        console.log("===== PRODUCT CREATING (JOI VALIDATED) =====");

        await newProduct.save();

        req.flash("success", "Product created successfully");
        res.redirect("/admin/products");

    } catch (error) {
        console.error("PRODUCT CREATION ERROR:", error);

        const message = error.message || "An unexpected error occurred.";
        req.flash("error", message);
        res.redirect("/admin/products/create");
    }
};

export const blockProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found." });
        }
        product.isActive = !product.isActive;
        await product.save();

        res.status(200).json({
            success: true,
            message: `Product ${product.isActive ? "unblocked" : "blocked"} successfully`,
            isActive: product.isActive
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to update product status." });
    }
};

export const editProductPage = async (req, res) => {
    try {
        const product = await Product.findById({ _id: req.params.id }).populate("category");
        const categories = await Category.find({ isActive: true });
        res.render("admin/productManagement/editProduct", { product, categories });
    } catch (error) {
        console.error(error);
        req.flash("error", "Error loading edit product page");
        res.redirect("/admin/products");
    }
};

export const editProduct = async (req, res) => {
    try {
        const { name, description, category, stock, price, size, specifications, highlights } = req.body;
        const product = await Product.findById({ _id: req.params.id });

        product.name = name;
        product.description = description;
        product.specifications = specifications;
        product.highlights = highlights;
        product.category = category;

        let newSizes = Array.isArray(size) ? size : [size];
        let newPrices = Array.isArray(price) ? price : [price];
        let newStocks = Array.isArray(stock) ? stock : [stock];

        let newIds = [];
        if (req.body._id) {
            newIds = Array.isArray(req.body._id) ? req.body._id : [req.body._id];
        }

        let finalVariants = [];
        const maxVariants = Math.max(newSizes.length, newPrices.length, newStocks.length);

        for (let i = 0; i < maxVariants; i++) {
            const variantId = newIds[i];

            if (variantId) {
                const existingVariant = product.variants.id(variantId);

                if (existingVariant) {
                    existingVariant.size = newSizes[i];
                    existingVariant.price = newPrices[i];
                    existingVariant.stock = newStocks[i];
                    finalVariants.push(existingVariant);
                } else {
                    finalVariants.push({
                        size: newSizes[i],
                        price: newPrices[i],
                        stock: newStocks[i]
                    });
                }
            } else {
                if (newSizes[i] && newPrices[i]) {
                    finalVariants.push({
                        size: newSizes[i],
                        price: newPrices[i],
                        stock: newStocks[i]
                    });
                }
            }
        }

        product.variants = finalVariants;

        let deletedImages = [];
        if (req.body.deletedImages) {
            try {
                deletedImages = JSON.parse(req.body.deletedImages).map(num => parseInt(num));
            } catch (e) {
                return res.status(400).json({ success: false, message: "Invalid deleted images data." });
            }
        }

        let currentImages = product.productImages.filter((_, index) => !deletedImages.includes(index));

        if (req.files && req.files.length > 0) {
            const newImages = req.files.map((file) => file.path);
            currentImages = currentImages.concat(newImages);
        }

        product.productImages = currentImages;

        await product.save();
        res.status(200).json({ success: true, message: "Product updated successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to update product details." });
    }
};