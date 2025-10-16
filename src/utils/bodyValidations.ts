import { Request, NextFunction } from 'express'

interface Object { [key: string]: any }

const ojbRes = (status: number, message: string ) => { return { status, message } }

export const invalidValues = (res: any, _: Request) => {
  const msg = 'Valor(es) inválido(s) no corpo da requisição.'
  return res.status(400).json(ojbRes(400, msg))
}

export const unexpectedFn = (req: Request, res: any, next: NextFunction, schema: Object) => {
  const msg = 'Campo(s) inesperado(s) no corpo da requisição.'
  const unexpectedFields = Object.keys(req.body).filter(key => !schema.hasOwnProperty(key));
  return unexpectedFields.length ? res.status(400).json(ojbRes(400, msg)) : next()
}