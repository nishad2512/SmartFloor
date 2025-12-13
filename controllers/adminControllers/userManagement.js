import User from "../../models/userModel.js";

export const users = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const search = req.query.search;
        const filter = search
            ? { name: { $regex: search, $options: "i" } }
            : {};
        const limit = 5;
        const skip = (page - 1) * limit;
        const totalUsers = await User.countDocuments(filter);
        const totalPages = Math.ceil(totalUsers / limit);

        const users = await User.find(filter)
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit);
        res.render("admin/userManagement/users", {
            users,
            page,
            search,
            totalPages,
        });
    } catch (error) {
        console.error(error);
        req.flash("error", "Error fetching users");
        res.redirect("/admin/dashboard");
    }
};

export const blockUser = async (req, res) => {
    try {
        const block = req.query.block;
        const user = await User.findById(req.params.id);
        user.isBlocked = block === "true" ? true : false;
        await user.save();
        req.flash("success", `User has been ${block === "true" ? "blocked" : "unblocked"} successfully.`);
        res.redirect("/admin/customers");
    } catch (error) {
        console.error(error);
        req.flash("error", "Error updating user");
        res.redirect("/admin/customers");
    }
};