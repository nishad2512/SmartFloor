import Product from "../../models/productModel.js";
import Category from "../../models/categoryModel.js";

export const products = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search;
    const filter = search
        ? { name: { $regex: search, $options: "i" } }
        : {  };
    const limit = 5;
    const skip = (page - 1) * limit;

    const products = await Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("category");
    res.render("admin/productManagement/products", { products, page, search });
};

export const createProductPage = async (req, res) => {
    const categories = await Category.find({ isActive: true });
    res.render("admin/productManagement/createProduct", { categories });
};

export const createProduct = async (req, res) => {
    const { name, description, category, stock, price, size } = req.body;
    let variants = [];

    if (!name || !description || !category || !size || !price || !stock) {
        req.flash("error", "All fields are required.");
        return res.redirect("/admin/products/create");
    }

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

    if (!req.files || req.files.length < 3) {
        req.flash("error", "Please upload at least three images.");
        return res.redirect("/admin/products/create");
    }

    const images = req.files.map((file) => file.path);
    const categoryId = await Category.findOne({ name: category }).then(
        (cat) => cat._id
    );

    const newProduct = new Product({
        name,
        description,
        category: categoryId,
        variants,
        productImages: images,
    });

    await newProduct.save();

    req.flash("success", "Product created successfully");
    res.redirect("/admin/products");
};

export const deleteProduct = async (req, res) => {
    const product = await Product.findById({ _id: req.params.id });
    product.isActive = false;
    await product.save();
    req.flash("success", "Product deleted successfully");
    res.redirect("/admin/products");
};

export const unblockProduct = async (req, res) => {
    const product = await Product.findById({ _id: req.params.id });
    product.isActive = true;
    await product.save();
    req.flash("success", "Product unblocked successfully");
    res.redirect("/admin/products");
};

export const editProductPage = async (req, res) => {
    const product = await Product.findById({ _id: req.params.id }).populate("category");
    const categories = await Category.find({ isActive: true });
    res.render("admin/productManagement/editProduct", { product, categories });
};

export const editProduct = async (req, res) => {
    const { name, description, category, stock, price, size } = req.body;
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

    // Category is sent as ID from editProduct.ejs
    product.category = category;

    product.variants = variants;

    // Handle Image Updates
    let deletedImages = [];
    if (req.body.deletedImages) {
        try {
            deletedImages = JSON.parse(req.body.deletedImages);
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
};