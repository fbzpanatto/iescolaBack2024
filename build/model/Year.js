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
exports.Year = void 0;
const typeorm_1 = require("typeorm");
const class_validator_1 = require("class-validator");
const Period_1 = require("./Period");
const StudentClassroom_1 = require("./StudentClassroom");
const Transfer_1 = require("./Transfer");
let Year = class Year {
};
exports.Year = Year;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Year.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)("year_name_idx"),
    (0, class_validator_1.Length)(4, 4),
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Year.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Year.prototype, "active", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: false }),
    __metadata("design:type", Date)
], Year.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], Year.prototype, "endedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Period_1.Period, p => p.year),
    __metadata("design:type", Array)
], Year.prototype, "periods", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => StudentClassroom_1.StudentClassroom, sc => sc.year),
    __metadata("design:type", Array)
], Year.prototype, "studentClassrooms", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Transfer_1.Transfer, t => t.year),
    __metadata("design:type", Array)
], Year.prototype, "transfers", void 0);
exports.Year = Year = __decorate([
    (0, typeorm_1.Entity)()
], Year);
