import express from 'express'

import { Router } from 'express';
import { Application } from "express";
import { AppDataSource } from "./data-source";

import { SchoolRouter } from "./routes/school";
import { YearRouter } from "./routes/year";
import { BimesterRouter } from "./routes/bimester";
import { CassroomCategoryRouter } from "./routes/classroomCategory";
import { ClassroomRouter } from "./routes/classroom";
import { PersonRouter } from "./routes/person";
import { PersonCategoryRouter } from "./routes/personCategory";
import { StudentRouter } from "./routes/student";
import { TeacherRouter } from "./routes/teacher";

import { InitialConfigsRouter } from "./routes/initialConfigs";

const bodyParser = require('body-parser');
const app: Application = express();
const cors = require('cors');
const route = Router()

app.use(bodyParser.json());
app.use(cors({origin: true}));

route.use('/year', YearRouter)
route.use('/person-category', PersonCategoryRouter)
route.use('/person', PersonRouter)
route.use('/classroom', ClassroomRouter)
route.use('/classroom-category', CassroomCategoryRouter)
route.use('/bimester', BimesterRouter)
route.use('/school', SchoolRouter)
route.use('/student', StudentRouter)
route.use('/teacher', TeacherRouter)

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
