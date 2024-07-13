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
exports.StudentDisability = void 0;
const typeorm_1 = require("typeorm");
const Student_1 = require("./Student");
const Disability_1 = require("./Disability");
let StudentDisability = class StudentDisability {
};
exports.StudentDisability = StudentDisability;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], StudentDisability.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Student_1.Student, student => student.studentDisabilities, { nullable: false }),
    __metadata("design:type", Student_1.Student)
], StudentDisability.prototype, "student", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Disability_1.Disability, disability => disability.studentDisabilities, { nullable: false }),
    __metadata("design:type", Disability_1.Disability)
], StudentDisability.prototype, "disability", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Date)
], StudentDisability.prototype, "startedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], StudentDisability.prototype, "endedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, select: false }),
    __metadata("design:type", Number)
], StudentDisability.prototype, "createdByUser", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, select: false }),
    __metadata("design:type", Number)
], StudentDisability.prototype, "updatedByUser", void 0);
exports.StudentDisability = StudentDisability = __decorate([
    (0, typeorm_1.Entity)()
], StudentDisability);
