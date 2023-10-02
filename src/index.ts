import express from 'express'

import { Router } from 'express';
import { Application } from "express";
import { AppDataSource } from "./data-source";

import { BimesterRouter } from "./routes/bimester";
import { CassroomCategoryRouter } from "./routes/classroomCategory";
import { ClassroomRouter } from "./routes/classroom";
import { DisabilityRouter } from "./routes/disability";
import { DisciplineRouter } from "./routes/discipline";
import { PersonCategoryRouter } from "./routes/personCategory";
import { PersonRouter } from "./routes/person";
import { SchoolRouter } from "./routes/school";
import { StateRouter } from "./routes/state";
import { StudentRouter } from "./routes/student";
import { TeacherClassDisciplineRouter } from "./routes/teacherClassDiscipline";
import { TeacherRouter } from "./routes/teacher";
import { YearRouter } from "./routes/year";

import { InitialConfigsRouter } from "./routes/initialConfigs";

const bodyParser = require('body-parser');
const app: Application = express();
const cors = require('cors');
const route = Router()

app.use(bodyParser.json());
app.use(cors({origin: true}));

route.use('/bimester', BimesterRouter);
route.use('/classroom', ClassroomRouter);
route.use('/classroom-category', CassroomCategoryRouter);
route.use('/disability', DisabilityRouter);
route.use('/discipline', DisciplineRouter);
route.use('/person', PersonRouter);
route.use('/person-category', PersonCategoryRouter);
route.use('/school', SchoolRouter);
route.use('/state', StateRouter);
route.use('/student', StudentRouter);
route.use('/teacher', TeacherRouter);
route.use('/teacher-class-discipline', TeacherClassDisciplineRouter);
route.use('/year', YearRouter);

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
