"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.questionGroupController = void 0;
const genericController_1 = require("./genericController");
const QuestionGroup_1 = require("../model/QuestionGroup");
class QuestionGroupController extends genericController_1.GenericController {
    constructor() {
        super(QuestionGroup_1.QuestionGroup);
    }
}
exports.questionGroupController = new QuestionGroupController();
