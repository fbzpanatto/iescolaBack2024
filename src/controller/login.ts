import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { User } from "../model/User";
import { Request } from "express";
import { AppDataSource } from "../data-source";
import { sign, verify, JwtPayload } from 'jsonwebtoken';

class LoginController extends GenericController<EntityTarget<User>> {
  constructor() { super(User) }

  async login(req: Request) {
    const { email, password } = req.body;
    try {
      return await AppDataSource.transaction(async(CONN) => {
        const user = await CONN.findOne(User,{ relations: ["person.category"], where: { email } });

        if (!user || password !== user.password) { return { status: 401, message: "Credenciais Inválidas" } }

        const payload = { user: user.id, email: user.email, category: user.person.category.id };

        const token = sign(payload, "SECRET", { expiresIn: 10800 })
        const decoded = verify(token, "SECRET") as JwtPayload;
        const expiresIn = decoded.exp;
        const role = decoded.category;

        return { status: 200, data: { token, expiresIn, role, person: user.person.name } };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const loginCtrl = new LoginController();
