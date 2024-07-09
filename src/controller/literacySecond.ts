import { GenericController } from "./genericController";
import { Brackets, EntityTarget } from "typeorm";
import { Request } from "express";
import { TextGenderGrade } from "../model/TextGenderGrade";
import { AppDataSource } from "../data-source";
import { Classroom } from "../model/Classroom";
import { pc } from "../utils/personCategories";
import { classroomCategory } from "../utils/classroomCategory";

class LiteracySecondController extends GenericController<EntityTarget<TextGenderGrade>> {

  constructor() { super(TextGenderGrade) }

  async getClassrooms(req: Request) {

    const search = req.query.search as string
    const yearName = req.params.year as string
    const userBody = req.body.user

    try {

      const teacherClasses = await this.teacherClassrooms(req.body.user)

      const preResult = await AppDataSource.getRepository(Classroom)
        .createQueryBuilder('classroom')
        .leftJoinAndSelect('classroom.school', 'school')
        .leftJoinAndSelect('classroom.category', 'category')
        .leftJoinAndSelect('classroom.studentClassrooms', 'studentClassroom')
        .leftJoinAndSelect('studentClassroom.year', 'year')
        .leftJoin('studentClassroom.textGenderGrades', 'textGenderGrades')
        .where(new Brackets(qb => {
          if(userBody.category != pc.ADMINISTRADOR && userBody.category != pc.SUPERVISOR) {
            qb.where("classroom.id IN (:...teacherClasses)", { teacherClasses: teacherClasses.classrooms })
          }
        }))
        .andWhere('category.id = :categoryId', { categoryId: classroomCategory.PEB_I })
        .andWhere('textGenderGrades.id IS NOT NULL')
        .andWhere('classroom.active = :active', { active: true })
        .andWhere('year.name = :yearName', { yearName })
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
}

export const literacySecondController = new LiteracySecondController();
