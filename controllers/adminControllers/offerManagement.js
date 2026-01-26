import Offer from "../../models/offerModel.js";
import Product from "../../models/productModel.js";
import Category from "../../models/categoryModel.js";

export const offers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const { search, isActive, scope, sort } = req.query;
        const limit = 5;
        const skip = (page - 1) * limit;

        let query = {};
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }
        if (isActive) {
            if (isActive === 'active') query.isActive = true;
            if (isActive === 'inactive') query.isActive = false;
        }
        if (scope) {
            query.scope = scope;
        }

        let sortQuery = { createdAt: -1 };
        if (sort === 'oldest') {
            sortQuery = { createdAt: 1 };
        } else if (sort === 'value_high') {
            sortQuery = { value: -1 };
        } else if (sort === 'value_low') {
            sortQuery = { value: 1 };
        } else if (sort === 'start_date_desc') {
            sortQuery = { start: -1 };
        } else if (sort === 'start_date_asc') {
            sortQuery = { start: 1 };
        }

        const totalOffers = await Offer.countDocuments(query);
        const offers = await Offer.find(query).sort(sortQuery).skip(skip).limit(limit);
        const totalPages = Math.ceil(totalOffers / limit);

        res.render('admin/offerManagement/offers', {
            offers,
            currentPage: page,
            totalPages,
            totalOffers,
            skip,
            limit,
            search,
            isActive,
            scope,
            sort
        });

    } catch (error) {
        console.error(error);
        req.flash('error', "Failed to load offers. Please try again.");
        res.redirect('/admin/dashboard')
    }
}

export const createOfferPage = async (req, res) => {
    try {
        const products = await Product.find({ isActive: true });
        const categories = await Category.find({ isActive: true });
        res.render('admin/offerManagement/createOffer', { products, categories });
    } catch (error) {
        console.error(error);
        req.flash('error', "Failed to load offer creation page.");
        res.redirect('/admin/offers')
    }
}

export const createOffer = async (req, res) => {
    try {
        const { name, scope } = req.body;

        const offer = await Offer.findOne({ name: { $regex: name, $options: 'i' } });

        if (offer) {
            req.flash('error', 'Offer name already exists');
            return res.redirect('/admin/offers/create');
        }

        const data = { ...req.body };

        // Clean up fields based on scope
        if (scope === 'product') {
            data.category = null;
            if (!data.products) {
                req.flash('error', 'Please select at least one product');
                return res.redirect('/admin/offers/create');
            }
        } else if (scope === 'category') {
            data.products = [];
            if (!data.category) {
                req.flash('error', 'Please select a category');
                return res.redirect('/admin/offers/create');
            }
        } else {
            data.category = null;
            data.products = [];
        }

        const newOffer = new Offer(data);
        await newOffer.save();

        req.flash("success", "Offer created successfully");
        res.redirect('/admin/offers')

    } catch (error) {
        console.error(error);
        req.flash('error', "Failed to create offer. Please try again.");
        res.redirect('/admin/offers')
    }
}

export const blockOrUnblock = async (req, res) => {
    try {
        const isActive = req.query.isActive === 'true';
        const offer = await Offer.findById(req.params.id);

        if (!offer) {
            return res.status(404).json({ success: false, message: "Offer not found" });
        }

        offer.isActive = !isActive;
        await offer.save();

        res.status(200).json({
            success: true,
            message: `Offer ${isActive ? 'blocked' : 'unblocked'} successfully.`,
            isActive: offer.isActive
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to update offer status." })
    }
}

export const editOffer = async (req, res) => {
    try {

        const data = { ...req.body };
        const offerId = req.params.id

        const offer = await Offer.findOne({ _id: { $ne: offerId }, name: { $regex: data.name, $options: 'i' } });

        if (offer) {
            req.flash("error", "Offer name already exists");
            return res.json({ success: false, message: "Offer name already exists" });
        }

        if (data.scope === 'product') {
            data.category = null;
            if (!data.products || (Array.isArray(data.products) && data.products.length === 0)) {
                return res.status(400).json({ success: false, message: "Please select at least one product" });
            }
        } else if (data.scope === 'category') {
            data.products = [];
            if (!data.category) {
                return res.status(400).json({ success: false, message: "Please select a category" });
            }
        } else {
            data.category = null;
            data.products = [];
        }

        const updatedOffer = await Offer.findByIdAndUpdate(offerId, data, { new: true, runValidators: true });

        if (!updatedOffer) {
            req.flash("error", "Invalid offer");
            return res.json({ success: false, message: "Invalid offer" });
        }

        req.flash("success", "Offer updated successfully")
        res.json({ success: true });

    } catch (error) {
        req.flash("error", "Failed to update offer.");
        console.error(error)
        res.json({ success: false, message: "Internal server error." })
    }
}

export const editOfferPage = async (req, res) => {
    try {

        const offer = await Offer.findById(req.params.id)
        const categories = await Category.find();
        const products = await Product.find();
        // console.log(offer)

        res.render('admin/offerManagement/editOffer', { offer, categories, products })

    } catch (error) {
        console.error(error);
        req.flash("error", "Failed to load offer edit page.");
        res.redirect('/admin/offers');
    }
}