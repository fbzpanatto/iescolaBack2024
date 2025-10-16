import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { PersonCategory } from "../model/PersonCategory";
import { Request } from "express";
import { PERSON_CATEGORIES } from "../utils/enums";

class PersonCategoryController extends GenericController<EntityTarget<PersonCategory>> {
  constructor() { super(PersonCategory) }

  async findAllPerCat(req?: Request) {

    let excludeIds = [PERSON_CATEGORIES.ALUN];
    const userBody = req?.body.user;

    try {
      const qUserTeacher = await this.qTeacherByUser(req?.body.user.user);

      if (!qUserTeacher) { return { status: 404, message: "Usuário não encontrado" } }
      if (qUserTeacher.person.category.id != userBody.category) { return { status: 403, message: "Usuário não autorizado" } }

      if(qUserTeacher.person.category.id === PERSON_CATEGORIES.SUPE){ excludeIds = [...excludeIds, PERSON_CATEGORIES.ADMN] }
      if(qUserTeacher.person.category.id === PERSON_CATEGORIES.FORM){ excludeIds = [...excludeIds, PERSON_CATEGORIES.ADMN, PERSON_CATEGORIES.SUPE] }
      if(qUserTeacher.person.category.id === PERSON_CATEGORIES.DIRE){ excludeIds = [...excludeIds, PERSON_CATEGORIES.ADMN, PERSON_CATEGORIES.SUPE, PERSON_CATEGORIES.FORM] }
      if(qUserTeacher.person.category.id === PERSON_CATEGORIES.VICE){ excludeIds = [...excludeIds, PERSON_CATEGORIES.ADMN, PERSON_CATEGORIES.SUPE, PERSON_CATEGORIES.FORM, PERSON_CATEGORIES.DIRE] }
      if(qUserTeacher.person.category.id === PERSON_CATEGORIES.COOR){ excludeIds = [...excludeIds, PERSON_CATEGORIES.ADMN, PERSON_CATEGORIES.SUPE, PERSON_CATEGORIES.FORM, PERSON_CATEGORIES.DIRE, PERSON_CATEGORIES.VICE] }
      if(qUserTeacher.person.category.id === PERSON_CATEGORIES.SECR){ excludeIds = [...excludeIds, PERSON_CATEGORIES.ADMN, PERSON_CATEGORIES.SUPE, PERSON_CATEGORIES.FORM, PERSON_CATEGORIES.DIRE, PERSON_CATEGORIES.VICE, PERSON_CATEGORIES.COOR] }
      if(qUserTeacher.person.category.id === PERSON_CATEGORIES.MONI){ excludeIds = [...excludeIds, PERSON_CATEGORIES.ADMN, PERSON_CATEGORIES.SUPE, PERSON_CATEGORIES.FORM, PERSON_CATEGORIES.DIRE, PERSON_CATEGORIES.VICE, PERSON_CATEGORIES.COOR, PERSON_CATEGORIES.SECR, PERSON_CATEGORIES.PROF] }
      if(qUserTeacher.person.category.id === PERSON_CATEGORIES.PROF){ excludeIds = [...excludeIds, PERSON_CATEGORIES.ADMN, PERSON_CATEGORIES.SUPE, PERSON_CATEGORIES.FORM, PERSON_CATEGORIES.DIRE, PERSON_CATEGORIES.VICE, PERSON_CATEGORIES.COOR, PERSON_CATEGORIES.SECR, PERSON_CATEGORIES.MONI] }

      const result = await this.findPersonCategories(excludeIds)

      return { status: 200, data: result };
    }
    catch (error: any) { console.error(error); return { status: 500, message: error.message } }
  }
}

export const pCatCtrl = new PersonCategoryController();