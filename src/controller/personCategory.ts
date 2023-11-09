import { GenericController } from "./genericController";
import { EntityTarget, FindManyOptions, ObjectLiteral } from "typeorm";
import { PersonCategory } from "../model/PersonCategory";
import { Request } from "express";
import { AppDataSource } from "../data-source";
import { personCategories } from "../utils/personCategories";

class PersonCategoryController extends GenericController<EntityTarget<PersonCategory>> {

  constructor() {
    super(PersonCategory);
  }

  override async findAllWhere(options: FindManyOptions<ObjectLiteral> | undefined, request?: Request) {

    let excludeIds = []
    const userBody = request?.body.user

    if(userBody.category === personCategories.ADMINISTRADOR) excludeIds.push(personCategories.ADMINISTRADOR)
    if(userBody.category === personCategories.SUPERVISOR) excludeIds.push(personCategories.ADMINISTRADOR, personCategories.SUPERVISOR)
    if(userBody.category === personCategories.DIRETOR) excludeIds.push(personCategories.ADMINISTRADOR, personCategories.SUPERVISOR, personCategories.DIRETOR)
    if(userBody.category === personCategories.VICE_DIRETOR) excludeIds.push(personCategories.ADMINISTRADOR, personCategories.SUPERVISOR, personCategories.DIRETOR, personCategories.VICE_DIRETOR)
    if(userBody.category === personCategories.COORDENADOR) excludeIds.push(personCategories.ADMINISTRADOR, personCategories.SUPERVISOR, personCategories.DIRETOR, personCategories.VICE_DIRETOR, personCategories.COORDENADOR)
    if(userBody.category === personCategories.SECRETARIO) excludeIds.push(personCategories.ADMINISTRADOR, personCategories.SUPERVISOR, personCategories.DIRETOR, personCategories.VICE_DIRETOR, personCategories.COORDENADOR, personCategories.SECRETARIO)
    if(userBody.category === personCategories.MONITOR_DE_INFORMATICA) excludeIds.push(personCategories.ADMINISTRADOR, personCategories.SUPERVISOR, personCategories.DIRETOR, personCategories.VICE_DIRETOR, personCategories.COORDENADOR, personCategories.SECRETARIO, personCategories.MONITOR_DE_INFORMATICA)

    try {

      const userTeacher = await this.teacherByUser(userBody.user)
      if(!userTeacher) return { status: 404, message: 'Usuário não encontrado' }
      if(userTeacher.person.category.id != userBody.category) return { status: 403, message: 'Usuário não autorizado' }

      const result = await AppDataSource.getRepository(PersonCategory)
        .createQueryBuilder('personCategory')
        .where('personCategory.id NOT IN (:...ids)', { ids: excludeIds })
        .getMany();

      return { status: 200, data: result };
    } catch (error: any) { return { status: 500, message: error.message } }
  }


}

export const personCategoryController = new PersonCategoryController();
