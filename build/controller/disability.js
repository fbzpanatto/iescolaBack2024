"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disabilityController = void 0;
const genericController_1 = require("./genericController");
const Disability_1 = require("../model/Disability");
class DisabilityController extends genericController_1.GenericController {
    constructor() {
        super(Disability_1.Disability);
    }
}
exports.disabilityController = new DisabilityController();
