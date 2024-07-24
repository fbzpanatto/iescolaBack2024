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
exports.TestClassroom = void 0;
const typeorm_1 = require("typeorm");
const Test_1 = require("./Test");
const Classroom_1 = require("./Classroom");
let TestClassroom = class TestClassroom {
};
exports.TestClassroom = TestClassroom;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", Number)
], TestClassroom.prototype, "testId", void 0);
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", Number)
], TestClassroom.prototype, "classroomId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Test_1.Test, test => test.testClassrooms),
    (0, typeorm_1.JoinColumn)({ name: "testId" }),
    __metadata("design:type", Test_1.Test)
], TestClassroom.prototype, "test", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Classroom_1.Classroom, classroom => classroom.testClassrooms),
    (0, typeorm_1.JoinColumn)({ name: "classroomId" }),
    __metadata("design:type", Classroom_1.Classroom)
], TestClassroom.prototype, "classroom", void 0);
exports.TestClassroom = TestClassroom = __decorate([
    (0, typeorm_1.Entity)('test_classroom')
], TestClassroom);
