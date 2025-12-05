import Category from "../../models/categoryModel.js";

export const categories = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search;
    const filter = search ? {name: {$regex: search, $options: "i"}} : {}
    const limit = 5;
    const skip = (page - 1) * limit;

    const categories = await Category.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
    res.render("admin/categoryManagement/categories", { categories, page, search });
}

export const createCategory = async (req, res) => {
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
}

export const editPage = async (req, res) => {
    const category = await Category.findById({_id: req.params.id});
    res.render("admin/categoryManagement/editCategory", {category})
}

export const editCategory = async (req, res) => {
    const {name} = req.body;
    const category = await Category.findById({_id: req.params.id});
    category.name = name;
    await category.save();
    req.flash("success", "Category updated successfully");
    res.redirect("/admin/categories");
}

export const deleteCategory = async (req, res) => {
    const category = await Category.findById({_id: req.params.id});
    console.log(category);
    category.isActive = false;
    await category.save();
    req.flash("success", "Category blocked successfully");
    res.redirect("/admin/categories");
}

export const unblockCategory = async (req, res) => {
    const category = await Category.findById({_id: req.params.id});
    console.log(category);
    category.isActive = true;
    await category.save();
    req.flash("success", "Category unblocked successfully");
    res.redirect("/admin/categories");
}