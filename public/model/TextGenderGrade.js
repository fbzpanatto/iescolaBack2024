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
exports.TextGenderGrade = void 0;
const typeorm_1 = require("typeorm");
const StudentClassroom_1 = require("./StudentClassroom");
const TextGender_1 = require("./TextGender");
const TextGenderExam_1 = require("./TextGenderExam");
const TextGenderExamTier_1 = require("./TextGenderExamTier");
const TextGenderExamLevel_1 = require("./TextGenderExamLevel");
let TextGenderGrade = class TextGenderGrade {
};
exports.TextGenderGrade = TextGenderGrade;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], TextGenderGrade.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => StudentClassroom_1.StudentClassroom, studentClassroom => studentClassroom.textGenderGrades),
    __metadata("design:type", StudentClassroom_1.StudentClassroom)
], TextGenderGrade.prototype, "studentClassroom", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TextGender_1.TextGender, textGender => textGender.textGenderGrades),
    __metadata("design:type", TextGender_1.TextGender)
], TextGenderGrade.prototype, "textGender", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TextGenderExam_1.TextGenderExam, textGenderExam => textGenderExam.textGenderGrades),
    __metadata("design:type", TextGenderExam_1.TextGenderExam)
], TextGenderGrade.prototype, "textGenderExam", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TextGenderExamTier_1.TextGenderExamTier, textGenderExamTier => textGenderExamTier.textGenderGrades),
    __metadata("design:type", TextGenderExamTier_1.TextGenderExamTier)
], TextGenderGrade.prototype, "textGenderExamTier", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TextGenderExamLevel_1.TextGenderExamLevel, textGenderExamLevel => textGenderExamLevel.textGenderGrades, { nullable: true }),
    __metadata("design:type", TextGenderExamLevel_1.TextGenderExamLevel)
], TextGenderGrade.prototype, "textGenderExamLevel", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: false, default: true }),
    __metadata("design:type", Boolean)
], TextGenderGrade.prototype, "toRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], TextGenderGrade.prototype, "observation", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, select: false }),
    __metadata("design:type", Date)
], TextGenderGrade.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, select: false }),
    __metadata("design:type", Date)
], TextGenderGrade.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, select: false }),
    __metadata("design:type", Number)
], TextGenderGrade.prototype, "createdByUser", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, select: false }),
    __metadata("design:type", Number)
], TextGenderGrade.prototype, "updatedByUser", void 0);
exports.TextGenderGrade = TextGenderGrade = __decorate([
    (0, typeorm_1.Entity)()
], TextGenderGrade);
