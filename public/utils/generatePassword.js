"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePassword = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
function generatePassword(userPass) {
    if (!userPass) {
        const lowerLetters = "abcdefghijklmnopqrstuvwxyz";
        const upperLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const numbers = "0123456789";
        const allChar = lowerLetters + upperLetters + numbers;
        let password = "";
        password += lowerLetters[Math.floor(Math.random() * lowerLetters.length)];
        password += upperLetters[Math.floor(Math.random() * upperLetters.length)];
        password += numbers[Math.floor(Math.random() * numbers.length)];
        for (let i = 3; i < 8; i++) {
            const index = Math.floor(Math.random() * allChar.length);
            password += allChar[index];
        }
        password = password.split('').sort(() => 0.5 - Math.random()).join('');
        const hashedPassword = bcrypt_1.default.hashSync(password, 10);
        console.log('Password: ', { password });
        return { password, hashedPassword };
    }
    const hashedPassword = bcrypt_1.default.hashSync(userPass, 10);
    return { password: userPass, hashedPassword };
}
exports.generatePassword = generatePassword;
