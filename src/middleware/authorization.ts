import { NextFunction, Request, Response } from "express";
import jwt from 'jsonwebtoken';

export default (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if(!authHeader) { return res.status(401).json({ message: 'Credenciais Inválidas' }) }
    const token = authHeader.split(' ')[1];
    req.body.user = jwt.verify(token, 'SECRET')
    next()
  } catch (error: any) {
    return res.status(401).json({ message: 'Não foi possível continuar com a sua requisição. Faça o login novamente.' }) 
  }
}
