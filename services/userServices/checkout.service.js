import * as cartRepo from "../../repositories/cart.repo.js";
import * as productRepo from "../../repositories/product.repo.js";
import * as address from "../../repositories/address.repo.js";
import * as coupenRepo from "../../repositories/coupen.repo.js";
import Offer from "../../models/offerModel.js";
import applyOffer from "../../utils/offerFetch.js";

const FREE_SHIPPING_MIN = 5000;
const SHIPPING_FEE = 200;
const TAX_RATE = 0.18;

export const buildCheckout = async (userId, query) => {
    const { productId, variantId, quantity } = query;
    const now = new Date();

    if (productId && variantId && quantity) {
        return buildSingleCheckout(userId, productId, variantId, quantity, now);
    }

    return buildCartCheckout(userId, now);
};

async function buildSingleCheckout(
    userId,
    productId,
    variantId,
    quantity,
    now
) {
    const product = await productRepo.findProductById(productId);
    if (!product || !product.isActive) throw new Error("Product not found");

    const productWithOffer = await applyOffer(product.toObject());
    const variant = productWithOffer.variants.find(
        (v) => v._id.toString() === variantId
    );

    if (!variant) throw new Error("Variant not found");

    const unitPrice = variant.offerPrice || variant.price;
    const totalAmount = unitPrice * Number(quantity);

    /* --- Check shipping offer --- */
    const hasShippingOffer = await Offer.exists({
        isActive: true,
        start: { $lte: now },
        end: { $gte: now },
        type: "shipping",
        $or: [
            { products: product._id },
            { category: product.category },
            { scope: "all" },
        ],
    });

    const qualifiesForFreeShipping =
        hasShippingOffer && totalAmount >= FREE_SHIPPING_MIN;
    const shipping = qualifiesForFreeShipping ? 0 : SHIPPING_FEE;
    const tax = totalAmount * TAX_RATE;
    const total = totalAmount + shipping + tax;

    const addresses = await address.findAddressesByUserId(userId);
    const coupens = await coupenRepo.findAllCoupens();

    return {
        mode: "single",
        product,
        variant,
        addresses,
        coupens,
        quantity: Number(quantity),
        totalAmount,
        shipping,
        tax,
        total,
        offerId: productWithOffer.offer?._id || null,
        offerPrice: variant.offerPrice || null,
    };
}

async function buildCartCheckout(userId, now) {
    const cartItems = await cartRepo.findUserCart(userId);
    if (!cartItems.length) throw new Error("Your cart is empty");

    // Validate stock + active
    for (const item of cartItems) {
        if (!item.product.isActive)
            throw new Error("Unavailable product in cart");
        const variant = item.product.variants.id(item.variant);
        if (!variant || variant.stock < item.quantity) {
            throw new Error("Some items exceed available stock");
        }
    }

    const totalAmount = cartItems.reduce((sum, i) => sum + i.total, 0);

    const productIds = cartItems.map((i) => i.product._id);
    const categories = cartItems.map((i) => i.product.category);

    /* --- Check shipping offer --- */
    const hasShippingOffer = await Offer.exists({
        isActive: true,
        start: { $lte: now },
        end: { $gte: now },
        type: "shipping",
        $or: [
            { products: { $in: productIds } },
            { category: { $in: categories } },
            { scope: "all" },
        ],
    });

    const qualifiesForFreeShipping =
        hasShippingOffer && totalAmount >= FREE_SHIPPING_MIN;
    const shipping = qualifiesForFreeShipping ? 0 : SHIPPING_FEE;
    const tax = totalAmount * TAX_RATE;
    const total = totalAmount + shipping + tax;

    const addresses = await address.findAddressesByUserId(userId);
    const coupens = await coupenRepo.findAllCoupens();

    return {
        mode: "cart",
        cartItems,
        totalAmount,
        addresses,
        coupens,
        shipping,
        tax,
        total,
    };
}
