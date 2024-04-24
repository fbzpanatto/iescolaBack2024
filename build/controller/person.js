"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.personController = void 0;
const genericController_1 = require("./genericController");
const Person_1 = require("../model/Person");
class PersonController extends genericController_1.GenericController {
    constructor() {
        super(Person_1.Person);
    }
}
exports.personController = new PersonController();
