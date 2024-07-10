import { NextFunction, Request, Response } from "express";

import permissions from '../utils/permissions'

export default (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user } = req.body
    const entity = req.baseUrl.split('/')[1].split('-').join('')
    const method = req.method
    const condition = permissions(user.category, entity, method)
    if(!condition) { return res.status(403).json({ status: 403, message: 'Você não tem permissão para acessar ou modificar este recurso.' })}
    next()
  } catch (error: any) { return res.status(500).json({ message: error.message })}
}
