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
exports.Topic = void 0;
const typeorm_1 = require("typeorm");
const Descriptor_1 = require("./Descriptor");
const Discipline_1 = require("./Discipline");
const ClassroomCategory_1 = require("./ClassroomCategory");
let Topic = class Topic {
};
exports.Topic = Topic;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Topic.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Topic.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Topic.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Descriptor_1.Descriptor, descriptor => descriptor.topic, { cascade: true }),
    __metadata("design:type", Array)
], Topic.prototype, "descriptors", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Discipline_1.Discipline, discipline => discipline.topics),
    __metadata("design:type", Discipline_1.Discipline)
], Topic.prototype, "discipline", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => ClassroomCategory_1.ClassroomCategory, classroomCategory => classroomCategory.topics),
    __metadata("design:type", ClassroomCategory_1.ClassroomCategory)
], Topic.prototype, "classroomCategory", void 0);
exports.Topic = Topic = __decorate([
    (0, typeorm_1.Entity)()
], Topic);
