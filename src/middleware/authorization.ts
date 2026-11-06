import {NextFunction, Request, Response} from "express";
import jwt from 'jsonwebtoken';
import { JwtPayload } from "../interfaces/interfaces";
import { REFRESH_TYPE } from "../utils/sessionToken";

const tokenSecret = process.env.SECRET;

export default (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if(!authHeader) { return res.status(401).json({ message: 'Credenciais Inválidas' }) }
    const token = authHeader.split(' ')[1];

    const payload = jwt.verify(token, tokenSecret ?? '') as JwtPayload & { typ?: string }
    if (payload.typ === REFRESH_TYPE) { return res.status(401).json({ message: 'Credenciais Inválidas' }) }
    req.user = payload

    next()
  }
  catch (error: any) {
    console.log(error)
    return res.status(401).json({ message: 'Não foi possível continuar com a sua requisição. Faça o login novamente.' }) 
  }
}
