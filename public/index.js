"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const morgan_1 = __importDefault(require("morgan"));
// if (process.env.NODE_ENV !== 'production') { require('dotenv').config() }
const express_1 = __importStar(require("express"));
const authorization_1 = __importDefault(require("./middleware/authorization"));
const data_source_1 = require("./data-source");
const bimester_1 = require("./routes/bimester");
const classroomCategory_1 = require("./routes/classroomCategory");
const classroom_1 = require("./routes/classroom");
const descriptor_1 = require("./routes/descriptor");
const disability_1 = require("./routes/disability");
const discipline_1 = require("./routes/discipline");
const initialConfigs_1 = require("./routes/initialConfigs");
const literacy_1 = require("./routes/literacy");
const login_1 = require("./routes/login");
const personCategory_1 = require("./routes/personCategory");
const person_1 = require("./routes/person");
const questionGroup_1 = require("./routes/questionGroup");
const question_1 = require("./routes/question");
const reportLiteracy_1 = require("./routes/reportLiteracy");
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
const topic_1 = require("./routes/topic");
const transfer_1 = require("./routes/transfer");
const user_1 = require("./routes/user");
const year_1 = require("./routes/year");
const password_1 = require("./routes/password");
const helmet_1 = __importDefault(require("helmet"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
const route = (0, express_1.Router)();
app.use(body_parser_1.default.json());
app.use((0, cors_1.default)({ origin: "*", credentials: true, optionsSuccessStatus: 200 }));
app.use((0, morgan_1.default)("tiny"));
app.use((0, cors_1.default)());
app.use((0, helmet_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
route.use("/bimester", authorization_1.default, bimester_1.BimesterRouter);
route.use("/classroom", authorization_1.default, classroom_1.ClassroomRouter);
route.use("/classroom-category", authorization_1.default, classroomCategory_1.CassroomCategoryRouter);
route.use("/descriptor", descriptor_1.DescriptorRouter);
route.use("/disability", authorization_1.default, disability_1.DisabilityRouter);
route.use("/discipline", authorization_1.default, discipline_1.DisciplineRouter);
route.use("/initial-configs", initialConfigs_1.InitialConfigsRouter);
route.use("/literacy", authorization_1.default, literacy_1.LiteracyRouter);
route.use("/literacy-report", authorization_1.default, reportLiteracy_1.ReportLiteracy);
route.use("/login", login_1.LoginRouter);
route.use("/person", authorization_1.default, person_1.PersonRouter);
route.use("/person-category", authorization_1.default, personCategory_1.PeCatRouter);
route.use("/question", authorization_1.default, question_1.QuesR);
route.use("/question-group", questionGroup_1.QGroupR);
route.use("/report", authorization_1.default, report_1.ReportRouter);
route.use("/school", authorization_1.default, school_1.SchoolRouter);
route.use("/state", authorization_1.default, state_1.StateRouter);
route.use("/student", authorization_1.default, student_1.StudentRouter);
route.use("/student-question", authorization_1.default, studentQuestion_1.StudentQuestionRouter);
route.use("/teacher", authorization_1.default, teacher_1.TeacherRouter);
route.use("/teacher-class-discipline", authorization_1.default, teacherClassDiscipline_1.TeacherClassDisciplineRouter);
route.use("/teacher-classroom", authorization_1.default, teacherClassrooms_1.TeacherClassroomsRouter);
route.use("/test", authorization_1.default, test_1.TestRouter);
route.use("/test-category", authorization_1.default, testCategory_1.TestCategoryRouter);
route.use("/topic", topic_1.TopicRouter);
route.use("/transfer", authorization_1.default, transfer_1.TransferRouter);
route.use("/user", authorization_1.default, user_1.UserRouter);
route.use("/year", authorization_1.default, year_1.YearRouter);
// route.use("/literacy-second", authorization, LiteracySecondRouter);
// route.use("/text-gender-grade", authorization, TextGenderGradeRouter);
// route.use("/text-gender-report", authorization, TextGenderGradeReportRouter);
// route.use("/text-gender-tabs", TextGenderClassroomRouter);
route.use("/login", login_1.LoginRouter);
route.use("/reset-password", password_1.PasswordRouter);
route.use("/initial-configs", initialConfigs_1.InitialConfigsRouter);
route.use("/", (_, res) => { return res.json({ message: "OK" }); });
app.use(route);
data_source_1.AppDataSource.initialize()
    .then(() => { app.listen(5000, () => { console.log("Server running at PORT:", 5000); }); })
    .catch((err) => { console.log(err); });
