import { NextFunction, Request, Response } from "express";

import permissions from '../utils/permissions'

export default (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user } = req.body
    const entity = req.baseUrl.split('/')[1].split('-').join('')
    const method = req.method
    const condition = permissions(user.category, entity, method)
    if(!condition) {
      return res.status(403).json({
        message: 'Unauthorized!'
      })
    }
    next()
  } catch (error: any) { return { status: 500, message: error.message } }
}
