import { Request, Response, NextFunction } from 'express'
import { ojbRes } from "./response";

interface Object { [key: string]: any }

export const invalidValues = (res: Response, req: Request) => {
  const msg = 'Valor(es) inválido(s) no corpo da requisição.'
  return res.status(400).json(ojbRes(400, msg))
}

export const unexpectedFn = (req: Request, res: Response, next: NextFunction, schema: Object) => {
  const msg = 'Campo(s) inesperado(s) no corpo da requisição.'
  const unexpectedFields = Object.keys(req.body).filter(key => !schema.hasOwnProperty(key));
  console.log('unexpectedFields', unexpectedFields);
  return unexpectedFields.length ? res.status(400).json(ojbRes(400, msg)) : next()
}