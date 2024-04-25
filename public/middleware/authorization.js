"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
exports.default = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: 'Credenciais Inválidas' });
        }
        const token = authHeader.split(' ')[1];
        req.body.user = jsonwebtoken_1.default.verify(token, 'SECRET');
        next();
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
