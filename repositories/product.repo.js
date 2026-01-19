import Product from "../models/productModel.js";

export const findActiveProduct = (id) =>
    Product.findOne({ _id: id, isActive: true });

export const findProductById = (id) => Product.findById(id);

export const createProduct = (data) => Product.create(data);

export const saveProduct = (product) => product.save();

export const findAllActiveProducts = () =>
    Product.find({ isActive: true }).sort({ createdAt: -1 });

export const bulkReduceStock = (bulkOps) => Product.bulkWrite(bulkOps);

