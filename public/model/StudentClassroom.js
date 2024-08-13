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
exports.StudentClassroom = void 0;
const typeorm_1 = require("typeorm");
const Student_1 = require("./Student");
const Classroom_1 = require("./Classroom");
const Year_1 = require("./Year");
const StudentQuestion_1 = require("./StudentQuestion");
const StudentTestStatus_1 = require("./StudentTestStatus");
const Literacy_1 = require("./Literacy");
const ReadingFluency_1 = require("./ReadingFluency");
let StudentClassroom = class StudentClassroom {
};
exports.StudentClassroom = StudentClassroom;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], StudentClassroom.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Student_1.Student, student => student.studentClassrooms, { nullable: false }),
    __metadata("design:type", Student_1.Student)
], StudentClassroom.prototype, "student", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Classroom_1.Classroom, classroom => classroom.studentClassrooms, { nullable: false }),
    __metadata("design:type", Classroom_1.Classroom)
], StudentClassroom.prototype, "classroom", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Year_1.Year, year => year.studentClassrooms),
    __metadata("design:type", Year_1.Year)
], StudentClassroom.prototype, "year", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => StudentQuestion_1.StudentQuestion, studentQuestion => studentQuestion.studentClassroom),
    __metadata("design:type", Array)
], StudentClassroom.prototype, "studentQuestions", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => StudentTestStatus_1.StudentTestStatus, studentTestStatus => studentTestStatus.studentClassroom),
    __metadata("design:type", Array)
], StudentClassroom.prototype, "studentStatus", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Literacy_1.Literacy, literacy => literacy.studentClassroom),
    __metadata("design:type", Array)
], StudentClassroom.prototype, "literacies", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ReadingFluency_1.ReadingFluency, readingFluency => readingFluency.studentClassroom),
    __metadata("design:type", Array)
], StudentClassroom.prototype, "readingFluency", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: false }),
    __metadata("design:type", Number)
], StudentClassroom.prototype, "rosterNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: false }),
    __metadata("design:type", Date)
], StudentClassroom.prototype, "startedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], StudentClassroom.prototype, "endedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, select: false }),
    __metadata("design:type", Number)
], StudentClassroom.prototype, "createdByUser", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, select: false }),
    __metadata("design:type", Number)
], StudentClassroom.prototype, "updatedByUser", void 0);
exports.StudentClassroom = StudentClassroom = __decorate([
    (0, typeorm_1.Entity)()
], StudentClassroom);
