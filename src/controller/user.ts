import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { User } from "../model/User";

class UserController extends GenericController<EntityTarget<User>> {
  constructor() {
    super(User, { table: 'user', selectColumns: ['id', 'username', 'email', 'password', 'personId'], relations: { person: 'personId' } })
  }
}

export const userController = new UserController();
