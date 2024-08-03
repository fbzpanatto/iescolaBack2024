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
exports.Student = void 0;
const typeorm_1 = require("typeorm");
const Person_1 = require("./Person");
const StudentDisability_1 = require("./StudentDisability");
const StudentClassroom_1 = require("./StudentClassroom");
const State_1 = require("./State");
const Transfer_1 = require("./Transfer");
const LiteracyFirst_1 = require("./LiteracyFirst");
// @Index(["ra", "dv"], { unique: true })
let Student = class Student {
};
exports.Student = Student;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Student.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => Person_1.Person, person => person.student, { cascade: true }),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", Person_1.Person)
], Student.prototype, "person", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: false }),
    __metadata("design:type", String)
], Student.prototype, "ra", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 1 }),
    __metadata("design:type", String)
], Student.prototype, "dv", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => State_1.State, state => state.students),
    __metadata("design:type", State_1.State)
], Student.prototype, "state", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Student.prototype, "observationOne", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Student.prototype, "observationTwo", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => StudentDisability_1.StudentDisability, sd => sd.student),
    __metadata("design:type", Array)
], Student.prototype, "studentDisabilities", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => StudentClassroom_1.StudentClassroom, sc => sc.student),
    __metadata("design:type", Array)
], Student.prototype, "studentClassrooms", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Transfer_1.Transfer, transfer => transfer.student),
    __metadata("design:type", Array)
], Student.prototype, "transfers", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, default: true }),
    __metadata("design:type", Boolean)
], Student.prototype, "active", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => LiteracyFirst_1.LiteracyFirst, literacyfirst => literacyfirst.student, { cascade: true }),
    __metadata("design:type", LiteracyFirst_1.LiteracyFirst)
], Student.prototype, "literacyFirst", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, select: false }),
    __metadata("design:type", Date)
], Student.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, select: false }),
    __metadata("design:type", Date)
], Student.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, select: false }),
    __metadata("design:type", Number)
], Student.prototype, "createdByUser", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, select: false }),
    __metadata("design:type", Number)
], Student.prototype, "updatedByUser", void 0);
exports.Student = Student = __decorate([
    (0, typeorm_1.Entity)()
], Student);
