import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { User } from "../model/User";
import { Request } from "express";
import { AppDataSource } from "../data-source";
const jwt = require('jsonwebtoken');

class UserController extends GenericController<EntityTarget<User>> {

  constructor() { super(User) }

  async login(req: Request) {

    const { username, password } = req.body

    try {
      const user = await AppDataSource.getRepository(User).findOne({
        relations: [ 'person.category' ],
        where: { username: username }
      })

      if (!user || password !== user.password) { return { status: 401, message: 'Credenciais Inválidas' } }

      const payload = {
        user: user.id,
        username: user.username,
        category: user.person.category.id,
      }

      const token = jwt.sign(payload, 'SECRET', { expiresIn: 10800 })

      return { status: 200, data: { token: token, expiresIn: jwt.decode(token).exp, role: jwt.decode(token).category, person: user.person.name  } }

    } catch (error: any) { return { status: 500, message: error.message } }
  }

  override async save(body: User) {


    try {
      const user = await AppDataSource.getRepository(User).save(body);
      return { status: 201, data: user };
    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const userController = new UserController();
