import { GenericController } from "./genericController";
import { Brackets, EntityManager, EntityTarget, FindManyOptions, ObjectLiteral } from "typeorm";
import { Classroom } from "../model/Classroom";
import { Request } from "express";
import { TeacherBody } from "../interfaces/interfaces";
import { pc } from "../utils/personCategories";

class ClassroomController extends GenericController<EntityTarget<Classroom>> {

  constructor() { super(Classroom) }

  override async findAllWhere( options: FindManyOptions<ObjectLiteral> | undefined, request?: Request, transaction?: EntityManager) {
    
    const { body } = request as { body: TeacherBody };

    try {

      if(!transaction){
        const teacher = await this.teacherByUser(body.user.user);
        const teacherClasses = await this.teacherClassrooms(request?.body.user);
        const isAdminSupervisor = teacher.person.category.id === pc.ADMN || teacher.person.category.id === pc.SUPE;
  
        let result = await this.repository
          .createQueryBuilder("classroom")
          .select("classroom.id", "id")
          .addSelect("classroom.shortName", "name")
          .addSelect("school.shortName", "school")
          .leftJoin("classroom.school", "school")
          .where(
            new Brackets((qb) => {
              if (!isAdminSupervisor) { qb.where("classroom.id IN (:...ids)", { ids: teacherClasses.classrooms }) } 
              else { qb.where("classroom.id > 0") }
            }),
          )
          .getRawMany();
  
        return { status: 200, data: result };
      }

      const teacher = await this.teacherByUser(body.user.user, transaction);
      const teacherClasses = await this.teacherClassrooms(request?.body.user, transaction);
      const isAdminSupervisor = teacher.person.category.id === pc.ADMN || teacher.person.category.id === pc.SUPE;

      let result = await transaction.getRepository(Classroom)
        .createQueryBuilder("classroom")
        .select("classroom.id", "id")
        .addSelect("classroom.shortName", "name")
        .addSelect("school.shortName", "school")
        .leftJoin("classroom.school", "school")
        .where(
          new Brackets((qb) => {
            if (!isAdminSupervisor) { qb.where("classroom.id IN (:...ids)", { ids: teacherClasses.classrooms }) } 
            else { qb.where("classroom.id > 0") }
          }),
        )
        .getRawMany();

      return { status: 200, data: result };

    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const classroomController = new ClassroomController();
