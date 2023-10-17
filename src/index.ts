import express from 'express'
import authorization from "./middleware/authorization";
import { Router } from 'express';
import { Application } from "express";
import { AppDataSource } from "./data-source";

import { BimesterRouter } from "./routes/bimester";
import { CassroomCategoryRouter } from "./routes/classroomCategory";
import { ClassroomRouter } from "./routes/classroom";
import { DisabilityRouter } from "./routes/disability";
import { DisciplineRouter } from "./routes/discipline";
import { LoginRouter } from "./routes/login";
import { PersonCategoryRouter } from "./routes/personCategory";
import { PersonRouter } from "./routes/person";
import { SchoolRouter } from "./routes/school";
import { StateRouter } from "./routes/state";
import { StudentRouter } from "./routes/student";
import { TransferRouter } from "./routes/transfer";
import { TeacherClassDisciplineRouter } from "./routes/teacherClassDiscipline";
import { TeacherClassroomsRouter } from "./routes/teacherClassrooms";
import { TeacherRouter } from "./routes/teacher";
import { UserRouter } from "./routes/user";
import { YearRouter } from "./routes/year";

import { InitialConfigsRouter } from "./routes/initialConfigs";
import { TestRouter } from "./routes/test";
import { TestCategoryRouter } from "./routes/testCategory";
import { DescriptorRouter } from "./routes/descriptor";
import { TopicRouter } from "./routes/topic";
import {QuestionRouter} from "./routes/questionGroup";

const bodyParser = require('body-parser');
const app: Application = express();
const cors = require('cors');
const route = Router()

app.use(bodyParser.json());
app.use(cors({origin: true}));

route.use('/bimester', authorization, BimesterRouter);
route.use('/classroom', authorization, ClassroomRouter);
route.use('/classroom-category', authorization, CassroomCategoryRouter);
route.use('/disability', authorization, DisabilityRouter);
route.use('/discipline', authorization, DisciplineRouter);
route.use('/person', authorization, PersonRouter);
route.use('/person-category', authorization, PersonCategoryRouter);
route.use('/school', authorization, SchoolRouter);
route.use('/state', authorization, StateRouter);
route.use('/student', authorization, StudentRouter);
route.use('/transfer', authorization, TransferRouter)
route.use('/teacher', authorization, TeacherRouter);
route.use('/test', authorization, TestRouter);
route.use('/descriptor', DescriptorRouter);
route.use('/question-group', QuestionRouter);
route.use('/topic', TopicRouter);
route.use('/test-category', authorization, TestCategoryRouter);
route.use('/teacher-classroom', authorization, TeacherClassroomsRouter )
route.use('/teacher-class-discipline', authorization, TeacherClassDisciplineRouter);
route.use('/user', authorization, UserRouter);
route.use('/year', authorization, YearRouter);

route.use('/login', LoginRouter);

route.use('/initial-configs', InitialConfigsRouter)

app.use(route)

AppDataSource.initialize()
  .then(() => {
    app.listen(3333, () => {
      console.log('Server running on port 3333');
    });
  })
  .catch((err) => {
    console.log(err);
  });
