import dotenv from 'dotenv';
dotenv.config();

import express, { Application, Router } from "express";
import helmet from "helmet";
import cors from "cors";

import authorization from "./middleware/authorization";

import { AppDataSource } from "./data-source";
import { BimesterRouter } from "./routes/bimester";
import { CassroomCategoryRouter } from "./routes/classroomCategory";
import { ClassroomRouter } from "./routes/classroom";
import { DisabilityRouter } from "./routes/disability";
import { DisciplineRouter } from "./routes/discipline";
import { LoginRouter } from "./routes/login";
import { PeCatRouter } from "./routes/personCategory";
import { PersonRouter } from "./routes/person";
import { QGroupR } from "./routes/questionGroup";
import { QuesR } from "./routes/question";
import { ReportRouter } from "./routes/report";
import { SchoolRouter } from "./routes/school";
import { TrainingRouter } from "./routes/training";
import { StateRouter } from "./routes/state";
import { SkillRouter } from "./routes/skill";
import { StudentQuestionRouter } from "./routes/studentQuestion";
import { StudentRouter } from "./routes/student";
import { TeacherClassDisciplineRouter } from "./routes/teacherClassDiscipline";
import { TeacherClassroomsRouter } from "./routes/teacherClassrooms";
import { TeacherRouter } from "./routes/teacher";
import { TestCategoryRouter } from "./routes/testCategory";
import { TestRouter } from "./routes/test";
import { HistoryRouter } from "./routes/history"
import { TransferRouter } from "./routes/transfer";
import { UserRouter } from "./routes/user";
import { YearRouter } from "./routes/year";
import { PasswordRouter } from "./routes/password";
import { StudentTestRouter } from "./routes/studentTest";

const app: Application = express();
const route = Router();

app.use(cors({ origin: "*", credentials: true, optionsSuccessStatus: 200 }) );

app.use(helmet());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: true }));

route.use("/bimester", authorization, BimesterRouter);
route.use("/classroom", authorization, ClassroomRouter);
route.use("/classroom-category", authorization, CassroomCategoryRouter);
route.use("/disability", authorization, DisabilityRouter);
route.use("/discipline", authorization, DisciplineRouter);
route.use("/person", authorization, PersonRouter);
route.use("/person-category", authorization, PeCatRouter);
route.use("/question", authorization, QuesR);
route.use("/question-group", QGroupR);
route.use("/report", authorization, ReportRouter);
route.use("/school", authorization, SchoolRouter);
route.use("/state", authorization, StateRouter);
route.use("/student", authorization, StudentRouter);
route.use("/student-test", authorization, StudentTestRouter);
route.use("/training", authorization, TrainingRouter);
route.use("/student-question", authorization, StudentQuestionRouter);
route.use("/teacher", authorization, TeacherRouter);
route.use("/teacher-class-discipline", authorization, TeacherClassDisciplineRouter );
route.use("/teacher-classroom", authorization, TeacherClassroomsRouter);
route.use("/test", authorization, TestRouter);
route.use("/history", authorization, HistoryRouter);
route.use("/test-category", authorization, TestCategoryRouter);
route.use("/skill", SkillRouter);
route.use("/transfer", authorization, TransferRouter);
route.use("/user", authorization, UserRouter);
route.use("/year", authorization, YearRouter);

route.use("/login", LoginRouter);
route.use("/reset-password", PasswordRouter);

route.use("/", (_, res: any) => { return res.json({ message: "OK" }) });

app.use(route);

AppDataSource.initialize()
  .then(() => {
    app.listen(process.env.SERVER_PORT, () => {
      console.log("Server running at PORT:", process.env.SERVER_PORT)
    })
  })
  .catch((err) => { console.log('err', err) });