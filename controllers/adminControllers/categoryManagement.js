import Category from "../../models/categoryModel.js";
import Product from "../../models/productModel.js";

export const categories = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const search = req.query.search;
        const filter = search ? { name: { $regex: search, $options: "i" } } : {}
        const limit = 5;
        const skip = (page - 1) * limit;
        const totalCount = await Category.countDocuments(filter);
        const totalPages = Math.ceil(totalCount / limit);

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

        res.render("admin/categoryManagement/categories", { categories, page, search, totalPages });
    } catch (error) {
        console.error(error);
        req.flash("error", "Failed to load categories. Please try again.");
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
            if (req.xhr || req.headers['content-type'] === 'application/json' || req.headers.accept.indexOf('json') > -1) {
                return res.status(400).json({ success: false, message: "Category name already exists" });
            }
            req.flash("error", "Category name already exists");
            return res.redirect("/admin/categories");
        }

        category.name = name;
        await category.save();

        if (req.xhr || req.headers['content-type'] === 'application/json' || req.headers.accept.indexOf('json') > -1) {
            return res.status(200).json({ success: true, message: "Category updated successfully" });
        }

        req.flash("success", "Category updated successfully");
        res.redirect("/admin/categories");
    } catch (error) {
        console.error(error);
        if (req.xhr || req.headers['content-type'] === 'application/json' || req.headers.accept.indexOf('json') > -1) {
            return res.status(500).json({ success: false, message: "Error updating category" });
        }
        req.flash("error", "Error updating category");
        res.redirect("/admin/categories");
    }
}

export const blockCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found." });
        }
        category.isActive = !category.isActive;
        await category.save();

        if (!category.isActive) {
            await Product.updateMany({ category: category._id }, { isActive: false });
        }

        res.status(200).json({
            success: true,
            message: `Category ${category.isActive ? "unblocked" : "blocked"} successfully`,
            isActive: category.isActive
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Error updating category status" });
    }
}