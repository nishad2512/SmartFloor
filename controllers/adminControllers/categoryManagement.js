import Category from "../../models/categoryModel.js";

export const categories = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search;
    const filter = search ? {name: {$regex: search, $options: "i"}, isActive: true} : {isActive: true}
    const limit = 5;
    const skip = (page - 1) * limit;

    const categories = await Category.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit);
    res.render("admin/categoryManagement/categories", { categories, page, search });
}

export const createCategory = async (req, res) => {
    const { name } = req.body;
    console.log("Category Name:", name);
    const newCategory = new Category({ name });
    await newCategory.save();
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
    res.redirect("/admin/categories");
}

export const deleteCategory = async (req, res) => {
    const category = await Category.findById({_id: req.params.id});
    console.log(category);
    category.isActive = false;
    await category.save();
    res.redirect("/admin/categories");
}