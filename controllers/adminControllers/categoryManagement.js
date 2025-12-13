import Category from "../../models/categoryModel.js";
import Product from "../../models/productModel.js";

export const categories = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const search = req.query.search;
        const filter = search ? { name: { $regex: search, $options: "i" } } : {}
        const limit = 5;
        const skip = (page - 1) * limit;

        // find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)

        const categories = await Category.aggregate([
            { $match: filter },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "category",
                    as: "products"
                }
            },
            {
                $addFields: {
                    productCount: { $size: "$products" }
                }
            },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
        ]);

        res.render("admin/categoryManagement/categories", { categories, page, search });
    } catch (error) {
        console.error(error);
        req.flash("error", "Error fetching categories");
        res.redirect("/admin/dashboard");
    }
}

export const createCategory = async (req, res) => {
    try {
        const { name } = req.body;
        const categoryExists = await Category.findOne({ name: { $regex: `^${name}$`, $options: "i" } });
        if (categoryExists) {
            req.flash("error", "Category already exists");
            return res.redirect("/admin/categories/create");
        }
        const newCategory = new Category({ name });
        await newCategory.save();
        req.flash("success", "Category created successfully");
        res.redirect("/admin/categories");
    } catch (error) {
        console.error(error);
        req.flash("error", "Error creating category");
        res.redirect("/admin/categories");
    }
}

export const editPage = async (req, res) => {
    try {
        const category = await Category.findById({ _id: req.params.id });
        res.render("admin/categoryManagement/editCategory", { category })
    } catch (error) {
        console.error(error);
        req.flash("error", "Error loading edit page");
        res.redirect("/admin/categories");
    }
}

export const editCategory = async (req, res) => {
    try {
        const { name } = req.body;
        const category = await Category.findById({ _id: req.params.id });

        // Check if name is taken by another category
        const existingCategory = await Category.findOne({
            name: { $regex: `^${name}$`, $options: "i" },
            _id: { $ne: req.params.id }
        });

        if (existingCategory) {
            req.flash("error", "Category name already exists");
            return res.redirect("/admin/categories");
        }

        category.name = name;
        await category.save();
        req.flash("success", "Category updated successfully");
        res.redirect("/admin/categories");
    } catch (error) {
        console.error(error);
        req.flash("error", "Error updating category");
        res.redirect("/admin/categories");
    }
}

export const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findById({ _id: req.params.id });
        category.isActive = false;
        await category.save();
        await Product.updateMany({ category: category._id }, { isActive: false });
        req.flash("success", "Category blocked successfully");
        res.redirect("/admin/categories");
    } catch (error) {
        console.error(error);
        req.flash("error", "Error blocking category");
        res.redirect("/admin/categories");
    }
}

export const unblockCategory = async (req, res) => {
    try {
        const category = await Category.findById({ _id: req.params.id });
        category.isActive = true;
        await category.save();
        await Product.updateMany({ category: category._id }, { isActive: true });
        req.flash("success", "Category unblocked successfully");
        res.redirect("/admin/categories");
    } catch (error) {
        console.error(error);
        req.flash("error", "Error unblocking category");
        res.redirect("/admin/categories");
    }
}