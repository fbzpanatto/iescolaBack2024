"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePassword = void 0;
function generatePassword() {
    const lowerLetters = "abcdefghijklmnopqrstuvwxyz";
    const upperLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const allChar = lowerLetters + upperLetters + numbers;
    let password = "";
    for (let i = 0; i < 8; i++) {
        const randomI = Math.floor(Math.random() * allChar.length);
        password += allChar[randomI];
    }
    return password;
}
exports.generatePassword = generatePassword;
