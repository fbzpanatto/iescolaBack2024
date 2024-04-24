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
exports.TextGenderExamLevelGroup = void 0;
const typeorm_1 = require("typeorm");
const TextGenderExamLevel_1 = require("./TextGenderExamLevel");
const TextGenderExam_1 = require("./TextGenderExam");
let TextGenderExamLevelGroup = class TextGenderExamLevelGroup {
};
exports.TextGenderExamLevelGroup = TextGenderExamLevelGroup;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], TextGenderExamLevelGroup.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TextGenderExam_1.TextGenderExam, textGenderExam => textGenderExam.textGenderExamLevelGroups),
    __metadata("design:type", TextGenderExam_1.TextGenderExam)
], TextGenderExamLevelGroup.prototype, "textGenderExam", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => TextGenderExamLevel_1.TextGenderExamLevel, textGenderExamLevel => textGenderExamLevel.textGenderExamLevelGroups),
    __metadata("design:type", TextGenderExamLevel_1.TextGenderExamLevel)
], TextGenderExamLevelGroup.prototype, "textGenderExamLevel", void 0);
exports.TextGenderExamLevelGroup = TextGenderExamLevelGroup = __decorate([
    (0, typeorm_1.Entity)()
], TextGenderExamLevelGroup);
