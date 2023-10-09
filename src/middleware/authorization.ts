import { NextFunction, Request, Response } from "express";
import jwt from 'jsonwebtoken';

export default (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if(!authHeader) { return { status: 401, message: 'Credenciais Inválidas' } }
    const token = authHeader.split(' ')[1];
    req.body.user = jwt.verify(token, 'SECRET')
    next()
  } catch (error: any) { return { status: 500, message: error.message } }
}
