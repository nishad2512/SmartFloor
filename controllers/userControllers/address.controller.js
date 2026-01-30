import User from "../../models/userModel.js";
import { Address } from "../../models/userModel.js";
import * as addressService from "../../services/userServices/address.service.js";


export const addresses = async (req, res) => {
    try {
        const userId = req.userId;
        const { addresses, user } = await addressService.addresses(userId);
        res.render("user/profile/address", { addresses, user });
    } catch (error) {
        console.error(error);
        req.flash("error", error.message || "Failed to load addresses.");
        res.redirect("/profile/details");
    }
};

export const addAddressPage = async (req, res) => {
    try {
        const formData = req.flash("formData")[0] || {};
        req.session.next_page = req.query.next;
        res.render("user/profile/addAddress", { formData, createAddr: true });
    } catch (error) {
        console.error(error);
        req.flash("error", "Failed to load address creation page.");
        res.redirect("/profile/addresses");
    }
};

export const addAddress = async (req, res) => {
    try {
        const userId = req.userId;
        const addressData = req.body;

        await addressService.addAddress(userId, addressData);

        if (req.xhr || req.headers['content-type'] === 'application/json' || req.headers.accept.indexOf('json') > -1) {
            const next = req.session.next_page || 'addresses';
            return res.status(200).json({ success: true, message: "Address added successfully", next });
        }

    } catch (error) {
        console.error(error);
        if (req.xhr || req.headers['content-type'] === 'application/json' || req.headers.accept.indexOf('json') > -1) {
            return res.status(400).json({ success: false, message: error.message || "Failed to add address." });
        }
        req.flash("formData", req.body);
        req.flash("error", error.message || "Failed to add address.");
        res.redirect("/profile/addresses/add");
    }
}

export const editAddressPage = async (req, res) => {
    try {
        const addressId = req.params.id;
        const userId = req.userId;
        const address = await addressService.getAddressById(userId, addressId);

        res.render("user/profile/addAddress", { formData: address });
    } catch (error) {
        console.error(error);
        req.flash("error", error.message || "Failed to load address for editing.");
        res.redirect("/profile/addresses");
    }
};

export const editAddress = async (req, res) => {
    try {
        const addressId = req.params.id;
        const userId = req.userId;
        const updateData = req.body;

        await addressService.editAddress(userId, addressId, updateData);

        if (req.xhr || req.headers['content-type'] === 'application/json' || req.headers.accept.indexOf('json') > -1) {
            return res.status(200).json({ success: true, message: "Address updated successfully" });
        }

        req.flash("success", "Address updated successfully");
        res.redirect("/profile/addresses");
    } catch (error) {
        console.error(error);
        if (req.xhr || req.headers['content-type'] === 'application/json' || req.headers.accept.indexOf('json') > -1) {
            return res.status(400).json({ success: false, message: error.message || "Failed to update address." });
        }
        req.flash("error", "Failed to update address.");
        res.redirect("/profile/addresses/edit/" + req.params.id);
    }
};

export const deleteAddress = async (req, res) => {
    try {
        const addressId = req.params.id;
        const userId = req.userId;
        await addressService.deleteAddress(userId, addressId);

        if (req.xhr || req.headers['content-type'] === 'application/json' || req.headers.accept.indexOf('json') > -1) {
            return res.status(200).json({ success: true, message: "Address deleted successfully" });
        }

        req.flash("success", "Address deleted successfully");
        res.redirect("/profile/addresses");
    } catch (error) {
        console.error(error);
        if (req.xhr || req.headers['content-type'] === 'application/json' || req.headers.accept.indexOf('json') > -1) {
            return res.status(400).json({ success: false, message: error.message || "Failed to delete address." });
        }
        req.flash("error", error.message || "Failed to delete address.");
        res.redirect("/profile/addresses");
    }
};