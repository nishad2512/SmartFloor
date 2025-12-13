import Product from "../../models/productModel.js";
import Category from "../../models/categoryModel.js";

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
        req.flash("error", "Error fetching products");
        res.redirect("/admin/dashboard");
    }
};

export const createProductPage = async (req, res) => {
    try {
        const categories = await Category.find({ isActive: true });
        res.render("admin/productManagement/createProduct", { categories });
    } catch (error) {
        console.error(error);
        req.flash("error", "Error loading create product page");
        res.redirect("/admin/products");
    }
};

export const createProduct = async (req, res) => {
    try {
        const { name, description, category, stock, price, size, specifications, highlights } = req.body;
        let variants = [];

        const specificationsArray = specifications && specifications.split(',').map(item => item.trim())
        const highlightsArray = highlights && highlights.split(',').map(item => item.trim())

        if (
            Array.isArray(size) === false ||
            Array.isArray(price) === false ||
            Array.isArray(stock) === false
        ) {
            variants = [
                {
                    size: size,
                    price: price,
                    stock: stock,
                },
            ];
        } else {
            for (let i = 0; i < stock.length; i++) {
                variants.push({
                    size: size[i],
                    stock: stock[i],
                    price: price[i],
                });
            }
        }

        const images = req.files.map((file) => file.path);
        const categoryId = await Category.findOne({ name: category }).then(
            (cat) => cat._id
        );

        const newProduct = new Product({
            name,
            description,
            specifications: specificationsArray,
            highlights: highlightsArray,
            category: categoryId,
            variants,
            productImages: images,
        });

        await newProduct.save();

        req.flash("success", "Product created successfully");
        res.redirect("/admin/products");
    } catch (error) {
        console.error(error);
        req.flash("error", "Error creating product");
        res.redirect("/admin/products");
    }
};

export const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById({ _id: req.params.id });
        product.isActive = false;
        await product.save();
        req.flash("success", "Product deleted successfully");
        res.redirect("/admin/products");
    } catch (error) {
        console.error(error);
        req.flash("error", "Error deleting product");
        res.redirect("/admin/products");
    }
};

export const unblockProduct = async (req, res) => {
    try {
        const product = await Product.findById({ _id: req.params.id });
        product.isActive = true;
        await product.save();
        req.flash("success", "Product unblocked successfully");
        res.redirect("/admin/products");
    } catch (error) {
        console.error(error);
        req.flash("error", "Error unblocking product");
        res.redirect("/admin/products");
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
        let variants = [];
        if (
            Array.isArray(size) === false ||
            Array.isArray(price) === false ||
            Array.isArray(stock) === false
        ) {
            variants = [
                {
                    size: size,
                    price: price,
                    stock: stock,
                },
            ];
        } else {
            for (let i = 0; i < stock.length; i++) {
                variants.push({
                    size: size[i],
                    stock: stock[i],
                    price: price[i],
                });
            }
        }
        const product = await Product.findById({ _id: req.params.id });
        product.name = name;
        product.description = description;

        const specificationsArray = specifications && specifications.split(',').map(item => item.trim())
        const highlightsArray = highlights && highlights.split(',').map(item => item.trim())
        product.specifications = specificationsArray;
        product.highlights = highlightsArray;

        // Category is sent as ID from editProduct.ejs
        product.category = category;
        product.variants = variants;

        // Handle Image Updates
        let deletedImages = [];
        if (req.body.deletedImages) {
            try {
                deletedImages = JSON.parse(req.body.deletedImages).map(num => parseInt(num));
            } catch (e) {
                console.error("Error parsing deletedImages:", e);
            }
        }

        // Filter out deleted images from existing images
        // We filter by index since we passed indices from frontend
        let currentImages = product.productImages.filter((_, index) => !deletedImages.includes(index));

        // Add new images
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map((file) => file.path);
            currentImages = currentImages.concat(newImages);
        }

        product.productImages = currentImages;

        await product.save();
        req.flash("success", "Product updated successfully");
        res.redirect("/admin/products");
    } catch (error) {
        console.error(error);
        req.flash("error", "Error updating product");
        res.redirect("/admin/products");
    }
};