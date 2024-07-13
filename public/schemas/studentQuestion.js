"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STUDENT_QUESTIONSTATUS_SCHEMA = exports.STUDENT_QUESTIONSANSWER_SCHEMA = void 0;
const user_1 = require("./user");
exports.STUDENT_QUESTIONSANSWER_SCHEMA = Object.assign({ id: {
        exists: true,
        escape: true,
        isInt: true,
        toInt: true
    }, answer: {
        exists: true,
        escape: true,
        isLength: { options: { max: 2 } }
    }, studentClassroom: { exists: true }, testQuestion: { exists: true }, 'studentClassroom.id': {
        exists: true,
        escape: true,
        isInt: true,
        toInt: true
    }, 'testQuestion.id': {
        exists: true,
        escape: true,
        isInt: true,
        toInt: true
    }, user: { optional: true } }, user_1.USER_SCHEMA);
exports.STUDENT_QUESTIONSTATUS_SCHEMA = Object.assign({ id: {
        optional: true,
        escape: true,
        isInt: true,
        toInt: true
    }, active: {
        optional: true,
        escape: true,
        isBoolean: true,
        toBoolean: true,
    }, observation: {
        optional: true,
        escape: true
    }, test: { optional: true }, 'test.id': {
        optional: true,
        escape: true,
        isInt: true,
        toInt: true
    }, 'test.name': {
        optional: true,
        escape: true
    }, 'test.createdAt': {
        optional: true,
        escape: true
    }, user: { optional: true } }, user_1.USER_SCHEMA);
