import { Request, Router } from "express";
import { BODY_STUDENT_TEST_QUESTIONS, STUDENT_CLASSROOM_ID_REF, VALIDATE_STUDENT_TEST_QUESTIONS, YEAR_NAME_PARAM } from "../middleware/validators";
import { studentTestController as controller } from "../controller/studentTest";
import havePermission from "../middleware/havePermission";
import userAgent from "../middleware/userAgent"

const UPDATE_VALIDATORS = [VALIDATE_STUDENT_TEST_QUESTIONS, BODY_STUDENT_TEST_QUESTIONS]

export const StudentTestRouter = Router()

StudentTestRouter.get("/test/:id", [YEAR_NAME_PARAM, STUDENT_CLASSROOM_ID_REF], userAgent, havePermission, async (req: Request, res: any) => {
  const response = await controller.getTest(req.body, req.params, req.query); return res.status(response.status as number).json(response)
})

StudentTestRouter.get("/:year", YEAR_NAME_PARAM, havePermission, async (req: Request, res: any) => {
  const response = await controller.allFilteredStudentTest(req.body, req.params, req.query); return res.status(response.status as number).json(response)
})

StudentTestRouter.put("/test/:id", ...UPDATE_VALIDATORS, havePermission, async (req: Request, res: any) => {
  const response = await controller.updateStudentAnswers(req.body); return res.status(response.status as number).json(response)
})