import { Router, Request } from "express"
import { smController as controller } from "../controller/studentMerge";
import havePermission from "../middleware/havePermission";

export const StudentMergeRouter = Router();

StudentMergeRouter.get('/all', havePermission, async (req: Request, res: any) => {
  const response = await controller.getAllStudentsToMerge(req); return res.status(response.status).json(response)
});

StudentMergeRouter.put('/:id', havePermission, async (req: Request, res: any) => {
  const response = await controller.mergeStudents(req.body); return res.status(response.status).json(response)
});