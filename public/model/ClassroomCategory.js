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
exports.ClassroomCategory = void 0;
const typeorm_1 = require("typeorm");
const Classroom_1 = require("./Classroom");
const Topic_1 = require("./Topic");
let ClassroomCategory = class ClassroomCategory {
};
exports.ClassroomCategory = ClassroomCategory;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], ClassroomCategory.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], ClassroomCategory.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true, select: false }),
    __metadata("design:type", Boolean)
], ClassroomCategory.prototype, "active", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Classroom_1.Classroom, classroom => classroom.category),
    __metadata("design:type", Array)
], ClassroomCategory.prototype, "classrooms", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Topic_1.Topic, topic => topic.classroomCategory),
    __metadata("design:type", Array)
], ClassroomCategory.prototype, "topics", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], ClassroomCategory.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], ClassroomCategory.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], ClassroomCategory.prototype, "createdByUser", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], ClassroomCategory.prototype, "updatedByUser", void 0);
exports.ClassroomCategory = ClassroomCategory = __decorate([
    (0, typeorm_1.Entity)()
], ClassroomCategory);
