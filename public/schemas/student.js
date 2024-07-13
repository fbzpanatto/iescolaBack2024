"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STUDENT_SCHEMA = void 0;
const user_1 = require("./user");
exports.STUDENT_SCHEMA = Object.assign({ birth: {
        optional: true,
        escape: true,
        isString: true,
    }, classroom: {
        optional: true,
        escape: true,
        isInt: true,
        toInt: true,
    }, classroomName: {
        optional: true,
        escape: true,
        isString: true,
    }, currentStudentClassroomId: {
        optional: true,
        escape: true
    }, disabilities: {
        optional: true,
        escape: true,
        custom: {
            options: (value) => {
                if (!value || !Array.isArray(value)) {
                    throw new Error("disabilities must be an array");
                }
                // Apply toInt() to each element to convert to integer
                value = value.map(element => parseInt(element));
                if (!value.every(Number.isInteger)) {
                    throw new Error("disabilities must be an array of integers");
                }
                return true;
            },
        },
    }, disabilitiesName: {
        optional: true,
        escape: true,
        isString: true,
    }, dv: {
        optional: true,
        escape: true,
        isString: true,
    }, name: {
        optional: true,
        escape: true,
        isString: true,
    }, observationOne: {
        optional: true,
        escape: true,
        isString: true,
    }, observationTwo: {
        optional: true,
        escape: true,
        isString: true,
    }, ra: {
        optional: true,
        escape: true,
        isString: true,
    }, rosterNumber: {
        optional: true,
        escape: true,
        isInt: true,
        toInt: true,
    }, state: {
        optional: true,
        escape: true,
        isInt: true,
        toInt: true,
    }, user: { exists: true } }, user_1.USER_SCHEMA);
