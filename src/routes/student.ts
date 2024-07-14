import { Request, Response, Router } from "express";
import { stController } from "../controller/student";
import { BODY_VALIDATION_USER, ID_PARAM, VALIDATE_USER, YEAR_ID_PARAM } from "../middleware/validators";
import havePermission from "../middleware/havePermission";

const CREATE_VALIDATORS = [VALIDATE_USER, BODY_VALIDATION_USER];
const UPDATE_VALIDATORS = [ID_PARAM, VALIDATE_USER, BODY_VALIDATION_USER];

export const StudentRouter = Router();

StudentRouter.get("/form", havePermission, async (req, res) => { const response = await stController.studentForm(req); return res.status(response.status as number).json(response) })

StudentRouter.get("/inactive/:year", YEAR_ID_PARAM, havePermission, async (req: Request, res: Response) => { const response = await stController.getAllInactivates(req); return res.status(response.status as number).json(response) })

StudentRouter.get("/:year/all", YEAR_ID_PARAM, havePermission, async (req: Request, res: Response) => { const response = await stController.allStudents(req); return res.status(response.status as number).json(response) })

StudentRouter.get("/:id", ID_PARAM, havePermission, async (req: Request, res: Response) => { const response = await stController.findOneStudentById(req); return res.status(response.status).json(response) })

StudentRouter.post("/inactive", havePermission, async (req: Request, res: Response) => { const response = await stController.inactiveNewClass(req.body); return res.status(response.status).json(response) })

StudentRouter.post("/", ...CREATE_VALIDATORS, havePermission, async (req: Request, res: Response) => { const response = await stController.save(req.body); return res.status(response.status).json(response) })

StudentRouter.put("/literacy-first/:id", ID_PARAM, havePermission, async (req: Request, res: Response) => { const response = await stController.putLiteracyBeforeLevel(req.body); return res.status(response.status).json(response) })

StudentRouter.put("/:id/graduate", ID_PARAM, havePermission, async (req: Request, res: Response) => { const response = await stController.graduate(req.params.id, req.body); return res.status(response.status).json(response) })

StudentRouter.put("/:id", ...UPDATE_VALIDATORS, havePermission, async (req: Request, res: Response) => { const response = await stController.updateId(req.params.id, req.body); return res.status(response.status).json(response) })