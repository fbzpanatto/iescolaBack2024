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
exports.Literacy = void 0;
const typeorm_1 = require("typeorm");
const LiteracyLevel_1 = require("./LiteracyLevel");
const LiteracyTier_1 = require("./LiteracyTier");
const StudentClassroom_1 = require("./StudentClassroom");
let Literacy = class Literacy {
};
exports.Literacy = Literacy;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Literacy.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => StudentClassroom_1.StudentClassroom, studentClassroom => studentClassroom.literacies),
    __metadata("design:type", StudentClassroom_1.StudentClassroom)
], Literacy.prototype, "studentClassroom", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => LiteracyLevel_1.LiteracyLevel, literacyLevel => literacyLevel.literacies, { nullable: true }),
    __metadata("design:type", LiteracyLevel_1.LiteracyLevel)
], Literacy.prototype, "literacyLevel", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => LiteracyTier_1.LiteracyTier, literacyTier => literacyTier.literacies, { nullable: false }),
    __metadata("design:type", LiteracyTier_1.LiteracyTier)
], Literacy.prototype, "literacyTier", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: false, default: true }),
    __metadata("design:type", Boolean)
], Literacy.prototype, "toRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Literacy.prototype, "observation", void 0);
exports.Literacy = Literacy = __decorate([
    (0, typeorm_1.Entity)()
], Literacy);
