"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEACHER_SCHEMA = exports.CATEGORY_SCHEMA = void 0;
const user_1 = require("./user");
exports.CATEGORY_SCHEMA = {
    'category.id': {
        optional: true,
        escape: true,
        isInt: true,
        toInt: true
    },
    'category.name': {
        optional: true,
        escape: true
    },
    'category.active': {
        optional: true,
        escape: true,
        isBoolean: true,
        toBoolean: true,
    }
};
exports.TEACHER_SCHEMA = Object.assign(Object.assign({ birth: {
        optional: true,
        escape: true,
        isString: true,
    }, classesName: {
        optional: true,
        escape: true
    }, disciplinesName: {
        optional: true,
        escape: true
    }, email: {
        optional: true,
        escape: true
    }, name: {
        optional: true,
        escape: true,
        isLength: { options: { min: 3, max: 100 } }
    }, register: {
        optional: true,
        escape: true
    }, teacherClasses: {
        optional: true,
        escape: true,
        custom: {
            options: (value) => {
                if (!value || !Array.isArray(value)) {
                    throw new Error("disabilities must be an array");
                }
                value = value.map(element => parseInt(element));
                if (!value.every(Number.isInteger)) {
                    throw new Error("disabilities must be an array of integers");
                }
                return true;
            },
        },
    }, teacherDisciplines: {
        optional: true,
        escape: true,
        custom: {
            options: (value) => {
                if (!value || !Array.isArray(value)) {
                    throw new Error("disabilities must be an array");
                }
                value = value.map(element => parseInt(element));
                if (!value.every(Number.isInteger)) {
                    throw new Error("disabilities must be an array of integers");
                }
                return true;
            },
        },
    }, category: { optional: true }, user: { optional: true } }, exports.CATEGORY_SCHEMA), user_1.USER_SCHEMA);
