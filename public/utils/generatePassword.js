"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePassword = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
function generatePassword() {
    const lowerLetters = "abcdefghijklmnopqrstuvwxyz";
    const upperLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const allChar = lowerLetters + upperLetters + numbers;
    let password = "";
    for (let i = 0; i < 8; i++) {
        const index = Math.floor(Math.random() * allChar.length);
        password += allChar[index];
    }
    const hashedPassword = bcrypt_1.default.hashSync(password, 10);
    return { password, hashedPassword };
}
exports.generatePassword = generatePassword;
