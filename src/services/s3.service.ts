import { S3Client, PutObjectCommand, CopyObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

interface PresignedUrlResult {
  uploadUrl: string;
  key: string;
}

/**
 * Gera URL pré-assinada para upload em tmp/.
 *
 * NÃO adicionar CacheControl aqui. O presigned PUT assina os headers do
 * PutObjectCommand, e o frontend (question.component.ts -> uploadFile) só
 * envia 'Content-Type' no PUT. Qualquer header extra aqui quebraria a
 * assinatura e o upload voltaria 403 SignatureDoesNotMatch.
 *
 * O CacheControl é aplicado no destino final (questions/) em moverParaQuestions.
 */
export async function gerarPresignedUrl(contentType: string): Promise<PresignedUrlResult> {
  const extensao = contentType.split('/')[1];
  const key = `tmp/${crypto.randomUUID()}.${extensao}`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });

  return { uploadUrl, key };
}

export async function deletarDoS3(key: string): Promise<void> {
  await s3Client.send(new DeleteObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET as string,
    Key: key,
  }));
}

/**
 * Move um arquivo de tmp/ para questions/.
 *
 * MetadataDirective: 'REPLACE' força o S3 a ignorar os metadados do objeto
 * de origem. Consequência: precisamos passar ContentType explicitamente,
 * senão o S3 assume 'binary/octet-stream' e o navegador não exibe a imagem.
 * Por isso o HeadObject abaixo — lê o ContentType real do tmp/ e repassa.
 *
 * Não dá pra usar MetadataDirective: 'COPY' (padrão) porque COPY preserva
 * TODOS os metadados da origem, e não teria como injetar só o CacheControl.
 */
export async function moverParaQuestions(tmpKey: string): Promise<string> {
  const bucket = process.env.AWS_S3_BUCKET as string;
  const fileName = tmpKey.split('/').pop();
  const finalKey = `questions/${fileName}`;

  const head = await s3Client.send(new HeadObjectCommand({
    Bucket: bucket,
    Key: tmpKey,
  }));

  await s3Client.send(new CopyObjectCommand({
    Bucket: bucket,
    CopySource: `${bucket}/${tmpKey}`,
    Key: finalKey,
    CacheControl: 'no-cache',
    ContentType: head.ContentType,
    MetadataDirective: 'REPLACE',
  }));

  await s3Client.send(new DeleteObjectCommand({
    Bucket: bucket,
    Key: tmpKey,
  }));

  return finalKey;
}

/**
 * Mesmo padrão de moverParaQuestions, mas para lessons/.
 */
export async function moverParaLessons(tmpKey: string): Promise<string> {
  const bucket = process.env.AWS_S3_BUCKET as string;
  const fileName = tmpKey.split('/').pop();
  const finalKey = `lessons/${fileName}`;

  const head = await s3Client.send(new HeadObjectCommand({
    Bucket: bucket,
    Key: tmpKey,
  }));

  await s3Client.send(new CopyObjectCommand({
    Bucket: bucket,
    CopySource: `${bucket}/${tmpKey}`,
    Key: finalKey,
    CacheControl: 'no-cache',
    ContentType: head.ContentType,
    MetadataDirective: 'REPLACE',
  }));

  await s3Client.send(new DeleteObjectCommand({
    Bucket: bucket,
    Key: tmpKey,
  }));

  return finalKey;
}