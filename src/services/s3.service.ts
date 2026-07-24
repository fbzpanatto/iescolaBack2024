import { S3Client, PutObjectCommand, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
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
 * Move um arquivo de um local temporário (tmp/) para o local definitivo (questions/).
 * S3 não tem operação nativa de "mover" — precisa copiar e depois apagar o original.
 * Retorna a nova key definitiva.
 */
export async function moverParaQuestions(tmpKey: string): Promise<string> {
  const bucket = process.env.AWS_S3_BUCKET as string;
  const fileName = tmpKey.split('/').pop();
  const finalKey = `questions/${fileName}`;

  await s3Client.send(new CopyObjectCommand({
    Bucket: bucket,
    CopySource: `${bucket}/${tmpKey}`,
    Key: finalKey,
  }));

  await s3Client.send(new DeleteObjectCommand({
    Bucket: bucket,
    Key: tmpKey,
  }));

  return finalKey;
}

export async function moverParaLessons(tmpKey: string): Promise<string> {
  const bucket = process.env.AWS_S3_BUCKET as string;
  const fileName = tmpKey.split('/').pop();
  const finalKey = `lessons/${fileName}`;

  await s3Client.send(new CopyObjectCommand({
    Bucket: bucket,
    CopySource: `${bucket}/${tmpKey}`,
    Key: finalKey,
  }));

  await s3Client.send(new DeleteObjectCommand({
    Bucket: bucket,
    Key: tmpKey,
  }));

  return finalKey;
}