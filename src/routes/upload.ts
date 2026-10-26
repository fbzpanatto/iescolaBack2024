import { Router, Request, Response } from "express";
import { uploadController as controller } from "../controller/upload";
import havePermission from "../middleware/havePermission";
import { sendResponse } from "../utils/sendResponse";

export const UploadRouter = Router();

UploadRouter.post('/presigned-url', havePermission, async (req: Request, res: Response) => {
  const response = await controller.criarPresignedUrl(req.body.contentType, req.body.type);
  return sendResponse(res, response);
});