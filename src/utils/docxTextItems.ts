import { inflateRawSync } from "zlib";
import { HttpError } from "./helpers";
import { PdfTextItem } from "./answerKeyParser";

export const DOCX_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04])

const MAX_XML_BYTES = 20 * 1024 * 1024
const MERGED_CELLS_ERROR = 'O documento tem células mescladas na vertical, que não são suportadas. Desfaça a mesclagem ou envie o gabarito em PDF.'
const READ_ERROR = 'Não foi possível ler o documento do Word.'
const LINE_STEP = 10
const COLUMN_STEP = 100
const COLUMN_WIDTH = 50
const NAMED_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

// shortcut: zip64 e arquivos criptografados não são suportados, devolve erro de leitura; upgrade só se um .docx real falhar.
const readZipEntry = (zip: Buffer, wanted: string): Buffer => {
  const eocd = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  if (eocd < 0 || eocd + 22 > zip.length) { throw new HttpError(400, READ_ERROR) }

  let pointer = zip.readUInt32LE(eocd + 16)
  for (let entry = 0, total = zip.readUInt16LE(eocd + 10); entry < total; entry++) {
    if (pointer + 46 > zip.length || zip.readUInt32LE(pointer) !== 0x02014b50) { break }
    const method = zip.readUInt16LE(pointer + 10)
    const compressedSize = zip.readUInt32LE(pointer + 20)
    const nameLength = zip.readUInt16LE(pointer + 28)
    const extraLength = zip.readUInt16LE(pointer + 30)
    const commentLength = zip.readUInt16LE(pointer + 32)
    const localOffset = zip.readUInt32LE(pointer + 42)
    const name = zip.toString('utf8', pointer + 46, pointer + 46 + nameLength)
    pointer += 46 + nameLength + extraLength + commentLength
    if (name !== wanted) { continue }

    if (localOffset + 30 > zip.length || zip.readUInt32LE(localOffset) !== 0x04034b50) { break }
    const start = localOffset + 30 + zip.readUInt16LE(localOffset + 26) + zip.readUInt16LE(localOffset + 28)
    const data = zip.subarray(start, start + compressedSize)
    if (method === 0) { return data }
    if (method === 8) { return inflateRawSync(data, { maxOutputLength: MAX_XML_BYTES }) }
    break
  }
  throw new HttpError(400, 'O arquivo enviado não é um documento do Word válido.')
}

const decode = (text: string): string => text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
  if (entity[0] !== '#') { return NAMED_ENTITIES[entity.toLowerCase()] ?? match }
  const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1))
  return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match
})

const textOf = (xml: string): string => decode(
  xml.replace(/<w:(?:br|tab)\b[^>]*\/>/g, ' ').replace(/<[^>]+>/g, '')
).replace(/\s+/g, ' ').trim()

const paragraphsOf = (xml: string): string[] => xml.split('</w:p>').map(textOf).filter(Boolean)

// Converte o .docx nos mesmos itens posicionados que o PDF gera: cada parágrafo é uma linha (y) e cada célula uma coluna (x).
// Número e gabarito ficam na primeira linha da célula (alinhados ao topo), como o parser espera.
// Célula mesclada na vertical (vMerge) quebra a associação número/habilidade; recusa com erro claro em vez de gravar errado.
export function docxToTextItems(buffer: Buffer): PdfTextItem[] {
  let xml: string
  try { xml = readZipEntry(buffer, 'word/document.xml').toString('utf8') }
  catch (error) {
    if (error instanceof HttpError) { throw error }
    throw new HttpError(400, READ_ERROR)
  }

  if (/<w:vMerge\b/.test(xml)) { throw new HttpError(400, MERGED_CELLS_ERROR) }

  const items: PdfTextItem[] = []
  let y = 0
  for (const match of xml.matchAll(/<w:tr\b[\s\S]*?<\/w:tr>|<w:p\b[\s\S]*?<\/w:p>/g)) {
    const cells = match[0].startsWith('<w:tr') ? Array.from(match[0].matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g), cell => paragraphsOf(cell[0])) : [paragraphsOf(match[0])]
    cells.forEach((lines, column) => lines.forEach((str, line) => items.push({ page: 1, str, x: column * COLUMN_STEP, y: y + line * LINE_STEP, width: COLUMN_WIDTH })))
    y += (Math.max(1, ...cells.map(lines => lines.length)) + 1) * LINE_STEP
  }
  return items
}
