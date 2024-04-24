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
exports.TeacherClassDiscipline = void 0;
const typeorm_1 = require("typeorm");
const Discipline_1 = require("./Discipline");
const Teacher_1 = require("./Teacher");
const Classroom_1 = require("./Classroom");
let TeacherClassDiscipline = class TeacherClassDiscipline {
};
exports.TeacherClassDiscipline = TeacherClassDiscipline;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], TeacherClassDiscipline.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Discipline_1.Discipline, discipline => discipline.teacherClassDiscipline),
    __metadata("design:type", Discipline_1.Discipline)
], TeacherClassDiscipline.prototype, "discipline", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Teacher_1.Teacher, teacher => teacher.teacherClassDiscipline),
    __metadata("design:type", Teacher_1.Teacher)
], TeacherClassDiscipline.prototype, "teacher", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Classroom_1.Classroom, classroom => classroom.teacherClassDiscipline),
    __metadata("design:type", Classroom_1.Classroom)
], TeacherClassDiscipline.prototype, "classroom", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: false }),
    __metadata("design:type", Date)
], TeacherClassDiscipline.prototype, "startedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date
    // newTeacherRelations: { id: any; person: { id: any; name: any; birth: any; }; teacherClasses: any; teacherDisciplines: any; };
    )
], TeacherClassDiscipline.prototype, "endedAt", void 0);
exports.TeacherClassDiscipline = TeacherClassDiscipline = __decorate([
    (0, typeorm_1.Entity)()
], TeacherClassDiscipline);
