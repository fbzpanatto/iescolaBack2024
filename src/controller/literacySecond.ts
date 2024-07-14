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

    try {
      return await AppDataSource.transaction(async(CONN) => {
        const teacherClasses = await this.teacherClassrooms(req.body.user, CONN);
        const data = await CONN.getRepository(Classroom)
          .createQueryBuilder("classroom")
          .leftJoinAndSelect("classroom.school", "school")
          .leftJoinAndSelect("classroom.category", "category")
          .leftJoinAndSelect("classroom.studentClassrooms", "studentClassroom")
          .leftJoinAndSelect("studentClassroom.year", "year")
          .leftJoin("studentClassroom.textGenderGrades", "textGenderGrades")
          .where( new Brackets((qb) => { if ( req.body.user.category != pc.ADMN && req.body.user.category != pc.SUPE ) {
            qb.where("classroom.id IN (:...teacherClasses)", { teacherClasses: teacherClasses.classrooms })
          }}))
          .andWhere("category.id = :categoryId", { categoryId: classroomCategory.PEB_I })
          .andWhere("textGenderGrades.id IS NOT NULL")
          .andWhere("classroom.active = :active", { active: true })
          .andWhere("year.name = :yearName", { yearName: req.params.year })
          .andWhere( new Brackets((qb) => { if (req.query.search) {
            qb.where("school.name LIKE :search", { search: `%${ req.query.search }%`,}).orWhere("school.shortName LIKE :search", {search: `%${ req.query.search }%` })
          }}))
          .orderBy("school.name", "ASC")
          .getMany();
        return { status: 200, data };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const litSecCtrl = new LiteracySecondController();
