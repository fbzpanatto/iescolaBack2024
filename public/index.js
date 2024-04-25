"use strict";
// if (process.env.NODE_ENV !== 'production') { require('dotenv').config() }
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authorization_1 = __importDefault(require("./middleware/authorization"));
const express_2 = require("express");
const data_source_1 = require("./data-source");
const bimester_1 = require("./routes/bimester");
const classroomCategory_1 = require("./routes/classroomCategory");
const classroom_1 = require("./routes/classroom");
const descriptor_1 = require("./routes/descriptor");
const disability_1 = require("./routes/disability");
const discipline_1 = require("./routes/discipline");
const initialConfigs_1 = require("./routes/initialConfigs");
const literacy_1 = require("./routes/literacy");
const literacySecond_1 = require("./routes/literacySecond");
const login_1 = require("./routes/login");
const personCategory_1 = require("./routes/personCategory");
const person_1 = require("./routes/person");
const questionGroup_1 = require("./routes/questionGroup");
const question_1 = require("./routes/question");
const reportLiteracyRouter_1 = require("./routes/reportLiteracyRouter");
const report_1 = require("./routes/report");
const school_1 = require("./routes/school");
const state_1 = require("./routes/state");
const studentQuestion_1 = require("./routes/studentQuestion");
const student_1 = require("./routes/student");
const teacherClassDiscipline_1 = require("./routes/teacherClassDiscipline");
const teacherClassrooms_1 = require("./routes/teacherClassrooms");
const teacher_1 = require("./routes/teacher");
const testCategory_1 = require("./routes/testCategory");
const test_1 = require("./routes/test");
const textGenderClassroom_1 = require("./routes/textGenderClassroom");
const textGenderGrade_1 = require("./routes/textGenderGrade");
const topic_1 = require("./routes/topic");
const transfer_1 = require("./routes/transfer");
const user_1 = require("./routes/user");
const year_1 = require("./routes/year");
const textGenderGradeReport_1 = require("./routes/textGenderGradeReport");
const password_1 = require("./routes/password");
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
const route = (0, express_2.Router)();
app.use(body_parser_1.default.json());
app.use((0, cors_1.default)({
    origin: '*',
    credentials: true,
    optionsSuccessStatus: 200
}));
app.use(express_1.default.urlencoded({ extended: true }));
route.use('/bimester', authorization_1.default, bimester_1.BimesterRouter);
route.use('/classroom', authorization_1.default, classroom_1.ClassroomRouter);
route.use('/classroom-category', authorization_1.default, classroomCategory_1.CassroomCategoryRouter);
route.use('/descriptor', descriptor_1.DescriptorRouter);
route.use('/disability', authorization_1.default, disability_1.DisabilityRouter);
route.use('/discipline', authorization_1.default, discipline_1.DisciplineRouter);
route.use('/initial-configs', initialConfigs_1.InitialConfigsRouter);
route.use('/literacy', authorization_1.default, literacy_1.LiteracyRouter);
route.use('/literacy-report', authorization_1.default, reportLiteracyRouter_1.ReportLiteracyRouter);
route.use('/literacy-second', authorization_1.default, literacySecond_1.LiteracySecondRouter);
route.use('/login', login_1.LoginRouter);
route.use('/person', authorization_1.default, person_1.PersonRouter);
route.use('/person-category', authorization_1.default, personCategory_1.PersonCategoryRouter);
route.use('/question', question_1.QuestionRouter);
route.use('/question-group', questionGroup_1.QuestionGroupRouter);
route.use('/report', authorization_1.default, report_1.ReportRouter);
route.use('/school', authorization_1.default, school_1.SchoolRouter);
route.use('/state', authorization_1.default, state_1.StateRouter);
route.use('/student', authorization_1.default, student_1.StudentRouter);
route.use('/student-question', authorization_1.default, studentQuestion_1.StudentQuestionRouter);
route.use('/teacher', authorization_1.default, teacher_1.TeacherRouter);
route.use('/teacher-class-discipline', authorization_1.default, teacherClassDiscipline_1.TeacherClassDisciplineRouter);
route.use('/teacher-classroom', authorization_1.default, teacherClassrooms_1.TeacherClassroomsRouter);
route.use('/test', authorization_1.default, test_1.TestRouter);
route.use('/test-category', authorization_1.default, testCategory_1.TestCategoryRouter);
route.use('/text-gender-grade', authorization_1.default, textGenderGrade_1.TextGenderGradeRouter);
route.use('/text-gender-report', authorization_1.default, textGenderGradeReport_1.TextGenderGradeReportRouter);
route.use('/text-gender-tabs', textGenderClassroom_1.TextGenderClassroomRouter);
route.use('/topic', topic_1.TopicRouter);
route.use('/transfer', authorization_1.default, transfer_1.TransferRouter);
route.use('/user', authorization_1.default, user_1.UserRouter);
route.use('/year', authorization_1.default, year_1.YearRouter);
route.use('/reset-password', password_1.PasswordRouter);
route.use('/login', login_1.LoginRouter);
route.use('/initial-configs', initialConfigs_1.InitialConfigsRouter);
route.use('/', (req, res) => {
    return res.json({ message: "OK" });
});
app.use(route);
data_source_1.AppDataSource.initialize()
    .then(() => {
    // app.listen(process.env.SERVER_PORT, () => {
    //   console.log('Server running at PORT:', process.env.SERVER_PORT);
    // });
    app.listen(3000, () => {
        console.log('Server running at PORT:', 3000);
    });
})
    .catch((err) => { console.log(err); });
