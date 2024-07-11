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
    
    let excludeIds = [pc.ALUNO];
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

      if(userTeacherFromFront.person.category.id === pc.SUPERVISOR){
        excludeIds = [...excludeIds, pc.ADMINISTRADOR]
      }

      if(userTeacherFromFront.person.category.id === pc.DIRETOR){
        excludeIds = [...excludeIds, pc.ADMINISTRADOR, pc.SUPERVISOR, pc.DIRETOR]
      }

      if(userTeacherFromFront.person.category.id === pc.VICE_DIRETOR){
        excludeIds = [...excludeIds, pc.ADMINISTRADOR, pc.SUPERVISOR, pc.DIRETOR, pc.VICE_DIRETOR]
      }

      if(userTeacherFromFront.person.category.id === pc.COORDENADOR){
        excludeIds = [...excludeIds, pc.ADMINISTRADOR, pc.SUPERVISOR, pc.DIRETOR, pc.VICE_DIRETOR]
      }

      if(userTeacherFromFront.person.category.id === pc.SECRETARIO){
        excludeIds = [...excludeIds, pc.ADMINISTRADOR, pc.SUPERVISOR, pc.DIRETOR, pc.VICE_DIRETOR, pc.COORDENADOR]
      }

      if(userTeacherFromFront.person.category.id === pc.MONITOR_DE_INFORMATICA){
        excludeIds = [...excludeIds, pc.ADMINISTRADOR, pc.SUPERVISOR, pc.DIRETOR, pc.VICE_DIRETOR, pc.COORDENADOR, pc.SECRETARIO, pc.MONITOR_DE_INFORMATICA]
      }

      if(userTeacherFromFront.person.category.id === pc.PROFESSOR){
        excludeIds = [...excludeIds, pc.ADMINISTRADOR, pc.SUPERVISOR, pc.DIRETOR, pc.VICE_DIRETOR, pc.COORDENADOR, pc.SECRETARIO, pc.MONITOR_DE_INFORMATICA]
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
