import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { User } from "../model/User";
import { AppDataSource } from "../data-source";

class UserController extends GenericController<EntityTarget<User>> {

  constructor() { super(User) }

  override async save(body: User) {
    try {
      const user = await AppDataSource.getRepository(User).save(body);
      return { status: 201, data: user };
    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const userController = new UserController();
