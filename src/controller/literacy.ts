import { GenericController } from "./genericController";
import { Brackets, EntityTarget } from "typeorm";
import { Literacy } from "../model/Literacy";
import { Request } from "express";
import { AppDataSource } from "../data-source";
import { personCategories } from "../utils/personCategories";
import { Classroom } from "../model/Classroom";
import { classroomCategory } from "../utils/classroomCategory";
import { StudentClassroom } from "../model/StudentClassroom";
import { LiteracyLevel } from "../model/LiteracyLevel";
import { LiteracyTier } from "../model/LiteracyTier";
import {Year} from "../model/Year";

class LiteracyController extends GenericController<EntityTarget<Literacy>> {

  constructor() { super(Literacy) }

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
        .leftJoin('studentClassroom.literacies', 'literacies')
        .where(new Brackets(qb => {
          if(userBody.category != personCategories.ADMINISTRADOR && userBody.category != personCategories.SUPERVISOR) {
            qb.where("classroom.id IN (:...teacherClasses)", { teacherClasses: teacherClasses.classrooms })
          }
        }))
        .andWhere('category.id = :categoryId', { categoryId: classroomCategory.PEB_I })
        .andWhere('literacies.id IS NOT NULL')
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

  async getStudentClassrooms(request: Request) {

    const yearName = request?.params.year as string
    const userBody = request?.body.user
    const classroomId = request?.params.id as string

    try {

      const teacherClasses = await this.teacherClassrooms(request?.body.user)

      const literacyLevels = await AppDataSource.getRepository(LiteracyLevel).find()
      const literacyTiers = await AppDataSource.getRepository(LiteracyTier).find()

      const studentClassrooms = await AppDataSource.getRepository(StudentClassroom)
        .createQueryBuilder('studentClassroom')
        .leftJoinAndSelect('studentClassroom.year', 'year')
        .leftJoinAndSelect('studentClassroom.student', 'student')
        .leftJoinAndSelect('student.person', 'person')
        .leftJoinAndSelect('studentClassroom.literacies', 'literacies')
        .leftJoinAndSelect('literacies.literacyLevel', 'literacyLevel')
        .leftJoinAndSelect('literacies.literacyTier', 'literacyTier')
        .leftJoinAndSelect('studentClassroom.classroom', 'classroom')
        .leftJoinAndSelect('classroom.school', 'school')
        .where(new Brackets(qb => {
          if(userBody.category != personCategories.ADMINISTRADOR && userBody.category != personCategories.SUPERVISOR) {
            qb.where("classroom.id IN (:...teacherClasses)", { teacherClasses: teacherClasses.classrooms })
          }
        }))
        .andWhere('classroom.id = :classroomId', { classroomId })
        .andWhere('literacies.id IS NOT NULL')
        .andWhere("year.name = :yearName", { yearName })
        .getMany()

      return { status: 200, data: { literacyTiers, literacyLevels,  studentClassrooms } }
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async updateLiteracy(body: { studentClassroom: { id: number }, literacyTier: { id: number }, literacyLevel: { id: number }, user: { user: number, username: string, category: number, iat: number, exp: number }}) {

    const { studentClassroom, literacyTier, literacyLevel, user } = body

    try {

      const teacherClasses = await this.teacherClassrooms(user)

      const stLiteracy = await AppDataSource.getRepository(Literacy)
        .createQueryBuilder('literacy')
        .leftJoin('literacy.studentClassroom', 'studentClassroom')
        .leftJoin('studentClassroom.classroom', 'classroom')
        .leftJoin('literacy.literacyTier', 'literacyTier')
        .where(new Brackets(qb => {
          if(user.category != personCategories.ADMINISTRADOR && user.category != personCategories.SUPERVISOR) {
            qb.where("classroom.id IN (:...teacherClasses)", { teacherClasses: teacherClasses.classrooms })
          }
        }))
        .andWhere('studentClassroom.id = :studentClassroomId', { studentClassroomId: studentClassroom.id })
        .andWhere('literacy.literacyTier = :literacyTierId', { literacyTierId: literacyTier.id })
        .getOne()

      if(!stLiteracy) { return { status: 400, message: 'Não foi possível processar sua requisição' } }

      const literacyLevelDb = await AppDataSource.getRepository(LiteracyLevel).findOne({
        where: { id: literacyLevel.id }
      })

      if(!literacyLevelDb) { return { status: 404, message: 'Registro não encontrado' } }

      stLiteracy.literacyLevel = literacyLevelDb
      const result = await AppDataSource.getRepository(Literacy).save(stLiteracy)

      return { status: 200, data: result }

    } catch (error: any) { return { status: 500, message: error.message } }

  }
}

export const literacyController = new LiteracyController();
