import Offer from "../models/offerModel.js";

const getBestOffer = async (product) => {
    try {
        if (!product) return null;

        const now = new Date();
        const categoryId = product.category?._id || product.category;

        const offers = await Offer.find({
            isActive: true,
            start: { $lte: now },
            end: { $gte: now },
            $or: [
                { products: product._id },
                { category: categoryId },
                { scope: 'all'}
            ]
        });

        if (!offers || offers.length === 0) {
            return null;
        }

        const referencePrice = (product.variants && product.variants.length > 0)
            ? product.variants[0].price
            : 0;

        let bestOffer = null;
        let maxDiscountAmount = 0;

        for (const offer of offers) {
            let discountAmount = 0;

            if (offer.type === "percentage") {
                discountAmount = (referencePrice * offer.value) / 100;
            } else if (offer.type === "fixed") {
                discountAmount = offer.value;
            } else if (offer.type === "shipping") {
                discountAmount = 0;
            }

            if (discountAmount > maxDiscountAmount) {
                maxDiscountAmount = discountAmount;
                bestOffer = offer;
            }
        }

        return bestOffer;

    } catch (error) {
        console.error("Error in getBestOffer:", error);
        return null;
    }
}

const applyOffer = async (product) => {
    if (!product) return null;

    const bestOffer = await getBestOffer(product);
    if (!bestOffer) return product;

    product.variants = product.variants.map(variant => {
        let discount = 0;

        if (bestOffer.type == "percentage") {
            discount = (variant.price * bestOffer.value) / 100;
        }else if (bestOffer.type == "fixed") {
            discount = bestOffer.value
        }

        const offerPrice = Math.max(variant.price - discount, 5);

        return {
            ...variant,
            offerPrice: Math.round(offerPrice),
            discountAmount: Math.round(discount)
        }
    });

    product.offer = {
        _id: bestOffer._id,
        name: bestOffer.name,
        type: bestOffer.type,
        value: bestOffer.value
    };

    return product;
}

export default applyOffer;