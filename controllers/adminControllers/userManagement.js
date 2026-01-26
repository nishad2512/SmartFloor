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
        req.flash("error", "Failed to fetch users.");
        res.redirect("/admin/dashboard");
    }
};

export const blockUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }
        user.isBlocked = !user.isBlocked;
        await user.save();
        res.status(200).json({
            success: true,
            message: `User has been ${user.isBlocked ? "blocked" : "unblocked"} successfully.`,
            isBlocked: user.isBlocked
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to update user status." });
    }
};