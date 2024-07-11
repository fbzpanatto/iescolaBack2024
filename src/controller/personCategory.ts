import { GenericController } from "./genericController";
import { EntityManager, EntityTarget, FindManyOptions, ObjectLiteral } from "typeorm";
import { PersonCategory } from "../model/PersonCategory";
import { Request } from "express";
import { AppDataSource } from "../data-source";
import { pc } from "../utils/personCategories";

class PersonCategoryController extends GenericController<
  EntityTarget<PersonCategory>
> {
  constructor() {
    super(PersonCategory);
  }

  override async findAllWhere(options: FindManyOptions<ObjectLiteral> | undefined, request?: Request, transaction?: EntityManager) {
    
    let excludeIds = [pc.ALUN];
    const userBody = request?.body.user;

    try {

      if(!transaction){
        const userTeacherFromFront = await this.teacherByUser(userBody.user)

        if (!userTeacherFromFront) { return { status: 404, message: "Usuário não encontrado" } }
        if (userTeacherFromFront.person.category.id != userBody.category) { return { status: 403, message: "Usuário não autorizado" } }
  
        const result = await AppDataSource.getRepository(PersonCategory)
          .createQueryBuilder("personCategory")
          .where("personCategory.id NOT IN (:...ids)", { ids: excludeIds })
          .getMany();
  
        return { status: 200, data: result };
      }

      const userTeacherFromFront = await this.teacherByUser(userBody.user, transaction)

      if (!userTeacherFromFront) { return { status: 404, message: "Usuário não encontrado" } }  
      if (userTeacherFromFront.person.category.id != userBody.category) { return { status: 403, message: "Usuário não autorizado" } }

      if(userTeacherFromFront.person.category.id === pc.SUPE){
        excludeIds = [...excludeIds, pc.ADMN]
      }

      if(userTeacherFromFront.person.category.id === pc.DIRE){
        excludeIds = [...excludeIds, pc.ADMN, pc.SUPE, pc.DIRE]
      }

      if(userTeacherFromFront.person.category.id === pc.VICE){
        excludeIds = [...excludeIds, pc.ADMN, pc.SUPE, pc.DIRE, pc.VICE]
      }

      if(userTeacherFromFront.person.category.id === pc.COOR){
        excludeIds = [...excludeIds, pc.ADMN, pc.SUPE, pc.DIRE, pc.VICE]
      }

      if(userTeacherFromFront.person.category.id === pc.SECR){
        excludeIds = [...excludeIds, pc.ADMN, pc.SUPE, pc.DIRE, pc.VICE, pc.COOR]
      }

      if(userTeacherFromFront.person.category.id === pc.MONI){
        excludeIds = [...excludeIds, pc.ADMN, pc.SUPE, pc.DIRE, pc.VICE, pc.COOR, pc.SECR, pc.MONI]
      }

      if(userTeacherFromFront.person.category.id === pc.PROF){
        excludeIds = [...excludeIds, pc.ADMN, pc.SUPE, pc.DIRE, pc.VICE, pc.COOR, pc.SECR, pc.MONI]
      }

      const result = await transaction.getRepository(PersonCategory)
        .createQueryBuilder("personCategory")
        .where("personCategory.id NOT IN (:...ids)", { ids: excludeIds })
        .getMany();

      return { status: 200, data: result };
      
    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const personCategoryController = new PersonCategoryController();
