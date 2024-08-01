import { GenericController } from "./genericController";
import { EntityManager, EntityTarget } from "typeorm";
import { PersonCategory } from "../model/PersonCategory";
import { Request } from "express";
import { pc } from "../utils/personCategories";
import { AppDataSource } from "../data-source";

class PersonCategoryController extends GenericController<EntityTarget<PersonCategory>> {
  constructor() { super(PersonCategory) }

  async findAllPerCat(request?: Request, CONN?: EntityManager) {
    
    let excludeIds = [pc.ALUN];
    const userBody = request?.body.user;

    try {
      if(!CONN){
        const uTeacher = await this.teacherByUser(userBody.user)

        if (!uTeacher) { return { status: 404, message: "Usuário não encontrado" } }
        if (uTeacher.person.category.id != userBody.category) { return { status: 403, message: "Usuário não autorizado" } }

        if(uTeacher.person.category.id === pc.SUPE){ excludeIds = [...excludeIds, pc.ADMN] }
        if(uTeacher.person.category.id === pc.DIRE){ excludeIds = [...excludeIds, pc.ADMN, pc.SUPE, pc.FORM, pc.DIRE] }
        if(uTeacher.person.category.id === pc.VICE){ excludeIds = [...excludeIds, pc.ADMN, pc.SUPE, pc.FORM, pc.DIRE, pc.VICE] }
        if(uTeacher.person.category.id === pc.COOR){ excludeIds = [...excludeIds, pc.ADMN, pc.SUPE, pc.FORM, pc.DIRE, pc.VICE] }
        if(uTeacher.person.category.id === pc.SECR){ excludeIds = [...excludeIds, pc.ADMN, pc.SUPE, pc.FORM, pc.DIRE, pc.VICE, pc.COOR] }
        if(uTeacher.person.category.id === pc.MONI){ excludeIds = [...excludeIds, pc.ADMN, pc.SUPE, pc.FORM, pc.DIRE, pc.VICE, pc.COOR, pc.SECR, pc.MONI] }
        if(uTeacher.person.category.id === pc.PROF){ excludeIds = [...excludeIds, pc.ADMN, pc.SUPE, pc.FORM, pc.DIRE, pc.VICE, pc.COOR, pc.SECR, pc.MONI] }

        const result = await AppDataSource.getRepository(PersonCategory).createQueryBuilder("personCategory").where("personCategory.id NOT IN (:...ids)", { ids: excludeIds }).getMany();
        return { status: 200, data: result };
      }

      const uTeacher = await this.teacherByUser(userBody.user, CONN)

      if (!uTeacher) { return { status: 404, message: "Usuário não encontrado" } }
      if (uTeacher.person.category.id != userBody.category) { return { status: 403, message: "Usuário não autorizado" } }

      if(uTeacher.person.category.id === pc.SUPE){ excludeIds = [...excludeIds, pc.ADMN] }
      if(uTeacher.person.category.id === pc.DIRE){ excludeIds = [...excludeIds, pc.ADMN, pc.SUPE, pc.FORM, pc.DIRE] }
      if(uTeacher.person.category.id === pc.VICE){ excludeIds = [...excludeIds, pc.ADMN, pc.SUPE, pc.FORM, pc.DIRE, pc.VICE] }
      if(uTeacher.person.category.id === pc.COOR){ excludeIds = [...excludeIds, pc.ADMN, pc.SUPE, pc.FORM, pc.DIRE, pc.VICE] }
      if(uTeacher.person.category.id === pc.SECR){ excludeIds = [...excludeIds, pc.ADMN, pc.SUPE, pc.FORM, pc.DIRE, pc.VICE, pc.COOR] }
      if(uTeacher.person.category.id === pc.MONI){ excludeIds = [...excludeIds, pc.ADMN, pc.SUPE, pc.FORM, pc.DIRE, pc.VICE, pc.COOR, pc.SECR, pc.MONI] }
      if(uTeacher.person.category.id === pc.PROF){ excludeIds = [...excludeIds, pc.ADMN, pc.SUPE, pc.FORM, pc.DIRE, pc.VICE, pc.COOR, pc.SECR, pc.MONI] }

      const result = await CONN?.getRepository(PersonCategory).createQueryBuilder("personCategory").where("personCategory.id NOT IN (:...ids)", { ids: excludeIds }).getMany();
      return { status: 200, data: result };
    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const pCatCtrl = new PersonCategoryController();
