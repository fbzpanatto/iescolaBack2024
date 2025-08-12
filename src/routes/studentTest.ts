import { Request, Router } from "express";
import { YEAR_NAME_PARAM } from "../middleware/validators";
import { studentTestController as controller } from "../controller/studentTest";
import havePermission from "../middleware/havePermission";

export const StudentTestRouter = Router()

StudentTestRouter.get("/:year", YEAR_NAME_PARAM, havePermission, async (req: Request, res: any) => {
  const response = await controller.allStudents(req.body, req.params); return res.status(response.status as number).json(response)
})