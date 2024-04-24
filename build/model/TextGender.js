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
exports.TextGender = void 0;
const typeorm_1 = require("typeorm");
const TextGenderGrade_1 = require("./TextGenderGrade");
const TextGenderClassroom_1 = require("./TextGenderClassroom");
let TextGender = class TextGender {
};
exports.TextGender = TextGender;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], TextGender.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], TextGender.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => TextGenderGrade_1.TextGenderGrade, textGenderGrade => textGenderGrade.textGender),
    __metadata("design:type", Array)
], TextGender.prototype, "textGenderGrades", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => TextGenderClassroom_1.TextGenderClassroom, textGenderClassroom => textGenderClassroom.textGender),
    __metadata("design:type", Array)
], TextGender.prototype, "textGenderClassrooms", void 0);
exports.TextGender = TextGender = __decorate([
    (0, typeorm_1.Entity)()
], TextGender);
