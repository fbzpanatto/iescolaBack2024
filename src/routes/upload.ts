import { Router, Request } from "express";
import { uploadController as controller } from "../controller/upload";
import havePermission from "../middleware/havePermission";

export const UploadRouter = Router();

UploadRouter.post('/presigned-url', havePermission, async (req: Request, res: any) => {
  const response = await controller.criarPresignedUrl(req.body.contentType, req.body.type);
  return res.status(response.status).json(response);
});