import jwt from "jsonwebtoken";

export const maxAge = 3 * 24 * 60 * 60;

export const createToken = (id) => {
    return jwt.sign({id}, 'smart-floor', {
        expiresIn: maxAge
    });
}

export const createAdminToken = (id) => {
    return jwt.sign({id}, 'smartFloor-admin', {
        expiresIn: maxAge
    });
}