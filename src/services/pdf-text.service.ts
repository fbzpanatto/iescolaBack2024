import { HttpError } from "../utils/helpers";
import { PdfTextItem } from "../utils/answerKeyParser";

const MAX_PAGES = 20

interface PdfJsTextItem { str?: unknown, transform?: number[], width?: number }
interface PdfJsPage { getViewport(params: { scale: number }): { height: number }, getTextContent(): Promise<{ items: PdfJsTextItem[] }> }
interface PdfJsDocument { numPages: number, getPage(pageNumber: number): Promise<PdfJsPage> }
interface PdfJsLoadingTask { promise: Promise<PdfJsDocument>, destroy(): Promise<void> }
interface PdfJsLib { getDocument(params: Record<string, unknown>): PdfJsLoadingTask }

const READ_ERROR = 'Não foi possível ler o PDF.'

// pdfjs-dist 6 só publica ESM; require() carrega o módulo ESM no Node 22 e o tsc (CommonJS) não reescreve a chamada.
const loadPdfJs = (): PdfJsLib => require('pdfjs-dist/legacy/build/pdf.mjs') as PdfJsLib

class PdfTextService {

  async extractItems(buffer: Buffer): Promise<PdfTextItem[]> {
    let task: PdfJsLoadingTask | undefined
    try {
      task = loadPdfJs().getDocument({ data: new Uint8Array(buffer), isEvalSupported: false, disableFontFace: true, useSystemFonts: false, verbosity: 0 })
      const doc = await task.promise
      if (doc.numPages > MAX_PAGES) { throw new HttpError(400, `O PDF deve ter no máximo ${MAX_PAGES} páginas.`) }

      const items: PdfTextItem[] = []
      for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
        const page = await doc.getPage(pageNumber)
        const viewportHeight = page.getViewport({ scale: 1 }).height
        const content = await page.getTextContent()
        for (const item of content.items) {
          if (typeof item.str !== 'string' || item.str.trim() === '' || !item.transform) { continue }
          items.push({ page: pageNumber, str: item.str, x: item.transform[4], y: viewportHeight - item.transform[5], width: item.width ?? 0 })
        }
      }
      return items
    }
    catch (error) {
      if (error instanceof HttpError) { throw error }
      console.error(error)
      throw new HttpError(400, READ_ERROR)
    }
    finally { if (task) { await task.destroy().catch(() => undefined) } }
  }
}

export const pdfTextService = new PdfTextService()
