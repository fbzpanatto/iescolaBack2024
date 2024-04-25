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
exports.StudentQuestion = void 0;
const typeorm_1 = require("typeorm");
const TestQuestion_1 = require("./TestQuestion");
const StudentClassroom_1 = require("./StudentClassroom");
let StudentQuestion = class StudentQuestion {
};
exports.StudentQuestion = StudentQuestion;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], StudentQuestion.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => StudentClassroom_1.StudentClassroom, studentClassroom => studentClassroom.studentQuestions, { nullable: false }),
    __metadata("design:type", StudentClassroom_1.StudentClassroom)
], StudentQuestion.prototype, "studentClassroom", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TestQuestion_1.TestQuestion, testQuestion => testQuestion.studentQuestions, { nullable: false }),
    __metadata("design:type", TestQuestion_1.TestQuestion)
], StudentQuestion.prototype, "testQuestion", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], StudentQuestion.prototype, "answer", void 0);
exports.StudentQuestion = StudentQuestion = __decorate([
    (0, typeorm_1.Entity)()
], StudentQuestion);
