import { gerarPresignedUrl } from '../services/s3.service';

class UploadController {
  async criarPresignedUrl(contentType: string) {
    if (!contentType) {
      return { status: 400, error: 'contentType é obrigatório' };
    }

    try {
      const resultado = await gerarPresignedUrl(contentType);
      return { status: 200, data: resultado };
    } catch (err) {
      console.error('Erro ao gerar presigned URL:', err);
      return { status: 500, error: 'Erro ao gerar URL de upload' };
    }
  }
}

export const uploadController = new UploadController();