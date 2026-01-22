import Cart from "../models/cartModel.js";

export const findUserCart = (userId) => {
    return Cart.find({ user: userId }).populate("product");
};

export const findCartItem = (userId, productId, variantId) => {
    return Cart.findOne({ user: userId, product: productId, variant: variantId }).populate("product");
};

export const findCartItemById = (id) => {
    return Cart.findById(id).populate("product");
};

export const createCartItem = (data) => {
    return Cart.create(data);
};

export const saveCartItem = async (doc) => {
    return await doc.save();
};

export const deleteCartItem = (id) => {
    return Cart.deleteOne({ _id: id });
};

export const clearUserCart = (userId) => {
    return Cart.deleteMany({ user: userId });
};