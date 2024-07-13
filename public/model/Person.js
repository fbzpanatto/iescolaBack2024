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
exports.Person = void 0;
const typeorm_1 = require("typeorm");
const class_validator_1 = require("class-validator");
const Student_1 = require("./Student");
const PersonCategory_1 = require("./PersonCategory");
const Teacher_1 = require("./Teacher");
const User_1 = require("./User");
const Test_1 = require("./Test");
const Question_1 = require("./Question");
let Person = class Person {
};
exports.Person = Person;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Person.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    (0, class_validator_1.Length)(3, 100, { message: "Name must be between 3 and 100 characters." }),
    __metadata("design:type", String)
], Person.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], Person.prototype, "birth", void 0);
__decorate([
    (0, typeorm_1.OneToOne)((type) => Student_1.Student, (s) => s.person),
    __metadata("design:type", Student_1.Student)
], Person.prototype, "student", void 0);
__decorate([
    (0, typeorm_1.OneToOne)((type) => Teacher_1.Teacher, (s) => s.person),
    __metadata("design:type", Teacher_1.Teacher)
], Person.prototype, "teacher", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Test_1.Test, (test) => test.person),
    __metadata("design:type", Array)
], Person.prototype, "tests", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Question_1.Question, (question) => question.person),
    __metadata("design:type", Array)
], Person.prototype, "questions", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)((type) => PersonCategory_1.PersonCategory, (c) => c.persons),
    __metadata("design:type", PersonCategory_1.PersonCategory)
], Person.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.OneToOne)((type) => User_1.User, (u) => u.person),
    __metadata("design:type", User_1.User)
], Person.prototype, "user", void 0);
exports.Person = Person = __decorate([
    (0, typeorm_1.Entity)()
], Person);
