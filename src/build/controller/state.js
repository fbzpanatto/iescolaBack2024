"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stateController = void 0;
const genericController_1 = require("./genericController");
const State_1 = require("../model/State");
class StateController extends genericController_1.GenericController {
    constructor() {
        super(State_1.State);
    }
}
exports.stateController = new StateController();
