import * as cartRepo from "../../repositories/cart.repo.js";
import * as productRepo from "../../repositories/product.repo.js";
import applyOffer from "../../utils/offerFetch.js";

/* -------- Load Cart -------- */

export const getCart = async (userId) => {
    const cartItems = await cartRepo.findUserCart(userId);

    const formatted = cartItems
        .map((item) => {
            const variant = item.product.variants.id(item.variant);
            if (!variant) return null;

            return {
                cartItemId: item._id,
                name: item.product.name,
                image: item.product.productImages[0],
                size: variant.size,
                price: item.offerPrice || variant.price,
                originalPrice: item.offerPrice ? variant.price : null,
                quantity: item.quantity,
                total: item.total,
                active: item.product.isActive,
            };
        })
        .filter(Boolean);

    const total = formatted.reduce((sum, i) => sum + i.total, 0);

    return { formatted, total };
};

export const addToCart = async (userId, productId, variantId, quantity) => {
    const product = await productRepo.findActiveProduct(productId);
    if (!product) throw new Error("PRODUCT_NOT_FOUND");

    const variant = product.variants.id(variantId);
    if (!variant) throw new Error("INVALID_VARIANT");

    const cartItem = await cartRepo.findCartItem(userId, productId, variantId);

    const productWithOffer = await applyOffer(product.toObject());
    const v = productWithOffer.variants.find(
        (v) => v._id.toString() === variantId
    );

    const unitPrice = v.offerPrice || v.price;
    const offerId = productWithOffer.offer?._id || null;
    const offerPrice = v.offerPrice || null;

    const requestedQty = quantity;
    const currentQty = cartItem ? cartItem.quantity : 0;

    // Calculate max allowed quantity based on stock and hard limit (500)
    const maxAllowed = Math.min(variant.stock, 500); // Or use a config for max limit

    // Calculate how much we can actually add
    let qtyToAdd = requestedQty;
    let newTotalQty = currentQty + qtyToAdd;

    if (newTotalQty > maxAllowed) {
        newTotalQty = maxAllowed;
        qtyToAdd = Math.max(0, newTotalQty - currentQty);
    }

    if (newTotalQty < 1) throw new Error("LIMIT");

    if (cartItem) {
        cartItem.quantity = newTotalQty;
        cartItem.total = newTotalQty * unitPrice;
        cartItem.offerId = offerId;
        cartItem.offerPrice = offerPrice;
        await cartRepo.saveCartItem(cartItem);
    } else {
        await cartRepo.createCartItem({
            user: userId,
            product: productId,
            variant: variantId,
            quantity: newTotalQty,
            total: newTotalQty * unitPrice,
            offerId,
            offerPrice,
        });
    }

    return {
        finalQty: newTotalQty,
        addedQty: qtyToAdd,
        requestedQty,
        stock: variant.stock,
        hardLimit: maxAllowed,
        currentQty,
    };
};

export const updateQuantity = async (userId, cartItemId, quantity) => {
    const item = await cartRepo.findCartItemById(cartItemId);
    if (!item) throw new Error("NOT_FOUND");

    const variant = item.product.variants.id(item.variant);
    if (!variant) throw new Error("INVALID_VARIANT");

    if (quantity > variant.stock || quantity > 500 || quantity < 1)
        throw {
            code: "LIMIT",
            message: "Stock limit exceeded",
            quantity: item.quantity,
            itemTotal: item.total
        };

    const unitPrice = item.offerPrice || variant.price;
    item.quantity = quantity;
    item.total = unitPrice * quantity;
    await cartRepo.saveCartItem(item);

    const cart = await cartRepo.findUserCart(userId);
    const total = cart.reduce((sum, i) => sum + i.total, 0);

    return { item, total };
};

export const removeFromCart = async (id) => {
    await cartRepo.deleteCartItem(id);
};
