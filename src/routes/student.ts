import { Request, Router, Response } from "express";
import { stController as controller } from "../controller/student";
import { BODY_VALIDATION_STUDENT_USER, BODY_VALIDATION_USER_FIRST_LEVEL, ID_PARAM, VALIDATE_USER, VALIDATE_USER_FIRST_LEVEL, YEAR_NAME_PARAM } from "../middleware/validators";
import havePermission from "../middleware/havePermission";
import { studentCreateController } from "../controller/studentCreate";
import { studentUpdateController } from "../controller/studentUpdate";

const CREATE_VALIDATORS = [VALIDATE_USER, BODY_VALIDATION_STUDENT_USER];
const UPDATE_VALIDATORS = [ID_PARAM, VALIDATE_USER, BODY_VALIDATION_STUDENT_USER];

export const StudentRouter = Router();

StudentRouter.get("/form", havePermission, async (req: Request, res: Response) => {
  const response = await controller.studentForm(req, req.user); return res.status(response.status as number).json(response)
})

StudentRouter.get("/inactive/:year", YEAR_NAME_PARAM, havePermission, async (req: Request, res: Response) => {
  const response = await controller.getAllInactivates(req, req.user); return res.status(response.status as number).json(response)
})

StudentRouter.get("/:year/all", YEAR_NAME_PARAM, havePermission, async (req: Request<{ year: string }>, res: Response) => {
  const response = await controller.allStudents(req, req.user); return res.status(response.status as number).json(response)
})

StudentRouter.get("/:id", ID_PARAM, havePermission, async (req: Request, res: Response) => {
  const response = await controller.findOneStudentById(req, req.user); return res.status(response.status).json(response)
})

StudentRouter.post("/inactive/list", havePermission, async (req: Request, res: Response) => {
  const response = await controller.setInactiveNewClassroomList(req.body, req.user); return res.status(response.status).json(response)
})

StudentRouter.post("/", ...CREATE_VALIDATORS, havePermission, async (req: Request, res: Response) => {
  const response = await studentCreateController.saveWithAuth(req.body, req.user); return res.status(response.status).json(response)
})

StudentRouter.put("/:id/first-level", ID_PARAM, VALIDATE_USER_FIRST_LEVEL, BODY_VALIDATION_USER_FIRST_LEVEL, havePermission, async (req: Request, res: Response) => {
  const response = await controller.setFirstLevel(req.body, req.user); return res.status(response.status).json(response)
})

StudentRouter.put("/:id", ...UPDATE_VALIDATORS, havePermission, async (req: Request<{ id: string }>, res: Response) => {
  const response = await studentUpdateController.updateIdWithAuth(req.params.id, req.body, req.user); return res.status(response.status).json(response)
})