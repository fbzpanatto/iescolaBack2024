import { HttpError } from "./helpers";
import { isRichTitle, sanitizeRichTitle, stripControlChars } from "./richText";

export const BLOCK_TEXT_MAX_LENGTH = 5000
export const BLOCK_CAPTION_MAX_LENGTH = 300
export const MAX_QUESTION_BLOCKS = 10

export type QuestionBlockKind = 'text' | 'image'
export type ValidatedBlock = { id: number | null, type: QuestionBlockKind, order: number, content: string | null, s3Key: string | null, caption: string | null }

function blockCaption(value: unknown): string | null {
  if (value === undefined || value === null) { return null }
  if (typeof value !== 'string') { throw new HttpError(400, "Legenda de imagem inválida.") }
  const clean = stripControlChars(value).replace(/\s+/g, ' ').trim()
  if (clean === '') { return null }
  if (clean.length > BLOCK_CAPTION_MAX_LENGTH) { throw new HttpError(400, `A legenda da imagem deve ter no máximo ${BLOCK_CAPTION_MAX_LENGTH} caracteres.`) }
  return clean
}

function isBlockImageKey(key: string): boolean {
  return key.startsWith('tmp/') || key.startsWith('questions/')
}

export function prepareQuestionBlocks(raw: unknown): ValidatedBlock[] | null {
  if (raw === undefined || raw === null) { return null }
  if (!Array.isArray(raw)) { throw new HttpError(400, "blocks deve ser um array.") }
  if (raw.length > MAX_QUESTION_BLOCKS) { throw new HttpError(400, `A questão aceita no máximo ${MAX_QUESTION_BLOCKS} blocos.`) }

  return raw.map((item: unknown, index: number): ValidatedBlock => {
    if (typeof item !== 'object' || item === null) { throw new HttpError(400, "Bloco inválido.") }
    const { id, type, content, s3Key, caption } = item as { id?: unknown, type?: unknown, content?: unknown, s3Key?: unknown, caption?: unknown }
    const blockId = id === undefined || id === null ? null : Number(id)
    if (blockId !== null && !Number.isInteger(blockId)) { throw new HttpError(400, "Id de bloco inválido.") }
    const order = index + 1

    if (type === 'text') {
      if (typeof content !== 'string') { throw new HttpError(400, "Bloco de texto inválido.") }
      const source = stripControlChars(content)
      if (!isRichTitle(source)) { throw new HttpError(400, "Bloco de texto inválido.") }
      const clean = sanitizeRichTitle(source)
      if (clean === null) { throw new HttpError(400, "Formatação do bloco de texto inválida.") }
      if (clean.length > BLOCK_TEXT_MAX_LENGTH) { throw new HttpError(400, `O bloco de texto deve ter no máximo ${BLOCK_TEXT_MAX_LENGTH} caracteres.`) }
      return { id: blockId, type: 'text', order, content: clean, s3Key: null, caption: null }
    }

    if (type === 'image') {
      if (typeof s3Key !== 'string' || !isBlockImageKey(s3Key)) { throw new HttpError(400, "Imagem do bloco inválida.") }
      return { id: blockId, type: 'image', order, content: null, s3Key, caption: blockCaption(caption) }
    }

    throw new HttpError(400, "Tipo de bloco inválido. Use 'text' ou 'image'.")
  })
}
