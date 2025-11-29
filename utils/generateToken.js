import jwt from "jsonwebtoken";

export const maxAge = 3 * 24 * 60 * 60;

const createToken = (id) => {
    return jwt.sign({id}, 'smart-floor', {
        expiresIn: maxAge
    });
}

export default createToken