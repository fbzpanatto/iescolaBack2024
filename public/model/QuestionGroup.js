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
exports.QuestionGroup = void 0;
const typeorm_1 = require("typeorm");
const TestQuestion_1 = require("./TestQuestion");
let QuestionGroup = class QuestionGroup {
};
exports.QuestionGroup = QuestionGroup;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], QuestionGroup.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], QuestionGroup.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => TestQuestion_1.TestQuestion, testQuestion => testQuestion.questionGroup),
    __metadata("design:type", Array)
], QuestionGroup.prototype, "testQuestions", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], QuestionGroup.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], QuestionGroup.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], QuestionGroup.prototype, "createdByUser", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], QuestionGroup.prototype, "updatedByUser", void 0);
exports.QuestionGroup = QuestionGroup = __decorate([
    (0, typeorm_1.Entity)()
], QuestionGroup);
