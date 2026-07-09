import { Router, Request } from "express";
import { uploadController as controller } from "../controller/upload";

export const UploadRouter = Router();

UploadRouter.post('/presigned-url', async (req: Request, res: any) => {
  const response = await controller.criarPresignedUrl(req.body.contentType);
  return res.status(response.status).json(response);
});