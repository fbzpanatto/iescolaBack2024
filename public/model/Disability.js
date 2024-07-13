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
exports.Disability = void 0;
const typeorm_1 = require("typeorm");
const StudentDisability_1 = require("./StudentDisability");
let Disability = class Disability {
};
exports.Disability = Disability;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Disability.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, length: 100 }),
    __metadata("design:type", String)
], Disability.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => StudentDisability_1.StudentDisability, sd => sd.disability),
    __metadata("design:type", Array)
], Disability.prototype, "studentDisabilities", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, select: false }),
    __metadata("design:type", Date)
], Disability.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, select: false }),
    __metadata("design:type", Date)
], Disability.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, select: false }),
    __metadata("design:type", Number)
], Disability.prototype, "createdByUser", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, select: false }),
    __metadata("design:type", Number)
], Disability.prototype, "updatedByUser", void 0);
exports.Disability = Disability = __decorate([
    (0, typeorm_1.Entity)()
], Disability);
