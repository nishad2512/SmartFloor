function generateCode(name) {
    const prefix = name.replace(/\s/g, "").slice(0, 4).toUpperCase();

    const randomNum = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, "0");

    return prefix + randomNum;
}

export default generateCode