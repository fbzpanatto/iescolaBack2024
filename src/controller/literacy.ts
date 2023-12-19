import {GenericController} from "./genericController";
import {Brackets, EntityTarget} from "typeorm";
import {Literacy} from "../model/Literacy";
import {Request} from "express";
import {AppDataSource} from "../data-source";
import {personCategories} from "../utils/personCategories";
import {Classroom} from "../model/Classroom";
import {classroomCategory} from "../utils/classroomCategory";
import {StudentClassroom} from "../model/StudentClassroom";
import {LiteracyLevel} from "../model/LiteracyLevel";
import {LiteracyTier} from "../model/LiteracyTier";
import {Year} from "../model/Year";
import {UserInterface} from "../interfaces/interfaces";
import {LiteracyFirst} from "../model/LiteracyFirst";

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
      const classroom = await AppDataSource.getRepository(Classroom).findOne({ where: { id: Number(classroomId) } }) as Classroom

      const studentClassrooms = await this.getStudentClassroomsWithLiteracy(classroom, userBody, teacherClasses, yearName)

      return { status: 200, data: { literacyTiers, literacyLevels, studentClassrooms } }
    } catch (error: any) {
      console.log(error)
      return { status: 500, message: error.message }
    }
  }

  async getStudentClassroomsWithLiteracy(classroom: Classroom, userBody: UserInterface, teacherClasses: {id: number, classrooms: number[]}, yearName: string) {

    const classroomNumber = classroom.shortName.replace(/\D/g, '')
    let lastYear = await AppDataSource.getRepository(Year).findOne({ where: { name: String(Number(yearName) - 1) } })
    if(!lastYear) { lastYear = await AppDataSource.getRepository(Year).findOne({ where: { name: yearName } }) }

    const studentClassrooms = await AppDataSource.getRepository(StudentClassroom)
      .createQueryBuilder('studentClassroom')
      .leftJoinAndSelect('studentClassroom.year', 'year')
      .leftJoinAndSelect('studentClassroom.student', 'student')
      .leftJoinAndSelect('student.person', 'person')
      .leftJoinAndSelect('studentClassroom.literacies', 'literacies')
      .leftJoinAndSelect('literacies.literacyLevel', 'literacyLevel')
      .leftJoinAndSelect('literacies.literacyTier', 'literacyTier')
      .leftJoinAndSelect('studentClassroom.literacyFirsts', 'literacyFirsts')
      .leftJoinAndSelect('literacyFirsts.literacyLevel', 'literacyFirstLevel')
      .leftJoinAndSelect('studentClassroom.classroom', 'classroom')
      .leftJoinAndSelect('classroom.school', 'school')
      .where(new Brackets(qb => {
        if (userBody.category != personCategories.ADMINISTRADOR && userBody.category != personCategories.SUPERVISOR) {
          qb.where("classroom.id IN (:...teacherClasses)", { teacherClasses: teacherClasses.classrooms })
        }
      }))
      .andWhere('classroom.id = :classroomId', { classroomId: classroom.id })
      .andWhere('literacies.id IS NOT NULL')
      .andWhere("year.name = :yearName", { yearName })
      .orderBy('studentClassroom.rosterNumber', 'ASC')
      .getMany()

    if((Number(classroomNumber)) === 1) {

      const result = studentClassrooms.map(async (studentClassroom) => {

        const literacyFirsts = await AppDataSource.getRepository(LiteracyFirst).findOne({
          where: { studentClassroom: { student: { id: studentClassroom.student.id } } },
          relations: ['literacyLevel', 'studentClassroom.classroom']
        }) as LiteracyFirst

        return {
          ...studentClassroom,
          literacyFirsts: { id: literacyFirsts?.id, literacyLevel: literacyFirsts?.literacyLevel ?? { id: 'NA', name: 'NA', shortName: 'NA' }}
        }
      })
      return await Promise.all(result)
    }

    const result = studentClassrooms.map(async(studentClassroom) => {
      const studentId = studentClassroom.student.id;

      const lastLiteracy = await AppDataSource.getRepository(Literacy)
        .createQueryBuilder('literacy')
        .innerJoin('literacy.studentClassroom', 'studentClassroom')
        .innerJoin('studentClassroom.year', 'year')
        .innerJoin('studentClassroom.student', 'student')
        .innerJoin('literacy.literacyTier', 'literacyTier')
        .leftJoinAndSelect('literacy.literacyLevel', 'literacyLevel')
        .where('student.id = :studentId', { studentId })
        .andWhere('literacyLevel.id IS NOT NULL') // Garante que o literacyLevel não seja nulo
        // TODO: posso verificar se há algum registro no ano atual, se não houver, pego o último registro do ano anterior
        .andWhere('year.name = :yearName', { yearName: lastYear?.name })
        .orderBy('literacyTier.id', 'DESC') // Ordena por ordem decrescente de ID do literacyTier
        .addOrderBy('literacy.id', 'DESC') // Em caso de empate no ID do literacyTier, usa o ID do literacy
        .getOne();

      return {
        ...studentClassroom,
        literacyFirsts: { id: lastLiteracy?.id, literacyLevel: lastLiteracy?.literacyLevel ?? { id: 'NA', name: 'NA', shortName: 'NA' }}
      };
    });

    return await Promise.all(result)
  }

  async getTotals(request: Request) {

    const yearName = request?.params.year as string
    const userBody = request?.body.user
    const classroomId = request?.params.id as string

    try {

      const teacher = await this.teacherByUser(userBody.user)
      const isAdminSupervisor = teacher.person.category.id === personCategories.ADMINISTRADOR || teacher.person.category.id === personCategories.SUPERVISOR

      const year = await AppDataSource.getRepository(Year).findOne({ where: { name: yearName } })
      if (!year) return { status: 404, message: "Ano não encontrado" }

      const { classrooms } = await this.teacherClassrooms(request?.body.user)
      if(!classrooms.includes(Number(classroomId)) && !isAdminSupervisor) return { status: 401, message: "Você não tem permissão para acessar essa sala." }

      const classroom = await AppDataSource.getRepository(Classroom).findOne({ where: { id: Number(classroomId) }, relations: ["school"] })
      if (!classroom) return { status: 404, message: "Sala não encontrada" }

      const literacyLevels = await AppDataSource.getRepository(LiteracyLevel).find()
      const literacyTiers = await AppDataSource.getRepository(LiteracyTier).find()

      const classroomNumber = classroom.shortName.replace(/\D/g, '')

      const allClassrooms = await AppDataSource.getRepository(Classroom)
        .createQueryBuilder('classroom')
        .leftJoinAndSelect('classroom.school', 'school')
        .leftJoinAndSelect('classroom.studentClassrooms', 'studentClassroom')
        .leftJoinAndSelect('studentClassroom.literacies', 'literacies')
        .leftJoinAndSelect('literacies.literacyLevel', 'literacyLevel')
        .leftJoinAndSelect('literacies.literacyTier', 'literacyTier')
        .leftJoinAndSelect('studentClassroom.year', 'year')
        .where('classroom.shortName LIKE :shortName', { shortName: `%${classroomNumber}%` })
        .andWhere('year.id = :yearId', { yearId: year.id })
        .having('COUNT(studentClassroom.id) > 0')
        .groupBy( 'classroom.id, school.id, year.id, studentClassroom.id, literacies.id, literacyLevel.id, literacyTier.id')
        .getMany()

      const schoolClassrooms = allClassrooms.filter((cl) => cl.school.id === classroom.school.id)

      const cityHall = {
        id: 'ITA',
        name: 'PREFEITURA DO MUNICIPIO DE ITATIBA',
        shortName: 'ITA',
        school: {
          id: 99,
          name: 'PREFEITURA DO MUNICIPIO DE ITATIBA',
          shortName: 'ITATIBA',
          inep: null,
          active: true
        },
        studentClassrooms: allClassrooms.flatMap(cl => cl.studentClassrooms)
      } as unknown as Classroom

      const header = {
        city: 'PREFEITURA DO MUNICIPIO DE ITATIBA',
        literacy: 'Avaliação Diagnóstica',
        year: year.name,
        school: classroom.school.name,
        classroomNumber
      }

      let result = { header, literacyLevels, literacyTiers, classrooms: [...schoolClassrooms, cityHall], totals: {} }

      let totalResult: {
        classId: number,
        className: string,
        scores: {
          tier: { id: number, name: string },
          level: { id: number, name: string },
          total: number
        }[]
      }[] = []

      for(let classroom of result.classrooms) {

        let totalOfStudents = classroom.studentClassrooms.length

        for(let tier of result.literacyTiers) {

          for(let level of result.literacyLevels) {

            const preTotal = this.calc({ tier, level }, classroom.studentClassrooms)
            const total = Math.round((preTotal / totalOfStudents) * 100)

            const classIndex = totalResult.findIndex((cl) => cl.classId === classroom.id)

            if(classIndex === -1) {
              totalResult.push({
                classId: classroom.id,
                className: classroom.name,
                scores: [{ tier, level, total }]
              })
            } else {
              totalResult[classIndex].scores.push({ tier, level, total })
            }

          }
        }
      }

      result = { ...result, totals: totalResult }

      return { status: 200, data: result }

    } catch (error: any) { return { status: 500, message: error.message }}
  }

  calc( value: { tier: { id: number, name: string }, level: { id: number, name: string } }, studentClassrooms: StudentClassroom[] ) {
    return studentClassrooms.reduce((total, studentClassroom) => {
      if(studentClassroom.literacies.length === 0) return total
      for(let literacy of studentClassroom.literacies) {
        if(!literacy.literacyLevel) continue
        if(literacy.literacyTier.id === value.tier.id && literacy.literacyLevel.id === value.level.id) total++
      }
      return total
    }, 0)
  }

  async updateLiteracy(body: { studentClassroom: { id: number }, literacyTier: { id: number }, literacyLevel: { id: number } | null, user: { user: number, username: string, category: number, iat: number, exp: number }}) {

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

      let literacyLevelDb: any

      if(literacyLevel && literacyLevel.id) {
        literacyLevelDb = await AppDataSource.getRepository(LiteracyLevel).findOne({
          where: { id: literacyLevel.id }
        })
      }

      if(!literacyLevel) { literacyLevelDb = null }

      stLiteracy.literacyLevel = literacyLevelDb

      const result = await AppDataSource.getRepository(Literacy).save(stLiteracy)

      return { status: 200, data: result }

    } catch (error: any) { return { status: 500, message: error.message } }

  }
}

export const literacyController = new LiteracyController();
