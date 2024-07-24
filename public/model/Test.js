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
exports.Test = void 0;
const typeorm_1 = require("typeorm");
const Period_1 = require("./Period");
const Discipline_1 = require("./Discipline");
const Classroom_1 = require("./Classroom");
const TestCategory_1 = require("./TestCategory");
const Person_1 = require("./Person");
const StudentTestStatus_1 = require("./StudentTestStatus");
const TestClassroom_1 = require("./TestClassroom");
let Test = class Test {
};
exports.Test = Test;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Test.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Test.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Discipline_1.Discipline, discipline => discipline.tests),
    __metadata("design:type", Discipline_1.Discipline)
], Test.prototype, "discipline", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Period_1.Period, period => period.tests),
    __metadata("design:type", Period_1.Period)
], Test.prototype, "period", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TestCategory_1.TestCategory, category => category.tests),
    __metadata("design:type", TestCategory_1.TestCategory)
], Test.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Person_1.Person, person => person.tests),
    __metadata("design:type", Person_1.Person)
], Test.prototype, "person", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Test, test => test.testQuestions),
    __metadata("design:type", Array)
], Test.prototype, "testQuestions", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => StudentTestStatus_1.StudentTestStatus, studentTestStatus => studentTestStatus.test),
    __metadata("design:type", Array)
], Test.prototype, "studentStatus", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => TestClassroom_1.TestClassroom, testClassroom => testClassroom.test),
    __metadata("design:type", Array)
], Test.prototype, "testClassrooms", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => Classroom_1.Classroom, { cascade: true }),
    (0, typeorm_1.JoinTable)({ name: "test_classroom" }),
    __metadata("design:type", Array)
], Test.prototype, "classrooms", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], Test.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], Test.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Test.prototype, "createdByUser", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Test.prototype, "updatedByUser", void 0);
exports.Test = Test = __decorate([
    (0, typeorm_1.Entity)()
], Test);
