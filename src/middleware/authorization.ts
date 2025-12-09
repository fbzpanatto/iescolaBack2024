import { NextFunction, Request } from "express";
import jwt from 'jsonwebtoken';

export default (req: Request, res: any, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if(!authHeader) { return res.status(401).json({ message: 'Credenciais Inválidas' }) }
    const token = authHeader.split(' ')[1];

    const user = jwt.verify(token, 'SECRET')

    req.body = { ...req.body, user }

    req.body.user = jwt.verify(token, 'SECRET')
    next()
  }
  catch (error: any) {
    console.log(error)
    return res.status(401).json({ message: 'Não foi possível continuar com a sua requisição. Faça o login novamente.' }) 
  }
}
