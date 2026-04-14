import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { PersonCategory } from "../model/PersonCategory";
import { Request } from "express";
import { PER_CAT } from "../utils/enums";

class PersonCategoryController extends GenericController<EntityTarget<PersonCategory>> {
  constructor() { super(PersonCategory) }

  async findAllPerCat(req?: Request) {

    let excludeIds = [PER_CAT.ALUN];
    const userBody = req?.body.user;

    try {
      const qUserTeacher = await this.qTeacherByUser(req?.body.user.user);

      if (!qUserTeacher) { return { status: 404, message: "Usuário não encontrado" } }
      if (qUserTeacher.person.category.id != userBody.category) { return { status: 403, message: "Usuário não autorizado" } }

      if(qUserTeacher.person.category.id === PER_CAT.SUPE){ excludeIds = [...excludeIds, PER_CAT.ADMN] }
      if(qUserTeacher.person.category.id === PER_CAT.FORM){ excludeIds = [...excludeIds, PER_CAT.ADMN, PER_CAT.SUPE] }
      if(qUserTeacher.person.category.id === PER_CAT.DIRE){ excludeIds = [...excludeIds, PER_CAT.ADMN, PER_CAT.SUPE, PER_CAT.FORM] }
      if(qUserTeacher.person.category.id === PER_CAT.VICE){ excludeIds = [...excludeIds, PER_CAT.ADMN, PER_CAT.SUPE, PER_CAT.FORM, PER_CAT.DIRE] }
      if(qUserTeacher.person.category.id === PER_CAT.COOR){ excludeIds = [...excludeIds, PER_CAT.ADMN, PER_CAT.SUPE, PER_CAT.FORM, PER_CAT.DIRE, PER_CAT.VICE] }
      if(qUserTeacher.person.category.id === PER_CAT.SECR){ excludeIds = [...excludeIds, PER_CAT.ADMN, PER_CAT.SUPE, PER_CAT.FORM, PER_CAT.DIRE, PER_CAT.VICE, PER_CAT.COOR] }
      if(qUserTeacher.person.category.id === PER_CAT.MONI){ excludeIds = [...excludeIds, PER_CAT.ADMN, PER_CAT.SUPE, PER_CAT.FORM, PER_CAT.DIRE, PER_CAT.VICE, PER_CAT.COOR, PER_CAT.SECR, PER_CAT.PROF] }
      if(qUserTeacher.person.category.id === PER_CAT.PROF){ excludeIds = [...excludeIds, PER_CAT.ADMN, PER_CAT.SUPE, PER_CAT.FORM, PER_CAT.DIRE, PER_CAT.VICE, PER_CAT.COOR, PER_CAT.SECR, PER_CAT.MONI] }

      const result = await this.findPersonCategories(excludeIds)

      return { status: 200, data: result };
    }
    catch (error: any) { console.error(error); return { status: 500, message: error.message } }
  }
}

export const pCatCtrl = new PersonCategoryController();