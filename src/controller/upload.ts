// controller/upload.ts
import { aplicarNoCache, gerarPresignedUrl, moverLegadoParaQuestions } from '../services/s3.service';
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

  // Temporário: backfill de CacheControl 'no-cache' nas imagens de questão
  // (uploads novos já saem com o header via moverParaQuestions). Roda uma única vez;
  // é idempotente — objetos que já têm o header são pulados. Falha em um objeto
  // não interrompe os demais. Remover rota e método depois de executado.
  //
  // As keys vêm do banco, não de um ListObjectsV2 no bucket, por dois motivos:
  // o usuário IAM do backend não tem s3:ListBucket, e listar por prefixo deixaria
  // de fora as keys legadas da raiz (a maioria, enquanto migrar-legadas não rodar).
  async aplicarNoCacheQuestions(dryRun: boolean) {
    let conn;
    try {
      conn = await connectionPool.getConnection();

      const [rows] = await conn.query(
        `SELECT DISTINCT s3Key FROM question_image WHERE active = 1 ORDER BY s3Key`
      ) as any[];

      const keys: string[] = rows.map((row: any) => row.s3Key as string);
      const totalAlvo = keys.length;

      if (dryRun) {
        const legadas = keys.filter(key => !key.includes('/')).length;
        return {
          status: 200,
          data: { totalAlvo, emQuestions: totalAlvo - legadas, legadasNaRaiz: legadas, amostra: keys.slice(0, 10) },
        };
      }

      const BATCH_SIZE = 10;
      let atualizados = 0;
      let jaOk = 0;
      const falhas: { key: string, erro: string }[] = [];

      for (let i = 0; i < keys.length; i += BATCH_SIZE) {
        const batch = keys.slice(i, i + BATCH_SIZE);

        await Promise.all(batch.map(async (key) => {
          try {
            const alterado = await aplicarNoCache(key);
            if (alterado) { atualizados++ } else { jaOk++ }
          } catch (err) {
            falhas.push({ key, erro: err instanceof Error ? err.message : String(err) });
          }
        }));
      }

      return { status: 200, data: { totalAlvo, atualizados, jaOk, falhas } };
    } catch (error) {
      return { status: 500, error: error instanceof Error ? error.message : String(error) };
    } finally {
      if (conn) conn.release();
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