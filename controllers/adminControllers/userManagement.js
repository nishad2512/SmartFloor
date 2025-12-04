import User from "../../models/userModel.js";

export const users = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search;
    const filter = search ? {name: {$regex: search, $options: "i"}} : {}
    const limit = 10;
    const skip = (page - 1) * limit;
    const users = await User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
    res.render("admin/userManagement/users", { users, page, search });
}

export const blockUser = async (req, res) => {
    const user = await User.findById(req.params.id);
    user.isBlocked = true;
    await user.save();
    req.flash("success", "User has been blocked successfully.");
    res.redirect("/admin/customers")
}

export const unblockUser = async (req, res) => {
    const user = await User.findById(req.params.id);
    user.isBlocked = false;
    await user.save();
    req.flash("success", "User has been unblocked successfully.");
    res.redirect("/admin/customers")
}