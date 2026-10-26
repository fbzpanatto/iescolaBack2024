import { Response } from "express";

export const INTERNAL_ERROR_MESSAGE = 'Erro interno do servidor.'

export function sendResponse<T extends { status: number | string, message?: unknown }>(res: Response, response: T): Response {
  if (response.status === 500 && typeof response.message === 'string') {
    console.error(response.message)
    return res.status(500).json({ ...response, message: INTERNAL_ERROR_MESSAGE })
  }
  return res.status(response.status as number).json(response)
}
