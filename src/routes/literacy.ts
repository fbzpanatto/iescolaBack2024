import { Router, Request, Response } from "express";
import { literacyController } from "../controller/literacy";
import havePermission from "../middleware/havePermission";

export const LiteracyRouter = Router();

LiteracyRouter.get('/:year', havePermission, async (req: Request, res: Response) => { const response = await literacyController.getClassrooms(req); return res.status(response.status).json(response)})

LiteracyRouter.get('/:id/:year/classroom', havePermission, async (req: Request, res: Response) => { const response = await literacyController.getStudentClassrooms(req); return res.status(response.status).json(response)})

LiteracyRouter.get('/:id/:year/totals', havePermission, async (req: Request, res: Response) => { const response = await literacyController.getTotals(req); return res.status(response.status).json(response)})

LiteracyRouter.put('/:id/classroom', havePermission, async (req: Request, res: Response) => { const response = await literacyController.updateLiteracy(req.body); return res.status(response.status).json(response)})

LiteracyRouter.put('/many', havePermission, async (req: Request, res: Response) => { const response = await literacyController.updateMany(req.body); return res.status(response.status).json(response)})