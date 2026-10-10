// controller/upload.ts
import { gerarPresignedUrl } from '../services/s3.service';

const ALLOWED_CONTENT_TYPES: Record<string, string[]> = {
  lesson: ['text/html'],
  question: ['image/png', 'image/jpeg', 'image/jpg'],
};

class UploadController {
  async criarPresignedUrl(contentType: string, type: string) {
    try {
      const whitelist = ALLOWED_CONTENT_TYPES[type];
      if (!whitelist) {
        return { status: 400, error: 'Tipo de upload não reconhecido.' };
      }
      if (!whitelist.includes(contentType)) {
        return { status: 400, error: 'Tipo de arquivo não permitido para esse upload.' };
      }

      const resultado = await gerarPresignedUrl(contentType);
      return { status: 200, data: resultado };
    } catch (err) {
      return { status: 500, error: 'Erro ao gerar URL de upload' };
    }
  }
}

export const uploadController = new UploadController();