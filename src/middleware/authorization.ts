import {NextFunction, Request, Response} from "express";
import jwt from 'jsonwebtoken';
import { JwtPayload } from "../interfaces/interfaces";

const tokenSecret = process.env.SECRET;

export default (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if(!authHeader) { return res.status(401).json({ message: 'Credenciais Inválidas' }) }
    const token = authHeader.split(' ')[1];

    req.user = jwt.verify(token, tokenSecret ?? '') as JwtPayload

    next()
  }
  catch (error: any) {
    console.log(error)
    return res.status(401).json({ message: 'Não foi possível continuar com a sua requisição. Faça o login novamente.' }) 
  }
}
