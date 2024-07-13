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
exports.StudentTestStatus = void 0;
const typeorm_1 = require("typeorm");
const StudentClassroom_1 = require("./StudentClassroom");
const Test_1 = require("./Test");
let StudentTestStatus = class StudentTestStatus {
};
exports.StudentTestStatus = StudentTestStatus;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], StudentTestStatus.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => StudentClassroom_1.StudentClassroom, studentClassroom => studentClassroom.studentStatus, { nullable: true }),
    __metadata("design:type", StudentClassroom_1.StudentClassroom)
], StudentTestStatus.prototype, "studentClassroom", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Test_1.Test, test => test.studentStatus, { nullable: true }),
    __metadata("design:type", Test_1.Test)
], StudentTestStatus.prototype, "test", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Boolean)
], StudentTestStatus.prototype, "active", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], StudentTestStatus.prototype, "observation", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, select: false }),
    __metadata("design:type", Date)
], StudentTestStatus.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, select: false }),
    __metadata("design:type", Date)
], StudentTestStatus.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, select: false }),
    __metadata("design:type", Number)
], StudentTestStatus.prototype, "createdByUser", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, select: false }),
    __metadata("design:type", Number)
], StudentTestStatus.prototype, "updatedByUser", void 0);
exports.StudentTestStatus = StudentTestStatus = __decorate([
    (0, typeorm_1.Entity)()
], StudentTestStatus);
