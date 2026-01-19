import Coupen from "../models/coupenModel.js";

export const findValid = (code) =>
    Coupen.findOne({
        code,
        isActive: true,
        expirationDate: { $gte: new Date() },
        $or: [
            { usageLimit: null },
            { $expr: { $lt: ["$usedCount", "$usageLimit"] } },
        ],
    });

export const createCoupen = (coupenData) => {
    const coupen = new Coupen(coupenData);
    return coupen.save();
};

export const deleteCoupenById = (coupenId) => {
    return Coupen.findByIdAndDelete(coupenId);
};

export const updateCoupenById = (coupenId, updateData) => {
    return Coupen.findByIdAndUpdate(coupenId, updateData, { new: true });
};

export const findAllCoupens = () => {
    return Coupen.find({
        isActive: true,
        expirationDate: { $gte: new Date() },
        $or: [
            { usageLimit: null },
            { $expr: { $lt: ["$usedCount", "$usageLimit"] } },
        ],
    }).sort({ createdAt: -1 });
};

export const findCoupenById = (coupenId) => {
    return Coupen.findById(coupenId);
};
