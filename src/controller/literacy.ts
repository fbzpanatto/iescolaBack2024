import { GenericController } from "./genericController";
import { Brackets, EntityTarget } from "typeorm";
import { Literacy } from "../model/Literacy";
import { Request } from "express";
import { AppDataSource } from "../data-source";
import { personCategories } from "../utils/personCategories";
import { Classroom } from "../model/Classroom";
import { classroomCategory } from "../utils/classroomCategory";

class LiteracyController extends GenericController<EntityTarget<Literacy>> {

  constructor() {
    super(Literacy);
  }

  async getClassrooms(req: Request) {

    const search = req.query.search as string
    const yearId = req.query.year as string
    const userBody = req.body.user

    try {

      const teacherClasses = await this.teacherClassrooms(req.body.user)

      const preResult = await AppDataSource.getRepository(Classroom)
        .createQueryBuilder('classroom')
        .leftJoinAndSelect('classroom.school', 'school')
        .leftJoinAndSelect('classroom.category', 'category')
        .leftJoinAndSelect('classroom.studentClassrooms', 'studentClassroom')
        .leftJoin('studentClassroom.literacies', 'literacies')
        .where(new Brackets(qb => {
          if(userBody.category != personCategories.ADMINISTRADOR && userBody.category != personCategories.SUPERVISOR) {
            qb.where("classroom.id IN (:...teacherClasses)", { teacherClasses: teacherClasses.classrooms })
          }
        }))
        .andWhere('category.id = :categoryId', { categoryId: classroomCategory.PEB_I })
        .andWhere('literacies.id IS NOT NULL')
        .andWhere('classroom.active = :active', { active: true })
        .andWhere('studentClassroom.year = :yearId', { yearId })
        .andWhere(new Brackets(qb => {
          if(search) {
            qb.where("school.name LIKE :search", { search: `%${search}%` })
              .orWhere("school.shortName LIKE :search", { search: `%${search}%` })
          }
        }))
        .orderBy('school.name', 'ASC')
        .getMany()

      return { status: 200, data: preResult }

    } catch (error: any) { return { status: 500, message: error.message } }
  }

  // async getStudentClassrooms(request: Request) {
  //
  //   const yearId = request?.query.year as string
  //   const userBody = request?.body.user
  //
  //   try {
  //
  //     const teacherClasses = await this.teacherClassrooms(request?.body.user)
  //
  //     // TODO: Review this query
  //     let newResult = await AppDataSource.getRepository(StudentClassroom)
  //       .createQueryBuilder('studentClassroom')
  //       .leftJoin('studentClassroom.year', 'year')
  //       .leftJoinAndSelect('studentClassroom.student', 'student')
  //       .leftJoinAndSelect('student.person', 'person')
  //       .leftJoinAndSelect('studentClassroom.literacies', 'literacies')
  //       .leftJoinAndSelect('literacies.literacyLevel', 'literacyLevel')
  //       .leftJoinAndSelect('literacies.literacyTier', 'literacyTier')
  //       .leftJoin('studentClassroom.classroom', 'classroom')
  //       .leftJoin('classroom.school', 'school')
  //       .where(new Brackets(qb => {
  //         if(userBody.category != personCategories.ADMINISTRADOR && userBody.category != personCategories.SUPERVISOR) {
  //           qb.where("classroom.id IN (:...teacherClasses)", { teacherClasses: teacherClasses.classrooms })
  //         }
  //       }))
  //       .andWhere('literacies.id IS NOT NULL')
  //       .andWhere("year.id = :yearId", { yearId })
  //       .getMany()
  //
  //     return { status: 200, data: newResult }
  //   } catch (error: any) { return { status: 500, message: error.message } }
  // }
}

export const literacyController = new LiteracyController();
