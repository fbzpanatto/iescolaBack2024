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
exports.Teacher = void 0;
const typeorm_1 = require("typeorm");
const Person_1 = require("./Person");
const TeacherClassDiscipline_1 = require("./TeacherClassDiscipline");
const Transfer_1 = require("./Transfer");
let Teacher = class Teacher {
};
exports.Teacher = Teacher;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Teacher.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Teacher.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Teacher.prototype, "register", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => Person_1.Person, person => person.teacher, { cascade: true }),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", Person_1.Person)
], Teacher.prototype, "person", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => TeacherClassDiscipline_1.TeacherClassDiscipline, teacherClassDiscipline => teacherClassDiscipline.teacher),
    __metadata("design:type", Array)
], Teacher.prototype, "teacherClassDiscipline", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Transfer_1.Transfer, transfer => transfer.requester),
    __metadata("design:type", Array)
], Teacher.prototype, "requester", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Transfer_1.Transfer, transfer => transfer.receiver),
    __metadata("design:type", Array)
], Teacher.prototype, "receiver", void 0);
exports.Teacher = Teacher = __decorate([
    (0, typeorm_1.Entity)()
], Teacher);
