import Offer from "../../models/offerModel.js";
import Product from "../../models/productModel.js";
import Category from "../../models/categoryModel.js";

export const offers = async (req, res) => {
    try {

        const offers = await Offer.find().sort({ createdAt: -1 });

        res.render('admin/offerManagement/offers', { offers });

    } catch (error) {
        console.error(error);
        req.flash('error', "Something went wrong");
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
        req.flash('error', "Something went wrong");
        res.redirect('/admin/dashboard')
    }
}

export const createOffer = async (req, res) => {
    try {
        const { name, scope, products, category } = req.body;

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
        req.flash('error', "Something went wrong");
        res.redirect('/admin/dashboard')
    }
}

export const blockOrUnblock = async (req, res) => {
    try {

        const isActive = req.query.isActive === 'true';
        const offer = await Offer.findById(req.params.id);

        offer.isActive = !isActive;
        await offer.save();

        req.flash("success", "Offer blocked / unblocked successfully")
        res.json({success: true});

    } catch (error) {
        req.flash("error", "Something went wrong");
        res.json({success: false})
    }
}