import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { PersonCategory } from "../model/PersonCategory";
import { Request } from "express";
import { EXCLUDED_CATEGORIES_BY_ROLE, PER_CAT } from "../utils/enums";

class PersonCategoryController extends GenericController<EntityTarget<PersonCategory>> {
  constructor() { super(PersonCategory) }

  async findAllPerCat(req?: Request) {
    const userBody = req?.body.user;

    try {
      const qUserTeacher = await this.qTeacherByUser(userBody.user);

      if (!qUserTeacher) { return { status: 404, message: "Usuário não encontrado" } }

      const userCategoryId = qUserTeacher.person.category.id;
      if (userCategoryId != userBody.category) { return { status: 403, message: "Usuário não autorizado" } }

      const excludeIds = EXCLUDED_CATEGORIES_BY_ROLE[userCategoryId] || [PER_CAT.ALUN];

      const result = await this.findPersonCategories(excludeIds);

      return { status: 200, data: result };
    }
    catch (error: any) { console.error(error); return { status: 500, message: error.message } }
  }
}

export const pCatCtrl = new PersonCategoryController();