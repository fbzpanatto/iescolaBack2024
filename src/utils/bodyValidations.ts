import { Request, NextFunction } from 'express'

interface Object { [key: string]: any }

const ojbRes = (status: number, message: string ) => { return { status, message } }

export const invalidValues = (res: any, req: Request) => {
  // validationResult está no req; extrai qual campo falhou e por quê.
  const { validationResult } = require('express-validator')
  const erros = validationResult(req).array()
  const detalhe = erros.length ? ` Campo: ${erros[0].path}.` : ''
  const msg = 'Valor(es) inválido(s) no corpo da requisição.' + detalhe
  return res.status(400).json(ojbRes(400, msg))
}

export const unexpectedFn = (req: Request, res: any, next: NextFunction, schema: Object) => {
  const unexpectedFields = Object.keys(req.body).filter(key => !schema.hasOwnProperty(key));
  const msg = 'Campo(s) inesperado(s) no corpo da requisição: ' + unexpectedFields.join(', ')
  return unexpectedFields.length ? res.status(400).json(ojbRes(400, msg)) : next()
}

export const unexpectedQueryFn = (req: Request, res: any, next: NextFunction, schema: Object) => {
  const unexpectedFields = Object.keys(req.query ?? {}).filter(key => !schema.hasOwnProperty(key));
  const msg = 'Campo(s) inesperado(s) na query da requisição: ' + unexpectedFields.join(', ')
  return unexpectedFields.length ? res.status(400).json(ojbRes(400, msg)) : next()
}