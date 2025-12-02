import bcrypt from "bcrypt";

export const createHash = (pass) => {
    return bcrypt.hash(pass, 10);
}

export const compare = (pass, hash) => {
    return bcrypt.compare(pass, hash)
}