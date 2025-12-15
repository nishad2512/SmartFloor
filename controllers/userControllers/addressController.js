import User from "../../models/userModel.js";
import { Address } from "../../models/userModel.js";



export const addresses = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await User.findById(userId); // Fetch user details
        const addresses = await Address.find({ user: userId });
        res.render("user/profile/address", { addresses, user }); // Pass user to view
    } catch (error) {
        console.error(error);
        req.flash("error", "Error loading addresses");
        res.redirect("/profile/details");
    }
};

export const addAddressPage = async (req, res) => {
    try {
        const formData = req.flash("formData")[0] || {};
        res.render("user/profile/addAddress", { formData, createAddr: true });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

export const addAddress = async (req, res) => {
    try {
        const userId = req.userId;
        const { name, email, phone, address1, address2, city, state, zip, type } = req.body;

        // Validation
        if (!name || name.trim().length < 3) {
            req.flash("error", "Name must be at least 3 characters");
            req.flash("formData", req.body);
            return res.redirect("/profile/addresses/add");
        }
        if (!phone || !/^\+?[\d\s-]{10,20}$/.test(phone)) {
            req.flash("error", "Invalid phone number");
            req.flash("formData", req.body);
            return res.redirect("/profile/addresses/add");
        }
        if (!address1 || !city || !state || !zip) {
            req.flash("error", "Please fill in all required fields (Street, City, State, Zip)");
            req.flash("formData", req.body);
            return res.redirect("/profile/addresses/add");
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            req.flash("error", "Invalid email address");
            req.flash("formData", req.body);
            return res.redirect("/profile/addresses/add");
        }

        const newAddress = new Address({
            user: userId,
            name,
            email,
            phone,
            address1,
            address2,
            city,
            state,
            zip,
            type
        });
        await newAddress.save();

        req.flash("success", "Address added successfully");
        res.redirect("/profile/addresses");
    } catch (error) {
        console.error(error);
        req.flash("error", "Error adding address");
        res.redirect("/profile/addresses/add");
    }
}

export const editAddressPage = async (req, res) => {
    try {
        const addressId = req.params.id;
        const userId = req.userId;
        const address = await Address.findOne({ _id: addressId, user: userId });
        if (!address) {
            req.flash("error", "Address not found");
            return res.redirect("/profile/addresses");
        }

        res.render("user/profile/addAddress", { formData: address });
    } catch (error) {
        console.error(error);
        req.flash("error", "Error loading address");
        res.redirect("/profile/addresses");
    }
};

export const editAddress = async (req, res) => {
    try {
        const addressId = req.params.id;
        const userId = req.userId;
        const { name, email, phone, address1, address2, city, state, zip, type } = req.body;

        const address = await Address.findOne({ _id: addressId, user: userId });
        if (!address) {
            req.flash("error", "Address not found");
            return res.redirect("/profile/addresses");
        }

        await Address.updateOne({ _id: addressId, user: userId }, {
            name,
            email,
            phone,
            address1,
            address2,
            city,
            state,
            zip,
            type
        });

        req.flash("success", "Address updated successfully");
        res.redirect("/profile/addresses");
    } catch (error) {
        console.error(error);
        req.flash("error", "Error updating address");
        res.redirect("/profile/addresses/edit/" + req.params.id);
    }
};

export const deleteAddress = async (req, res) => {
    try {
        const addressId = req.params.id;
        const userId = req.userId;
        await Address.deleteOne({ _id: addressId, user: userId });
        req.flash("success", "Address deleted successfully");
        res.redirect("/profile/addresses");
    } catch (error) {
        console.error(error);
        req.flash("error", "Error deleting address");
        res.redirect("/profile/addresses");
    }
};