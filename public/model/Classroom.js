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
exports.Classroom = void 0;
const typeorm_1 = require("typeorm");
const School_1 = require("./School");
const ClassroomCategory_1 = require("./ClassroomCategory");
const TeacherClassDiscipline_1 = require("./TeacherClassDiscipline");
const StudentClassroom_1 = require("./StudentClassroom");
const Transfer_1 = require("./Transfer");
const TestClassroom_1 = require("./TestClassroom");
let Classroom = class Classroom {
};
exports.Classroom = Classroom;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Classroom.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Classroom.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Classroom.prototype, "shortName", void 0);
__decorate([
    (0, typeorm_1.Column)({ select: false }),
    __metadata("design:type", Boolean)
], Classroom.prototype, "active", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => School_1.School, school => school.classrooms, { cascade: true }),
    __metadata("design:type", School_1.School)
], Classroom.prototype, "school", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => ClassroomCategory_1.ClassroomCategory, category => category.classrooms),
    __metadata("design:type", ClassroomCategory_1.ClassroomCategory)
], Classroom.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => TeacherClassDiscipline_1.TeacherClassDiscipline, teacherClassDiscipline => teacherClassDiscipline.classroom),
    __metadata("design:type", Array)
], Classroom.prototype, "teacherClassDiscipline", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => StudentClassroom_1.StudentClassroom, studentClassroom => studentClassroom.classroom),
    __metadata("design:type", Array)
], Classroom.prototype, "studentClassrooms", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => TestClassroom_1.TestClassroom, testClassroom => testClassroom.classroom),
    __metadata("design:type", Array)
], Classroom.prototype, "testClassrooms", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Transfer_1.Transfer, transfer => transfer.requestedClassroom),
    __metadata("design:type", Array)
], Classroom.prototype, "transfers", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Transfer_1.Transfer, transfer => transfer.currentClassroom),
    __metadata("design:type", Array)
], Classroom.prototype, "currentTransfers", void 0);
exports.Classroom = Classroom = __decorate([
    (0, typeorm_1.Entity)()
], Classroom);
