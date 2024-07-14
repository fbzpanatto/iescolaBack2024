import { Router, Request, Response } from "express";
import { literacyController as controller } from "../controller/literacy";
import { ID_PARAM, YEAR_NAME_PARAM } from "../middleware/validators";
import havePermission from "../middleware/havePermission";

export const LiteracyRouter = Router();

LiteracyRouter.get('/:year', YEAR_NAME_PARAM, havePermission, async (req: Request, res: Response) => { const response = await controller.getClassrooms(req); return res.status(response.status).json(response)})

LiteracyRouter.get('/:id/:year/classroom', [ ID_PARAM, YEAR_NAME_PARAM ], havePermission, async (req: Request, res: Response) => { const response = await controller.getStudentClassrooms(req); return res.status(response.status).json(response)})

LiteracyRouter.get('/:id/:year/totals', [ ID_PARAM, YEAR_NAME_PARAM ], havePermission, async (req: Request, res: Response) => { const response = await controller.getTotals(req); return res.status(response.status).json(response)})

LiteracyRouter.put('/:id/classroom', ID_PARAM, havePermission, async (req: Request, res: Response) => { const response = await controller.updateLiteracy(req.body); return res.status(response.status).json(response)})

LiteracyRouter.put('/many', havePermission, async (req: Request, res: Response) => { const response = await controller.updateMany(req.body); return res.status(response.status).json(response)})