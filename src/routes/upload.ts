import { Router, Request } from "express";
import { uploadController as controller } from "../controller/upload";
import havePermission from "../middleware/havePermission";

export const UploadRouter = Router();

UploadRouter.post('/presigned-url', havePermission, async (req: Request, res: any) => {
  const response = await controller.criarPresignedUrl(req.body.contentType, req.body.type);
  return res.status(response.status).json(response);
});

// Temporário — remover depois que a migração de imagens legadas for concluída.
// dryRun sempre true por padrão; só executa de verdade com { dryRun: false } explícito.
UploadRouter.post('/migrar-legadas', havePermission, async (req: Request, res: any) => {
  const dryRun = req.body?.dryRun !== false;
  const response = await controller.migrarImagensLegadas(dryRun);
  return res.status(response.status).json(response);
});