import jwt from "jsonwebtoken";

export const maxAge = 3 * 24 * 60 * 60;

export const createToken = (id) => {
    return jwt.sign({id}, process.env.JWT_SECRET_USER, {
        expiresIn: maxAge
    });
}

export const createAdminToken = (id) => {
    return jwt.sign({id, role: 'admin'}, process.env.JWT_SECRET_ADMIN, {
        expiresIn: maxAge
    });
}