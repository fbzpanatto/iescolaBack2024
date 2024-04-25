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
exports.LiteracyLevel = void 0;
const typeorm_1 = require("typeorm");
const Literacy_1 = require("./Literacy");
const LiteracyFirst_1 = require("./LiteracyFirst");
let LiteracyLevel = class LiteracyLevel {
};
exports.LiteracyLevel = LiteracyLevel;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], LiteracyLevel.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], LiteracyLevel.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], LiteracyLevel.prototype, "shortName", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], LiteracyLevel.prototype, "color", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Literacy_1.Literacy, literacy => literacy.literacyLevel),
    __metadata("design:type", Array)
], LiteracyLevel.prototype, "literacies", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => LiteracyFirst_1.LiteracyFirst, literacyFirst => literacyFirst.literacyLevel),
    __metadata("design:type", Array)
], LiteracyLevel.prototype, "literacyFirsts", void 0);
exports.LiteracyLevel = LiteracyLevel = __decorate([
    (0, typeorm_1.Entity)()
], LiteracyLevel);
