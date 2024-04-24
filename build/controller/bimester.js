"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bimesterController = void 0;
const genericController_1 = require("./genericController");
const Bimester_1 = require("../model/Bimester");
class BimesterController extends genericController_1.GenericController {
    constructor() {
        super(Bimester_1.Bimester);
    }
}
exports.bimesterController = new BimesterController();
