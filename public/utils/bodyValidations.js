"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unexpectedFn = exports.invalidValues = void 0;
const response_1 = require("./response");
const invalidValues = (res, req) => {
    const msg = 'Valor(es) inválido(s) no corpo da requisição.';
    return res.status(400).json((0, response_1.ojbRes)(400, msg));
};
exports.invalidValues = invalidValues;
const unexpectedFn = (req, res, next, schema) => {
    const msg = 'Campo(s) inesperado(s) no corpo da requisição.';
    const unexpectedFields = Object.keys(req.body).filter(key => !schema.hasOwnProperty(key));
    console.log('unexpectedFields', unexpectedFields);
    return unexpectedFields.length ? res.status(400).json((0, response_1.ojbRes)(400, msg)) : next();
};
exports.unexpectedFn = unexpectedFn;
