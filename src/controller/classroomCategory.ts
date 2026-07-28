import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { ClassroomCategory } from "../model/ClassroomCategory";

class ClassroomCategoryController extends GenericController<EntityTarget<ClassroomCategory>> {
  constructor() {
    super(ClassroomCategory, { table: 'classroom_category', selectColumns: ['id', 'name', 'createdAt', 'updatedAt', 'createdByUser', 'updatedByUser'], dateColumns: ['createdAt', 'updatedAt'] })
  }
}

export const classCatController = new ClassroomCategoryController();
