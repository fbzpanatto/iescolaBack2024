"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schoolController = void 0;
const genericController_1 = require("./genericController");
const School_1 = require("../model/School");
class SchoolController extends genericController_1.GenericController {
    constructor() { super(School_1.School); }
}
exports.schoolController = new SchoolController();
