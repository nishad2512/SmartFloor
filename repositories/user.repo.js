import User from "../models/userModel.js";

export const findByEmail = (email) => User.findOne({ email });
export const findById = (id) => User.findById(id);
export const createUser = (data) => User.create(data);
export const saveUser = (user) => user.save();