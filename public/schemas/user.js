"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.USER_SCHEMA = void 0;
exports.USER_SCHEMA = {
    'user.user': {
        exists: true,
        escape: true,
        isInt: true,
        toInt: true
    },
    'user.email': {
        exists: true,
        escape: true,
        isString: true
    },
    'user.category': {
        exists: true,
        escape: true,
        isInt: true,
        toInt: true
    },
    'user.iat': {
        exists: true,
        escape: true,
        isInt: true,
        toInt: true
    },
    'user.exp': {
        exists: true,
        escape: true,
        isInt: true,
        toInt: true
    }
};
