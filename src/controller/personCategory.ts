import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { PersonCategory } from "../model/PersonCategory";
import { Request } from "express";
import { pc } from "../utils/personCategories";

class PersonCategoryController extends GenericController<EntityTarget<PersonCategory>> {
  constructor() { super(PersonCategory) }

  async findAllPerCat(req?: Request) {

    let excludeIds = [pc.ALUN];
    const userBody = req?.body.user;

    try {
      const qUserTeacher = await this.qTeacherByUser(req?.body.user.user);

      if (!qUserTeacher) { return { status: 404, message: "Usuário não encontrado" } }
      if (qUserTeacher.person.category.id != userBody.category) { return { status: 403, message: "Usuário não autorizado" } }

      if(qUserTeacher.person.category.id === pc.SUPE){ excludeIds = [...excludeIds, pc.ADMN] }
      if(qUserTeacher.person.category.id === pc.FORM){ excludeIds = [...excludeIds, pc.ADMN, pc.SUPE] }
      if(qUserTeacher.person.category.id === pc.DIRE){ excludeIds = [...excludeIds, pc.ADMN, pc.SUPE, pc.FORM] }
      if(qUserTeacher.person.category.id === pc.VICE){ excludeIds = [...excludeIds, pc.ADMN, pc.SUPE, pc.FORM, pc.DIRE] }
      if(qUserTeacher.person.category.id === pc.COOR){ excludeIds = [...excludeIds, pc.ADMN, pc.SUPE, pc.FORM, pc.DIRE, pc.VICE] }
      if(qUserTeacher.person.category.id === pc.SECR){ excludeIds = [...excludeIds, pc.ADMN, pc.SUPE, pc.FORM, pc.DIRE, pc.VICE, pc.COOR] }
      if(qUserTeacher.person.category.id === pc.MONI){ excludeIds = [...excludeIds, pc.ADMN, pc.SUPE, pc.FORM, pc.DIRE, pc.VICE, pc.COOR, pc.SECR, pc.PROF] }
      if(qUserTeacher.person.category.id === pc.PROF){ excludeIds = [...excludeIds, pc.ADMN, pc.SUPE, pc.FORM, pc.DIRE, pc.VICE, pc.COOR, pc.SECR, pc.MONI] }

      const result = await this.findPersonCategories(excludeIds)

      return { status: 200, data: result };
    }
    catch (error: any) { console.error(error); return { status: 500, message: error.message } }
  }
}

export const pCatCtrl = new PersonCategoryController();