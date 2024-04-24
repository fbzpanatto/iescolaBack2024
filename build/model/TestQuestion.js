"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestQuestion = void 0;
const typeorm_1 = require("typeorm");
const Test_1 = require("./Test");
const Question_1 = require("./Question");
const QuestionGroup_1 = require("./QuestionGroup");
const StudentQuestion_1 = require("./StudentQuestion");
let TestQuestion = class TestQuestion {
};
exports.TestQuestion = TestQuestion;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], TestQuestion.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], TestQuestion.prototype, "order", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: false }),
    __metadata("design:type", String)
], TestQuestion.prototype, "answer", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Test_1.Test, test => test.testQuestions),
    __metadata("design:type", Test_1.Test)
], TestQuestion.prototype, "test", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Question_1.Question, question => question.testQuestions, { cascade: true }),
    __metadata("design:type", Question_1.Question)
], TestQuestion.prototype, "question", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => QuestionGroup_1.QuestionGroup, questionGroup => questionGroup.testQuestions),
    __metadata("design:type", QuestionGroup_1.QuestionGroup)
], TestQuestion.prototype, "questionGroup", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => StudentQuestion_1.StudentQuestion, studentQuestion => studentQuestion.testQuestion),
    __metadata("design:type", Array)
], TestQuestion.prototype, "studentQuestions", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], TestQuestion.prototype, "active", void 0);
exports.TestQuestion = TestQuestion = __decorate([
    (0, typeorm_1.Entity)()
], TestQuestion);
