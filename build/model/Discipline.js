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
exports.Discipline = void 0;
const typeorm_1 = require("typeorm");
const TeacherClassDiscipline_1 = require("./TeacherClassDiscipline");
const Topic_1 = require("./Topic");
const Test_1 = require("./Test");
let Discipline = class Discipline {
};
exports.Discipline = Discipline;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Discipline.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Discipline.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ select: false }),
    __metadata("design:type", String)
], Discipline.prototype, "shortName", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true, select: false }),
    __metadata("design:type", Boolean)
], Discipline.prototype, "active", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => TeacherClassDiscipline_1.TeacherClassDiscipline, teacherClassDiscipline => teacherClassDiscipline.discipline),
    __metadata("design:type", Array)
], Discipline.prototype, "teacherClassDiscipline", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Test_1.Test, test => test.discipline),
    __metadata("design:type", Array)
], Discipline.prototype, "tests", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Topic_1.Topic, topic => topic.discipline),
    __metadata("design:type", Array)
], Discipline.prototype, "topics", void 0);
exports.Discipline = Discipline = __decorate([
    (0, typeorm_1.Entity)()
], Discipline);
