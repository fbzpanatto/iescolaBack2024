import { Request, Response, Router } from "express";
import { stController } from "../controller/student";
import { BODY_VALIDATION_USER, PARAM_ID, VALIDATE_USER, PARAM_YEAR } from "../middleware/validators";
import havePermission from "../middleware/havePermission";

const CREATE_VALIDATORS = [VALIDATE_USER, BODY_VALIDATION_USER];
const UPDATE_VALIDATORS = [PARAM_ID, VALIDATE_USER, BODY_VALIDATION_USER];

export const StudentRouter = Router();

StudentRouter.get("/form", havePermission, async (req, res) => { const response = await stController.studentForm(req); return res.status(response.status as number).json(response) })

StudentRouter.get("/inactive/:year", PARAM_YEAR, havePermission, async (req: Request, res: Response) => { const response = await stController.getAllInactivates(req); return res.status(response.status as number).json(response) })

StudentRouter.get("/:year/all", PARAM_YEAR, havePermission, async (req: Request, res: Response) => { const response = await stController.allStudents(req); return res.status(response.status as number).json(response) })

StudentRouter.get("/:id", PARAM_ID, havePermission, async (req: Request, res: Response) => { const response = await stController.findOneStudentById(req); return res.status(response.status).json(response) })

StudentRouter.post("/inactive", havePermission, async (req: Request, res: Response) => { const response = await stController.inactiveNewClass(req.body); return res.status(response.status).json(response) })

StudentRouter.post("/", ...CREATE_VALIDATORS, havePermission, async (req: Request, res: Response) => { const response = await stController.save(req.body); return res.status(response.status).json(response) })

StudentRouter.put("/literacy-first/:id", PARAM_ID, havePermission, async (req: Request, res: Response) => { const response = await stController.putLiteracyBeforeLevel(req.body); return res.status(response.status).json(response) })

StudentRouter.put("/:id/graduate", PARAM_ID, havePermission, async (req: Request, res: Response) => { const response = await stController.graduate(req.params.id, req.body); return res.status(response.status).json(response) })

StudentRouter.put("/:id", ...UPDATE_VALIDATORS, havePermission, async (req: Request, res: Response) => { const response = await stController.updateId(req.params.id, req.body); return res.status(response.status).json(response) })