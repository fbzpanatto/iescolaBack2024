import { Router, Request, Response } from "express";
import { schoolController as controller } from "../controller/school";
import { YEAR_NAME_PARAM } from "../middleware/validators";

export const SchoolRouter = Router();

SchoolRouter.get('/:year', YEAR_NAME_PARAM, async (req: Request, res: Response) => {
  const response = await controller.getAllSchools(req); return res.status(response.status).json(response)
})
