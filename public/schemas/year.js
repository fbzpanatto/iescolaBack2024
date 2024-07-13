"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.YEAR_SCHEMA = void 0;
const user_1 = require("./user");
exports.YEAR_SCHEMA = Object.assign({ active: {
        optional: true,
        escape: true,
        isBoolean: true,
        toBoolean: true,
    }, name: {
        optional: true,
        escape: true,
        isInt: true,
        toInt: true,
    }, createdAt: {
        optional: true,
        escape: true,
        custom: {
            options: (value, _) => {
                if (typeof value === "string" || value === null) {
                    return true;
                }
                throw new Error("createdAt must be a string or null");
            }
        }
    }, endedAt: {
        optional: true,
        escape: true,
        custom: {
            options: (value, _) => {
                if (typeof value === "string" || value === null) {
                    return true;
                }
                throw new Error("createdAt must be a string or null");
            }
        }
    }, user: { exists: true } }, user_1.USER_SCHEMA);
