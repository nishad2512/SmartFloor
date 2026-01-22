import Coupen from "../../models/coupenModel.js";

export const coupens = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const { search, isActive, discountType, sort } = req.query;
        const limit = 5;
        const skip = (page - 1) * limit;

        let query = {};

        if (search) {
            query.code = { $regex: search, $options: 'i' };
        }

        if (isActive) {
            if (isActive === 'active') query.isActive = true;
            if (isActive === 'inactive') query.isActive = false;
        }

        if (discountType) {
            query.discountType = discountType;
        }

        let sortQuery = { createdAt: -1 };
        if (sort === 'oldest') {
            sortQuery = { createdAt: 1 };
        } else if (sort === 'expiry_near') {
            sortQuery = { expirationDate: 1 };
        } else if (sort === 'expiry_far') {
            sortQuery = { expirationDate: -1 };
        } else if (sort === 'value_high') {
            sortQuery = { discountValue: -1 };
        } else if (sort === 'value_low') {
            sortQuery = { discountValue: 1 };
        }

        const totalCoupens = await Coupen.countDocuments(query);
        const coupens = await Coupen.find(query)
            .sort(sortQuery)
            .skip(skip)
            .limit(limit);

        const totalPages = Math.ceil(totalCoupens / limit);

        res.render('admin/coupenManagement/coupens', {
            coupens,
            currentPage: page,
            totalPages,
            totalCoupens,
            limit,
            search,
            isActive,
            discountType,
            sort
        });

    } catch (error) {

        console.error(error);
        req.flash('error', 'An error occurred while fetching coupens. Please try again.');
        res.redirect('/admin/dashboard');

    }
}

export const createPage = async (req, res) => {
    try {

        res.render('admin/coupenManagement/createCoupen');

    } catch (error) {

        console.error(error);
        req.flash('error', 'Failed to load coupon creation page.');
        res.redirect('/admin/coupens');

    }
}

export const create = async (req, res) => {
    try {

        const data = { ...req.body };

        if (!data) {
            return res.status(404).json({ success: false, message: "Missing required fields." });
        }
        const existingCoupen = await Coupen.findOne({ code: { $regex: data.code, $options: 'i' } });

        if (existingCoupen) {
            req.flash('error', 'Coupon code already exists');
            return res.status(409).json({ success: false, message: "Coupon code already exists." });
        }

        const newCoupen = new Coupen(data);
        await newCoupen.save();

        res.status(200).json({ success: true, message: "Coupon created successfully." });

    } catch (error) {

        console.error(error);
        req.flash('error', 'Failed to create coupon.');
        res.status(500).json({ success: false, message: "Internal server error." });

    }
}

export const editPage = async (req, res) => {
    try {

        const coupen = await Coupen.findById(req.params.id)

        res.render('admin/coupenManagement/editCoupen', { coupen });

    } catch (error) {

        console.error(error);
        req.flash('error', 'Failed to load coupon edit page.');
        res.redirect('/admin/coupens');

    }
}

export const edit = async (req, res) => {
    try {

        const data = { ...req.body };
        const coupenId = req.params.id;

        if (!data) {
            return res.status(404).json({ success: false, message: "Missing required fields." });
        }

        const existingCoupen = await Coupen.findOne({ _id: { $ne: coupenId }, code: { $regex: data.code, $options: 'i' } });

        if (existingCoupen) {
            req.flash('error', 'Coupon code already exists');
            return res.status(409).json({ success: false, message: "Coupon code already exists." });
        }

        const updated = await Coupen.findByIdAndUpdate(coupenId, data, { new: true, runValidators: true });
        console.log(updated)

        res.status(200).json({ success: true, message: "Coupon updated successfully." });

    } catch (error) {

        console.error(error);
        req.flash('error', 'Failed to update coupon.');
        res.status(500).json({ success: false, message: "Internal server error." });

    }
}

export const block = async (req, res) => {
    try {

        const coupenId = req.params.id;
        const coupen = await Coupen.findById(coupenId);

        coupen.isActive = !coupen.isActive

        await coupen.save();

        req.flash("success", `Coupon ${coupen.isActive ? 'activated' : 'deactivated'} successfully.`)
        res.status(200).json({ success: true });

    } catch (error) {

        console.error(error);
        req.flash('error', 'Failed to update coupon status.');
        res.status(500).json({ success: false, message: "Internal server error." });

    }
}