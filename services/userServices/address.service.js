import * as address from "../../repositories/address.repo.js";
import * as userRepo from "../../repositories/user.repo.js";
import * as order from "../../repositories/order.repo.js";

export const addresses = async (userId) => {
    const user = await userRepo.findById(userId);
    if (!user) {
        throw new Error("User not found");
    }
    const addresses = await address.findAddressesByUserId(userId);
    return { addresses, user };
};

export const addAddress = async (userId, addressData) => {
    validateAddress(addressData);
    const newAddress = { ...addressData, user: userId };
    return await address.createAddress(newAddress);
};

export const getAddressById = async (userId, addressId) => {
    const addr = await address.findAddressById(addressId);
    if (!addr || addr.user.toString() !== userId) {
        throw new Error("Address not found or unauthorized");
    }
    return addr;
};

export const editAddress = async (userId, addressId, updateData) => {
    validateAddress(updateData);
    const existingAddress = await address.findAddressById(addressId);
    if (!existingAddress || existingAddress.user.toString() !== userId) {
        throw new Error("Address not found or unauthorized");
    }
    return await address.updateAddressById(addressId, updateData);
}

export const deleteAddress = async (userId, addressId) => {
    const existingAddress = await address.findAddressById(addressId);
    if (!existingAddress || existingAddress.user.toString() !== userId) {
        throw new Error("Address not found or unauthorized");
    }
    const isUsedInOrders = await order.checkAddressInOrders(addressId);
    if (isUsedInOrders) {
        throw new Error("Cannot delete address associated with existing orders");
    }
    return await address.deleteAddressById(addressId);
}


const validateAddress = ({ name, phone, email, address1, city, state, zip }) => {
    if (!name || name.trim().length < 3)
        throw new Error("Name must be at least 3 characters");

    if (!phone || !/^\+?[\d\s-]{10,20}$/.test(phone))
        throw new Error("Invalid phone number");

    if (!address1 || !city || !state || !zip)
        throw new Error("Please fill all required fields");

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new Error("Invalid email");
};