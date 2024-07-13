"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BODY_VALIDATION_YEAR = exports.VALIDATE_YEAR = exports.BODY_VALIDATION_USER = exports.VALIDATE_USER = exports.BODY_VALIDATION_TEACHER = exports.VALIDATE_TEACHER = exports.BODY_VALIDATION_TEST = exports.VALIDATE_TEST = exports.BODY_VALIDATION_STUDENT_QUESTION = exports.VALIDATE_STUDENT_QUESTIONSTATUS = exports.BODY_VALIDATION_STUDENT_ANSWER = exports.VALIDATE_STUDENT_QUESTIONANSWER = exports.VALIDATE_YEAR_NAME = exports.VALIDATE_ID = void 0;
const express_validator_1 = require("express-validator");
const year_1 = require("../schemas/year");
const student_1 = require("../schemas/student");
const teacher_1 = require("../schemas/teacher");
const bodyValidations_1 = require("../utils/bodyValidations");
const test_1 = require("../schemas/test");
const studentQuestion_1 = require("../schemas/studentQuestion");
exports.VALIDATE_ID = (0, express_validator_1.check)('id').not().isEmpty().isNumeric();
exports.VALIDATE_YEAR_NAME = (0, express_validator_1.check)('year').not().isEmpty();
//STUDENT_QUESTIONANSWER
exports.VALIDATE_STUDENT_QUESTIONANSWER = (0, express_validator_1.checkSchema)(studentQuestion_1.STUDENT_QUESTIONSANSWER_SCHEMA);
const BODY_VALIDATION_STUDENT_ANSWER = (req, res, next) => {
    console.log('validationResult', (0, express_validator_1.validationResult)(req));
    return !(0, express_validator_1.validationResult)(req).isEmpty() ? (0, bodyValidations_1.invalidValues)(res, req) : (0, bodyValidations_1.unexpectedFn)(req, res, next, studentQuestion_1.STUDENT_QUESTIONSANSWER_SCHEMA);
};
exports.BODY_VALIDATION_STUDENT_ANSWER = BODY_VALIDATION_STUDENT_ANSWER;
//STUDENT_QUESTIONSTATUS
exports.VALIDATE_STUDENT_QUESTIONSTATUS = (0, express_validator_1.checkSchema)(studentQuestion_1.STUDENT_QUESTIONSTATUS_SCHEMA);
const BODY_VALIDATION_STUDENT_QUESTION = (req, res, next) => {
    console.log('validationResult', (0, express_validator_1.validationResult)(req));
    return !(0, express_validator_1.validationResult)(req).isEmpty() ? (0, bodyValidations_1.invalidValues)(res, req) : (0, bodyValidations_1.unexpectedFn)(req, res, next, studentQuestion_1.STUDENT_QUESTIONSTATUS_SCHEMA);
};
exports.BODY_VALIDATION_STUDENT_QUESTION = BODY_VALIDATION_STUDENT_QUESTION;
//TEST
exports.VALIDATE_TEST = (0, express_validator_1.checkSchema)(test_1.TEST_SCHEMA);
const BODY_VALIDATION_TEST = (req, res, next) => {
    console.log('validationResult', (0, express_validator_1.validationResult)(req));
    return !(0, express_validator_1.validationResult)(req).isEmpty() ? (0, bodyValidations_1.invalidValues)(res, req) : (0, bodyValidations_1.unexpectedFn)(req, res, next, test_1.TEST_SCHEMA);
};
exports.BODY_VALIDATION_TEST = BODY_VALIDATION_TEST;
//TEACHER
exports.VALIDATE_TEACHER = (0, express_validator_1.checkSchema)(teacher_1.TEACHER_SCHEMA);
const BODY_VALIDATION_TEACHER = (req, res, next) => {
    console.log('validationResult', (0, express_validator_1.validationResult)(req));
    return !(0, express_validator_1.validationResult)(req).isEmpty() ? (0, bodyValidations_1.invalidValues)(res, req) : (0, bodyValidations_1.unexpectedFn)(req, res, next, teacher_1.TEACHER_SCHEMA);
};
exports.BODY_VALIDATION_TEACHER = BODY_VALIDATION_TEACHER;
//USER
exports.VALIDATE_USER = (0, express_validator_1.checkSchema)(student_1.STUDENT_SCHEMA);
const BODY_VALIDATION_USER = (req, res, next) => {
    console.log('validationResult', (0, express_validator_1.validationResult)(req));
    return !(0, express_validator_1.validationResult)(req).isEmpty() ? (0, bodyValidations_1.invalidValues)(res, req) : (0, bodyValidations_1.unexpectedFn)(req, res, next, student_1.STUDENT_SCHEMA);
};
exports.BODY_VALIDATION_USER = BODY_VALIDATION_USER;
//YEAR
exports.VALIDATE_YEAR = (0, express_validator_1.checkSchema)(year_1.YEAR_SCHEMA);
const BODY_VALIDATION_YEAR = (req, res, next) => {
    console.log('validationResult', (0, express_validator_1.validationResult)(req));
    return !(0, express_validator_1.validationResult)(req).isEmpty() ? (0, bodyValidations_1.invalidValues)(res, req) : (0, bodyValidations_1.unexpectedFn)(req, res, next, year_1.YEAR_SCHEMA);
};
exports.BODY_VALIDATION_YEAR = BODY_VALIDATION_YEAR;
