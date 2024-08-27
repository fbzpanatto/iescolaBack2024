import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { User } from "../model/User";
import { Request } from "express";
import { AppDataSource } from "../data-source";
import { sign, verify, JwtPayload } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { generatePassword } from "../utils/generatePassword";

class LoginController extends GenericController<EntityTarget<User>> {
  constructor() { super(User) }

  async login(req: Request) {
    const { email, password: frontPass } = req.body;
    try {
      return await AppDataSource.transaction(async(CONN) => {
        const user = await CONN.findOne(User,{ relations: ["person.category"], where: { email } });

        if (!user) { return { status: 404, message: "Credenciais Inválidas" } }

        const condition = bcrypt.compareSync(frontPass, user.password)

        if (!user || !condition) { return { status: 401, message: "Credenciais Inválidas" } }

        const payload = { user: user.id, email: user.email, category: user.person.category.id };

        const token = sign(payload, "SECRET", { expiresIn: 10800 })
        const decoded = verify(token, "SECRET") as JwtPayload;
        const expiresIn = decoded.exp;
        const role = decoded.category;

        return { status: 200, data: { token, expiresIn, role, person: user.person.name } };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async renewPassword(req: Request) {

    const { token: frontToken, password: newPassword } = req.body

    try {
      return await AppDataSource.transaction(async(CONN) => {

        const frontDecoded = verify(frontToken, "SECRET") as JwtPayload;

        if(!frontDecoded) {
          return { status: 401, message: 'Pedido expirado, faça uma nova solicitação para redefinir sua senha na tela de login da aplicação.' }
        }

        const user: User | null = await CONN.findOne(User,{
          relations: ["person.category"], where: { email: frontDecoded.email }
        });

        if (!user) { return { status: 404, message: "Usuário não encontrado" } }

        user.password = generatePassword(newPassword).hashedPassword
        await CONN.save(User, user)

        const payload = { user: user.id, email: user.email, category: user.person.category.id };
        const backendToken = sign(payload, "SECRET", { expiresIn: 10800 })
        const decoded = verify(backendToken, "SECRET") as JwtPayload;
        const expiresIn = decoded.exp;
        const role = decoded.category;

        return { status: 200, data: { token: backendToken, expiresIn, role, person: user.person.name } };
      })
    } catch (error: any) {
      const message: string = 'Pedido expirado. Acesse a aplicação novamente em nova aba de seu navegador, e na tela de login, insira seu email e clique em ESQUECI MINHA SENHA.'
      return { status: 401, message }}
  }
}

export const loginCtrl = new LoginController();
