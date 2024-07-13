"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitialConfigsRouter = void 0;
const express_1 = require("express");
const initialConfigs_1 = require("../controller/initialConfigs");
const Year_1 = require("../model/Year");
const Bimester_1 = require("../model/Bimester");
const School_1 = require("../model/School");
const Classroom_1 = require("../model/Classroom");
const ClassroomCategory_1 = require("../model/ClassroomCategory");
const Period_1 = require("../model/Period");
const bimester_1 = require("../mock/bimester");
const disability_1 = require("../mock/disability");
const classroomCategory_1 = require("../mock/classroomCategory");
const school_1 = require("../mock/school");
const classroom_1 = require("../mock/classroom");
const discipline_1 = require("../mock/discipline");
const Discipline_1 = require("../model/Discipline");
const PersonCategory_1 = require("../model/PersonCategory");
const personCategory_1 = require("../mock/personCategory");
const state_1 = require("../mock/state");
const State_1 = require("../model/State");
const Disability_1 = require("../model/Disability");
const TransferStatus_1 = require("../model/TransferStatus");
const transferStatus_1 = require("../mock/transferStatus");
const User_1 = require("../model/User");
const Person_1 = require("../model/Person");
const TestCategory_1 = require("../model/TestCategory");
const testCategory_1 = require("../mock/testCategory");
const questionGroup_1 = require("../mock/questionGroup");
const QuestionGroup_1 = require("../model/QuestionGroup");
const Topic_1 = require("../model/Topic");
const topic_1 = require("../mock/topic");
const descriptor_1 = require("../mock/descriptor");
const Descriptor_1 = require("../model/Descriptor");
const Teacher_1 = require("../model/Teacher");
const personCategories_1 = require("../utils/personCategories");
const literacyTier_1 = require("../mock/literacyTier");
const LiteracyTier_1 = require("../model/LiteracyTier");
const LiteracyLevel_1 = require("../model/LiteracyLevel");
const literacyLevel_1 = require("../mock/literacyLevel");
const TextGender_1 = require("../model/TextGender");
const TextGenderExam_1 = require("../model/TextGenderExam");
const textGender_1 = require("../mock/textGender");
const textGenderExam_1 = require("../mock/textGenderExam");
const TextGenderExamTier_1 = require("../model/TextGenderExamTier");
const TextGenderExamLevel_1 = require("../model/TextGenderExamLevel");
const textGenderExamTier_1 = require("../mock/textGenderExamTier");
const textGenderExamLevel_1 = require("../mock/textGenderExamLevel");
const TextGenderClassroom_1 = require("../model/TextGenderClassroom");
const textGenderClassroom_1 = require("../mock/textGenderClassroom");
const TextGenderExamLevelGroup_1 = require("../model/TextGenderExamLevelGroup");
const textGenderExamLevelGroup_1 = require("../mock/textGenderExamLevelGroup");
exports.InitialConfigsRouter = (0, express_1.Router)();
function createClassroom(school, classroom) {
    return __awaiter(this, void 0, void 0, function* () {
        const classCategorySource = new initialConfigs_1.dataSourceController(ClassroomCategory_1.ClassroomCategory).entity;
        const classSource = new initialConfigs_1.dataSourceController(Classroom_1.Classroom).entity;
        const classCategory = yield classCategorySource.findOneBy({ id: classroom.category });
        const newClass = new Classroom_1.Classroom();
        newClass.name = classroom.name;
        newClass.category = classCategory;
        newClass.school = school;
        newClass.active = classroom.active;
        newClass.shortName = classroom.shortName;
        yield classSource.save(newClass);
    });
}
function createAdminUser(person) {
    return __awaiter(this, void 0, void 0, function* () {
        const userSource = new initialConfigs_1.dataSourceController(User_1.User).entity;
        const user = new User_1.User();
        user.username = 'admin';
        user.email = 'adminiescola@iescola.com.br';
        user.password = '#Fnp181292dc2w!';
        user.person = person;
        yield userSource.save(user);
    });
}
function createAdminPerson() {
    return __awaiter(this, void 0, void 0, function* () {
        const adminCategorySource = new initialConfigs_1.dataSourceController(PersonCategory_1.PersonCategory).entity;
        const adminCategory = yield adminCategorySource.findOneBy({ id: personCategories_1.pc.ADMN });
        const personSource = new initialConfigs_1.dataSourceController(Person_1.Person).entity;
        const person = new Person_1.Person();
        person.name = 'Administrador';
        person.birth = new Date();
        person.category = adminCategory;
        const result = yield personSource.save(person);
        const teacherSource = new initialConfigs_1.dataSourceController(Teacher_1.Teacher).entity;
        const teacher = new Teacher_1.Teacher();
        teacher.person = result;
        teacher.email = 'adminiescola@iescola.com.br';
        teacher.createdAt = new Date();
        teacher.updatedAt = new Date();
        teacher.createdByUser = 1;
        teacher.updatedByUser = 1;
        teacher.register = 'AdmR';
        yield teacherSource.save(teacher);
        yield createAdminUser(result);
    });
}
exports.InitialConfigsRouter.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const personCategorySource = new initialConfigs_1.dataSourceController(PersonCategory_1.PersonCategory).entity;
        const bimesterSource = new initialConfigs_1.dataSourceController(Bimester_1.Bimester).entity;
        const transferStatusSource = new initialConfigs_1.dataSourceController(TransferStatus_1.TransferStatus).entity;
        const schoolSource = new initialConfigs_1.dataSourceController(School_1.School).entity;
        const periodSource = new initialConfigs_1.dataSourceController(Period_1.Period).entity;
        const classCategorySource = new initialConfigs_1.dataSourceController(ClassroomCategory_1.ClassroomCategory).entity;
        const disciplineSource = new initialConfigs_1.dataSourceController(Discipline_1.Discipline).entity;
        const stateSource = new initialConfigs_1.dataSourceController(State_1.State).entity;
        const disabilitySource = new initialConfigs_1.dataSourceController(Disability_1.Disability).entity;
        const testCategorySource = new initialConfigs_1.dataSourceController(TestCategory_1.TestCategory).entity;
        const questionGroupSource = new initialConfigs_1.dataSourceController(QuestionGroup_1.QuestionGroup).entity;
        const topicSource = new initialConfigs_1.dataSourceController(Topic_1.Topic).entity;
        const descriptorSource = new initialConfigs_1.dataSourceController(Descriptor_1.Descriptor).entity;
        const literacyTierSource = new initialConfigs_1.dataSourceController(LiteracyTier_1.LiteracyTier).entity;
        const literacyLevelSource = new initialConfigs_1.dataSourceController(LiteracyLevel_1.LiteracyLevel).entity;
        const textGender = new initialConfigs_1.dataSourceController(TextGender_1.TextGender).entity;
        const textGenderExam = new initialConfigs_1.dataSourceController(TextGenderExam_1.TextGenderExam).entity;
        const textGenderExamTier = new initialConfigs_1.dataSourceController(TextGenderExamTier_1.TextGenderExamTier).entity;
        const textGenderExamLevel = new initialConfigs_1.dataSourceController(TextGenderExamLevel_1.TextGenderExamLevel).entity;
        const textGenderClassroom = new initialConfigs_1.dataSourceController(TextGenderClassroom_1.TextGenderClassroom).entity;
        const textGenderExamLevelGroup = new initialConfigs_1.dataSourceController(TextGenderExamLevelGroup_1.TextGenderExamLevelGroup).entity;
        const currentYear = new Date().getFullYear();
        const date = new Date(currentYear, 0, 1, 0, 0, 0, 0);
        for (let literacyTier of literacyTier_1.LITERACYTIER) {
            const newLiteracyTier = new LiteracyTier_1.LiteracyTier();
            newLiteracyTier.name = literacyTier.name;
            yield literacyTierSource.save(newLiteracyTier);
        }
        for (let literacyLevel of literacyLevel_1.LITERACYLEVEL) {
            const newLiteracyLevel = new LiteracyLevel_1.LiteracyLevel();
            newLiteracyLevel.name = literacyLevel.name;
            newLiteracyLevel.shortName = literacyLevel.shortName;
            newLiteracyLevel.color = literacyLevel.color;
            yield literacyLevelSource.save(newLiteracyLevel);
        }
        const newYear = new Year_1.Year();
        newYear.name = date.getFullYear().toString();
        newYear.active = true;
        newYear.createdAt = date;
        for (let questionGroup of questionGroup_1.QUESTION_GROUP) {
            const newQuestionGroup = new QuestionGroup_1.QuestionGroup();
            newQuestionGroup.createdAt = new Date();
            newQuestionGroup.createdByUser = 1;
            newQuestionGroup.updatedAt = new Date();
            newQuestionGroup.updatedByUser = 1;
            newQuestionGroup.name = questionGroup.name;
            yield questionGroupSource.save(newQuestionGroup);
        }
        for (let disability of disability_1.DISABILITY) {
            const newDisability = new Disability_1.Disability();
            newDisability.name = disability.name;
            newDisability.createdAt = new Date();
            newDisability.createdByUser = 1;
            newDisability.updatedAt = new Date();
            newDisability.updatedByUser = 1;
            yield disabilitySource.save(newDisability);
        }
        for (let testCategory of testCategory_1.TESTCATEGORY) {
            const newTestCategory = new TestCategory_1.TestCategory();
            newTestCategory.name = testCategory.name;
            yield testCategorySource.save(newTestCategory);
        }
        for (let bimester of bimester_1.BIMESTER) {
            const newBimester = new Bimester_1.Bimester();
            newBimester.name = bimester.name;
            yield bimesterSource.save(newBimester);
        }
        for (let status of transferStatus_1.TRANSFER_STATUS) {
            const newStatus = new TransferStatus_1.TransferStatus();
            newStatus.name = status.name;
            yield transferStatusSource.save(newStatus);
        }
        for (let state of state_1.STATES) {
            const newState = new State_1.State();
            newState.name = state.name;
            newState.acronym = state.acronym;
            yield stateSource.save(newState);
        }
        const bimesters = yield bimesterSource.find();
        for (let bimester of bimesters) {
            const period = new Period_1.Period();
            period.year = newYear;
            period.bimester = bimester;
            yield periodSource.save(period);
        }
        for (let classroomCategory of classroomCategory_1.CLASSROOM_CATEGORY) {
            const newClassCategory = new ClassroomCategory_1.ClassroomCategory();
            newClassCategory.name = classroomCategory.name;
            newClassCategory.active = classroomCategory.active;
            newClassCategory.createdAt = new Date();
            newClassCategory.createdByUser = 1;
            newClassCategory.updatedAt = new Date();
            newClassCategory.updatedByUser = 1;
            yield classCategorySource.save(newClassCategory);
        }
        for (let school of school_1.SCHOOLS) {
            const newSchool = new School_1.School();
            newSchool.name = school.name;
            newSchool.shortName = school.shortName;
            newSchool.active = school.active;
            yield schoolSource.save(newSchool);
        }
        const schools = yield schoolSource.find();
        for (let school of schools) {
            for (let classroom of classroom_1.CLASSROOM) {
                if (school.active && classroom.category !== 3) {
                    yield createClassroom(school, classroom);
                }
                if (!school.active && classroom.category === 3 && !classroom.active) {
                    yield createClassroom(school, classroom);
                }
            }
        }
        for (let discipline of discipline_1.DISCIPLINE) {
            const newDiscipline = new Discipline_1.Discipline();
            newDiscipline.name = discipline.name;
            newDiscipline.active = discipline.active;
            newDiscipline.shortName = discipline.shortName;
            yield disciplineSource.save(newDiscipline);
        }
        for (let personCategory of personCategory_1.PERSON_CATEGORY) {
            const newPersonCategory = new PersonCategory_1.PersonCategory();
            newPersonCategory.name = personCategory.name;
            newPersonCategory.active = personCategory.active;
            yield personCategorySource.save(newPersonCategory);
        }
        for (let topic of topic_1.TOPIC) {
            const newTopic = new Topic_1.Topic();
            newTopic.createdAt = new Date();
            newTopic.createdByUser = 1;
            newTopic.updatedAt = new Date();
            newTopic.updatedByUser = 1;
            newTopic.name = topic.name;
            newTopic.description = topic.description;
            newTopic.discipline = (yield disciplineSource.findOneBy({ id: topic.discipline.id }));
            newTopic.classroomCategory = (yield classCategorySource.findOneBy({ id: topic.classroomCategory.id }));
            yield topicSource.save(newTopic);
        }
        for (let descriptor of descriptor_1.DESCRIPTOR) {
            const newDescriptor = new Descriptor_1.Descriptor();
            newDescriptor.createdAt = new Date();
            newDescriptor.createdByUser = 1;
            newDescriptor.updatedAt = new Date();
            newDescriptor.updatedByUser = 1;
            newDescriptor.name = descriptor.name;
            newDescriptor.code = descriptor.code;
            newDescriptor.topic = (yield topicSource.findOneBy({ id: descriptor.topic.id }));
            yield descriptorSource.save(newDescriptor);
        }
        for (let el of textGender_1.TEXTGENDER) {
            const newTextGender = new TextGender_1.TextGender();
            newTextGender.name = el.name;
            yield textGender.save(newTextGender);
        }
        for (let el of textGenderExam_1.TEXTGENDEREXAM) {
            const newTextGenderExam = new TextGenderExam_1.TextGenderExam();
            newTextGenderExam.name = el.name;
            newTextGenderExam.color = el.color;
            yield textGenderExam.save(newTextGenderExam);
        }
        for (let el of textGenderExamTier_1.TEXTGENDEREXAMTIER) {
            const newTextGenderExamTier = new TextGenderExamTier_1.TextGenderExamTier();
            newTextGenderExamTier.name = el.name;
            newTextGenderExamTier.color = el.color;
            yield textGenderExamTier.save(newTextGenderExamTier);
        }
        for (let el of textGenderExamLevel_1.TEXTGENDEREXAMLEVEL) {
            const newTextGenderExamLevel = new TextGenderExamLevel_1.TextGenderExamLevel();
            newTextGenderExamLevel.name = el.name;
            newTextGenderExamLevel.color = el.color;
            yield textGenderExamLevel.save(newTextGenderExamLevel);
        }
        for (let el of textGenderClassroom_1.TEXTGENDERCLASSROOM) {
            const newTextGenderClassroom = new TextGenderClassroom_1.TextGenderClassroom();
            newTextGenderClassroom.classroomNumber = el.classroomNumber;
            newTextGenderClassroom.textGender = (yield textGender.findOneBy({ id: el.textGender.id }));
            yield textGenderClassroom.save(newTextGenderClassroom);
        }
        for (let el of textGenderExamLevelGroup_1.TEXTGENDEREXAMLEVELGROUP) {
            const newTextGenderExamLevelGroup = new TextGenderExamLevelGroup_1.TextGenderExamLevelGroup();
            newTextGenderExamLevelGroup.textGenderExam = (yield textGenderExam.findOneBy({ id: el.textGenderExam.id }));
            newTextGenderExamLevelGroup.textGenderExamLevel = (yield textGenderExamLevel.findOneBy({ id: el.textGenderExamLevel.id }));
            yield textGenderExamLevelGroup.save(newTextGenderExamLevelGroup);
        }
        yield createAdminPerson();
        return res.status(200).json({ message: 'Configurações iniciais criadas com sucesso!' });
    }
    catch (e) {
        console.log(e);
        return res.status(500).json({ message: 'Erro ao criar configurações iniciais!' });
    }
}));
