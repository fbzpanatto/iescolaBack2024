import { Router, Request, Response } from "express";
import { textGenderClassroomController as controller } from "../controller/textGenderClassroom";
import { CLASSROOM_NUMBER_PARAM, ID_PARAM } from "../middleware/validators";

export const TextGenderClassroomRouter = Router();

TextGenderClassroomRouter.get('/:id', ID_PARAM, async (req: Request, res: Response) => {
  const response = await controller.getTabs(req); return res.status(response.status).json(response)
})

TextGenderClassroomRouter.get('/report/:classroomNumber', CLASSROOM_NUMBER_PARAM, async (req: Request, res: Response) => {
  const response = await controller.getTabsReport(req); return res.status(response.status).json(response)
})
