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
exports.Transfer = void 0;
const typeorm_1 = require("typeorm");
const Teacher_1 = require("./Teacher");
const Student_1 = require("./Student");
const TransferStatus_1 = require("./TransferStatus");
const Classroom_1 = require("./Classroom");
const Year_1 = require("./Year");
let Transfer = class Transfer {
};
exports.Transfer = Transfer;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Transfer.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Teacher_1.Teacher, teacher => teacher.requester),
    __metadata("design:type", Teacher_1.Teacher)
], Transfer.prototype, "requester", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Classroom_1.Classroom, classroom => classroom.transfers),
    __metadata("design:type", Classroom_1.Classroom)
], Transfer.prototype, "requestedClassroom", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Classroom_1.Classroom, classroom => classroom.currentTransfers),
    __metadata("design:type", Classroom_1.Classroom)
], Transfer.prototype, "currentClassroom", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Teacher_1.Teacher, teacher => teacher.receiver, { nullable: true }),
    __metadata("design:type", Teacher_1.Teacher)
], Transfer.prototype, "receiver", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Student_1.Student, student => student.transfers),
    __metadata("design:type", Student_1.Student)
], Transfer.prototype, "student", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TransferStatus_1.TransferStatus, status => status.transfers),
    __metadata("design:type", TransferStatus_1.TransferStatus)
], Transfer.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: false }),
    __metadata("design:type", Date)
], Transfer.prototype, "startedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], Transfer.prototype, "endedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Year_1.Year, year => year.transfers),
    __metadata("design:type", Year_1.Year)
], Transfer.prototype, "year", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, select: false }),
    __metadata("design:type", Number)
], Transfer.prototype, "createdByUser", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, select: false }),
    __metadata("design:type", Number)
], Transfer.prototype, "updatedByUser", void 0);
exports.Transfer = Transfer = __decorate([
    (0, typeorm_1.Entity)()
], Transfer);
