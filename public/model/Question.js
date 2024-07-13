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
exports.Question = void 0;
const typeorm_1 = require("typeorm");
const Descriptor_1 = require("./Descriptor");
const TestQuestion_1 = require("./TestQuestion");
const Person_1 = require("./Person");
let Question = class Question {
};
exports.Question = Question;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Question.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Question.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Descriptor_1.Descriptor, descriptor => descriptor.questions, { nullable: true }),
    __metadata("design:type", Descriptor_1.Descriptor)
], Question.prototype, "descriptor", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => TestQuestion_1.TestQuestion, testQuestion => testQuestion.question),
    __metadata("design:type", Array)
], Question.prototype, "testQuestions", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Person_1.Person, person => person.tests, { nullable: true }),
    __metadata("design:type", Person_1.Person)
], Question.prototype, "person", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Question.prototype, "active", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], Question.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], Question.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Question.prototype, "createdByUser", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Question.prototype, "updatedByUser", void 0);
exports.Question = Question = __decorate([
    (0, typeorm_1.Entity)()
], Question);
