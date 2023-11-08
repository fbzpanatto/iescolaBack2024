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

    try {
      const result = await AppDataSource.getRepository(PersonCategory)
        .createQueryBuilder('personCategory')
        .where('personCategory.id != :id', { id: personCategories.ALUNO })
        .getMany();

      return { status: 200, data: result };
    } catch (error: any) { return { status: 500, message: error.message } }
  }


}

export const personCategoryController = new PersonCategoryController();
