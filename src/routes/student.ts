import { Request, Response, Router } from "express";
import { stController as controller } from "../controller/student";
import { BODY_VALIDATION_USER, ID_PARAM, VALIDATE_USER, YEAR_NAME_PARAM } from "../middleware/validators";
import havePermission from "../middleware/havePermission";

const CREATE_VALIDATORS = [VALIDATE_USER, BODY_VALIDATION_USER];
const UPDATE_VALIDATORS = [ID_PARAM, VALIDATE_USER, BODY_VALIDATION_USER];

export const StudentRouter = Router();

StudentRouter.get("/form", havePermission, async (req: Request, res: Response) => {
  const response = await controller.studentForm(req); return res.status(response.status as number).json(response)
})

StudentRouter.get("/inactive/:year", YEAR_NAME_PARAM, havePermission, async (req: Request, res: Response) => {
  const response = await controller.getAllInactivates(req); return res.status(response.status as number).json(response)
})

StudentRouter.get("/:year/all", YEAR_NAME_PARAM, havePermission, async (req: Request, res: Response) => {
  const response = await controller.allStudents(req); return res.status(response.status as number).json(response)
})

StudentRouter.get("/:id", ID_PARAM, havePermission, async (req: Request, res: Response) => {
  const response = await controller.findOneStudentById(req); return res.status(response.status).json(response)
})

StudentRouter.post("/inactive", havePermission, async (req: Request, res: Response) => {
  const response = await controller.setInactiveNewClassroom(req.body); return res.status(response.status).json(response)
})

StudentRouter.post("/bulk-insert", havePermission, async (req: Request, res: Response) => {
  const response = await controller.bulkInsert(req.body); return res.status(response.status).json(response)
})

StudentRouter.post("/", ...CREATE_VALIDATORS, havePermission, async (req: Request, res: Response) => {
  const response = await controller.save(req.body); return res.status(response.status).json(response)
})

StudentRouter.put("/literacy-first/:id", ID_PARAM, havePermission, async (req: Request, res: Response) => {
  const response = await controller.putLiteracyBeforeLevel(req.body); return res.status(response.status).json(response)
})

StudentRouter.put("/:id/graduate", ID_PARAM, havePermission, async (req: Request, res: Response) => {
  const response = await controller.graduate(req.params.id, req.body); return res.status(response.status).json(response)
})

StudentRouter.put("/:id", ...UPDATE_VALIDATORS, havePermission, async (req: Request, res: Response) => {
  const response = await controller.updateId(req.params.id, req.body); return res.status(response.status).json(response)
})