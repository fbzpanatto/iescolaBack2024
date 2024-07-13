"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = __importDefault(require("../utils/permissions"));
exports.default = (req, res, next) => {
    try {
        const { user } = req.body;
        const entity = req.baseUrl.split('/')[1].split('-').join('');
        const method = req.method;
        const condition = (0, permissions_1.default)(user.category, entity, method);
        if (!condition) {
            return res.status(403).json({ status: 403, message: 'Você não tem permissão para acessar ou modificar este recurso.' });
        }
        next();
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
