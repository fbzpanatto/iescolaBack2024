import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { ClassroomCategory } from "../model/ClassroomCategory";

class ClassroomCategoryController extends GenericController<EntityTarget<ClassroomCategory>> { constructor() { super(ClassroomCategory)}}

export const classCatController = new ClassroomCategoryController();
