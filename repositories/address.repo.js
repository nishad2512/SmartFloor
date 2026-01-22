import { Address } from "../models/userModel.js";

export const findAddressesByUserId = (userId) => {
    return Address.find({ user: userId });
};

export const createAddress = (addressData) => {
    const address = new Address(addressData);
    return address.save();
};

export const deleteAddressById = (addressId) => {
    return Address.findByIdAndDelete(addressId);
};

export const updateAddressById = (addressId, updateData) => {
    return Address.findByIdAndUpdate(addressId, updateData, { new: true });
};

export const findAddressById = (addressId) => {
    return Address.findById(addressId);
};