import express, { NextFunction, Request, Response } from "express";

export const MAX_PDF_BYTES = 10 * 1024 * 1024

const parseRawPdf = express.raw({ type: 'application/pdf', limit: MAX_PDF_BYTES })

export default (req: Request, res: Response, next: NextFunction): void => {
  parseRawPdf(req, res, (error?: unknown) => {
    if (!error) { return next() }
    const tooLarge = (error as { type?: string }).type === 'entity.too.large'
    res.status(400).json({ status: 400, message: tooLarge ? 'O arquivo excede o limite de 10 MB.' : 'Não foi possível ler o arquivo enviado.' })
  })
}
