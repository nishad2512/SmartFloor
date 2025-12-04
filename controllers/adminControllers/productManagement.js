import Product from "../../models/productModel.js";
import Category from "../../models/categoryModel.js";

export const products = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search;
    const filter = search
        ? { name: { $regex: search, $options: "i" }, isActive: true }
        : { isActive: true };
    const limit = 5;
    const skip = (page - 1) * limit;

    const products = await Product.find(filter).populate("category");
    res.render("admin/productManagement/products", { products });
};

export const createProductPage = async (req, res) => {
    const categories = await Category.find({ isActive: true });
    res.render("admin/productManagement/createProduct", { categories });
};

export const createProduct = async (req, res) => {
    const { name, description, category, stock, price, size } = req.body;
    let variants = [];

    if(!name || !description || !category || !size || !price || !stock){
        req.flash("error", "All fields are required.");
        return  res.redirect("/admin/products/create");
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

    if (!req.files || req.files.length === 0) {
        req.flash("error", "Please upload at least one image.");
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
