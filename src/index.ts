
// if (process.env.NODE_ENV !== 'production') { require('dotenv').config() }

import express from 'express'
import authorization from "./middleware/authorization";

import { Router } from 'express';
import { Application } from "express";
import { AppDataSource } from "./data-source";
import { BimesterRouter } from "./routes/bimester";
import { CassroomCategoryRouter } from "./routes/classroomCategory";
import { ClassroomRouter } from "./routes/classroom";
import { DescriptorRouter } from "./routes/descriptor";
import { DisabilityRouter } from "./routes/disability";
import { DisciplineRouter } from "./routes/discipline";
import { InitialConfigsRouter } from "./routes/initialConfigs";
import { LiteracyRouter } from "./routes/literacy";
import { LiteracySecondRouter } from "./routes/literacySecond";
import { LoginRouter } from "./routes/login";
import { PersonCategoryRouter } from "./routes/personCategory";
import { PersonRouter } from "./routes/person";
import { QuestionGroupRouter } from "./routes/questionGroup";
import { QuestionRouter } from "./routes/question";
import { ReportLiteracyRouter } from "./routes/reportLiteracyRouter";
import { ReportRouter } from "./routes/report";
import { SchoolRouter } from "./routes/school";
import { StateRouter } from "./routes/state";
import { StudentQuestionRouter } from "./routes/studentQuestion";
import { StudentRouter } from "./routes/student";
import { TeacherClassDisciplineRouter } from "./routes/teacherClassDiscipline";
import { TeacherClassroomsRouter } from "./routes/teacherClassrooms";
import { TeacherRouter } from "./routes/teacher";
import { TestCategoryRouter } from "./routes/testCategory";
import { TestRouter } from "./routes/test";
import { TextGenderClassroomRouter } from "./routes/textGenderClassroom";
import { TextGenderGradeRouter } from "./routes/textGenderGrade";
import { TopicRouter } from "./routes/topic";
import { TransferRouter } from "./routes/transfer";
import { UserRouter } from "./routes/user";
import { YearRouter } from "./routes/year";
import { TextGenderGradeReportRouter } from './routes/textGenderGradeReport';
import { PasswordRouter } from './routes/password';

import bodyParser from 'body-parser';
import cors from 'cors';

const app: Application = express();
const route = Router()

app.use(bodyParser.json());
// app.use(cors({ origin: true }));
app.use(express.urlencoded({ extended: true }));

route.use('/bimester', authorization, BimesterRouter);
route.use('/classroom', authorization, ClassroomRouter);
route.use('/classroom-category', authorization, CassroomCategoryRouter);
route.use('/descriptor', DescriptorRouter);
route.use('/disability', authorization, DisabilityRouter);
route.use('/discipline', authorization, DisciplineRouter);
route.use('/initial-configs', InitialConfigsRouter)
route.use('/literacy', authorization, LiteracyRouter);
route.use('/literacy-report', authorization, ReportLiteracyRouter);
route.use('/literacy-second', authorization, LiteracySecondRouter);
route.use('/login', LoginRouter);
route.use('/person', authorization, PersonRouter);
route.use('/person-category', authorization, PersonCategoryRouter);
route.use('/question', QuestionRouter);
route.use('/question-group', QuestionGroupRouter);
route.use('/report', authorization, ReportRouter);
route.use('/school', authorization, SchoolRouter);
route.use('/state', authorization, StateRouter);
route.use('/student', authorization, StudentRouter);
route.use('/student-question', authorization, StudentQuestionRouter);
route.use('/teacher', authorization, TeacherRouter);
route.use('/teacher-class-discipline', authorization, TeacherClassDisciplineRouter);
route.use('/teacher-classroom', authorization, TeacherClassroomsRouter);
route.use('/test', authorization, TestRouter);
route.use('/test-category', authorization, TestCategoryRouter);
route.use('/text-gender-grade', authorization, TextGenderGradeRouter)
route.use('/text-gender-report', authorization, TextGenderGradeReportRouter)
route.use('/text-gender-tabs', TextGenderClassroomRouter)
route.use('/topic', TopicRouter);
route.use('/transfer', authorization, TransferRouter);
route.use('/user', authorization, UserRouter);
route.use('/year', authorization, YearRouter);

route.use('/reset-password', PasswordRouter);

route.use('/login', LoginRouter);

route.use('/initial-configs', InitialConfigsRouter)

route.use('/', (req, res) => {
  return res.json({ message: "OK" })
})

app.use(route)

AppDataSource.initialize()
  .then(() => {
    // app.listen(process.env.SERVER_PORT, () => {
    //   console.log('Server running at PORT:', process.env.SERVER_PORT);
    // });
    app.listen(3000, () => {
      console.log('Server running at PORT:', 3000);
    });
  })
  .catch((err) => { console.log(err) });
