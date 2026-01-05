import Coupen from "../../models/coupenModel.js";

export const coupens = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;

        const coupens = await Coupen.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalCoupens = await Coupen.countDocuments();
        const totalPages = Math.ceil(totalCoupens / limit);

        res.render('admin/coupenManagement/coupens', {
            coupens,
            currentPage: page,
            totalPages: totalPages,
            totalCoupens,
            limit
        });

    } catch (error) {

        console.error(error);
        req.flash('error', 'Something went wrong');
        res.redirect('/admin/dashboard');

    }
}

export const createPage = async (req, res) => {
    try {

        res.render('admin/coupenManagement/createCoupen');

    } catch (error) {

        consol.error(error);
        req.flash('error', 'Something went wrong');
        res.redirect('/admin/dashboard');

    }
}

export const create = async (req, res) => {
    try {

        const data = { ...req.body };

        if (!data) {
            return res.status(404).json({ success: false, message: "Not having proper fields" });
        }

        const newCoupen = new Coupen(data);
        await newCoupen.save();

        res.status(200).json({ success: true });

    } catch (error) {

        consol.error(error);
        req.flash('error', 'Something went wrong');
        res.redirect('/admin/dashboard');

    }
}

export const editPage = async (req, res) => {
    try {

        const coupen = await Coupen.findById(req.params.id)

        res.render('admin/coupenManagement/editCoupen', { coupen });

    } catch (error) {

        consol.error(error);
        req.flash('error', 'Something went wrong');
        res.redirect('/admin/dashboard');

    }
}

export const edit = async (req, res) => {
    try {

        const data = { ...req.body };
        const coupenId = req.params.id;

        if (!data) {
            return res.status(404).json({ success: false, message: "Not having proper fields" });
        }

        const updated = await Coupen.findByIdAndUpdate(coupenId, data, { new: true, runValidators: true });
        console.log(updated)

        res.status(200).json({ success: true });

    } catch (error) {

        consol.error(error);
        req.flash('error', 'Something went wrong');
        res.redirect('/admin/dashboard');

    }
}

export const block = async (req, res) => {
    try {

        const coupenId = req.params.id;
        const coupen = await Coupen.findById(coupenId);

        coupen.isActive = !coupen.isActive

        await coupen.save();

        req.flash("success", "Done successfully")
        res.status(200).json({ success: true });

    } catch (error) {

        console.error(error);
        req.flash('error', 'Something went wrong');
        res.redirect('/admin/dashboard');

    }
}