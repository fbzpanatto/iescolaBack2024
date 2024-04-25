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
exports.LiteracyFirst = void 0;
const typeorm_1 = require("typeorm");
const LiteracyLevel_1 = require("./LiteracyLevel");
const Student_1 = require("./Student");
let LiteracyFirst = class LiteracyFirst {
};
exports.LiteracyFirst = LiteracyFirst;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], LiteracyFirst.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => Student_1.Student, student => student.literacyFirst, { nullable: false }),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", Student_1.Student)
], LiteracyFirst.prototype, "student", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => LiteracyLevel_1.LiteracyLevel, literacyLevel => literacyLevel.literacyFirsts, { nullable: true }),
    __metadata("design:type", LiteracyLevel_1.LiteracyLevel)
], LiteracyFirst.prototype, "literacyLevel", void 0);
exports.LiteracyFirst = LiteracyFirst = __decorate([
    (0, typeorm_1.Entity)()
], LiteracyFirst);
