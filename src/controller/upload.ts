// controller/upload.ts
import { gerarPresignedUrl, moverLegadoParaQuestions } from '../services/s3.service';
import { connectionPool } from '../services/db';

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

  // Temporário: migra imagens legadas da raiz do bucket (question_image.s3Key
  // sem "/") pra questions/. Move no S3 primeiro; só atualiza o banco se a
  // movimentação der certo. Uma falha num registro não interrompe os demais —
  // fica registrada em "falhas" pra reprocessar depois. Remover rota e método
  // quando a migração for concluída.
  async migrarImagensLegadas(dryRun: boolean) {
    let conn;
    try {
      conn = await connectionPool.getConnection();

      const [rows] = await conn.query(
        `SELECT id, s3Key FROM question_image WHERE active = 1 AND s3Key NOT LIKE '%/%'`
      ) as any[];

      const totalAlvo = rows.length;

      if (dryRun) {
        const amostra = rows.slice(0, 10).map((row: any) => ({
          id: row.id,
          de: row.s3Key,
          para: `questions/${row.s3Key}`,
        }));
        return { status: 200, data: { totalAlvo, amostra } };
      }

      let movidos = 0;
      const falhas: { id: number, s3Key: string, erro: string }[] = [];

      for (const row of rows) {
        try {
          const novaKey = await moverLegadoParaQuestions(row.s3Key);
          await conn.query(`UPDATE question_image SET s3Key = ? WHERE id = ?`, [novaKey, row.id]);
          movidos++;
        } catch (err: any) {
          falhas.push({ id: row.id, s3Key: row.s3Key, erro: err.message });
        }
      }

      return { status: 200, data: { movidos, totalAlvo, falhas } };
    } catch (error: any) {
      return { status: 500, error: error.message };
    } finally {
      if (conn) conn.release();
    }
  }
}

export const uploadController = new UploadController();