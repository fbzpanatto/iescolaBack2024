import { GenericController } from "./genericController";
import { Brackets, EntityTarget } from "typeorm";
import { TextGenderGrade } from "../model/TextGenderGrade";
import { AppDataSource } from "../data-source";
import { Classroom } from "../model/Classroom";
import { Year } from "../model/Year";
import { TextGender } from "../model/TextGender";
import { StudentClassroom } from "../model/StudentClassroom";
import { TextGenderExam } from "../model/TextGenderExam";
import { TextGenderExamTier } from "../model/TextGenderExamTier";
import { BodyTextGenderExamGrade } from "../interfaces/interfaces";
import { personCategories } from "../utils/personCategories";
import { TextGenderExamLevel } from "../model/TextGenderExamLevel";
import e, { Request } from "express";
import { TextGenderClassroom } from "../model/TextGenderClassroom";
import { School } from "../model/School";

class TextGenderGradeController extends GenericController<EntityTarget<TextGenderGrade>> {

  constructor() {
    super(TextGenderGrade);
  }

  async getAll(req: any) {

    const { classroom: classId, year: yearName, gender: genderId } = req.params

    try {

      const classroom = await AppDataSource.getRepository(Classroom)
        .findOne({
          relations: ['school'],
          where: { id: Number(classId) }
        }) as Classroom

      if (!classroom) return { status: 404, message: 'Sala não encontrada' }

      const year = await AppDataSource.getRepository(Year)
        .findOne({ where: { name: yearName } }) as Year

      if (!year) return { status: 404, message: 'Ano não encontrado' }

      const gender = await AppDataSource.getRepository(TextGender)
        .findOne({ where: { id: Number(genderId) } }) as TextGender

      if (!gender) return { status: 404, message: 'Gênero não encontrado' }

      const examLevel = await AppDataSource.getRepository(TextGenderExam)
        .createQueryBuilder('textGenderExam')
        .leftJoinAndSelect('textGenderExam.textGenderExamLevelGroups', 'textGenderExamLevelGroup')
        .leftJoinAndSelect('textGenderExamLevelGroup.textGenderExamLevel', 'textGenderExamLevel')
        .getMany()

      const examTier = await AppDataSource.getRepository(TextGenderExamTier)
        .createQueryBuilder('textGenderExamTier')
        .getMany()

      const result = await AppDataSource.getRepository(StudentClassroom)
        .createQueryBuilder('studentClassroom')
        .leftJoin('studentClassroom.classroom', 'classroom')
        .leftJoin('studentClassroom.year', 'year')
        .leftJoinAndSelect('studentClassroom.student', 'student')
        .leftJoinAndSelect('student.person', 'person')
        .leftJoinAndSelect('studentClassroom.textGenderGrades', 'textGenderGrade')
        .leftJoinAndSelect('textGenderGrade.textGender', 'textGender')
        .leftJoinAndSelect('textGenderGrade.textGenderExam', 'textGenderExam')
        .leftJoinAndSelect('textGenderGrade.textGenderExamTier', 'textGenderExamTier')
        .leftJoinAndSelect('textGenderGrade.textGenderExamLevel', 'textGenderExamLevel')
        .where('classroom.id = :classId', { classId })
        .andWhere('year.name = :yearName', { yearName })
        .andWhere('textGender.id = :genderId', { genderId })
        .getMany()

      const finalResult = {
        gender: gender,
        year: year,
        classroom: classroom,
        headers: { examLevel, examTier },
        data: result
      }

      return { status: 200, data: finalResult }

    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async getTotals(request: Request) {

    const { user: userBody } = request.body
    const { classroom: classId, year: yearName } = request.params

    try {

      const teacher = await this.teacherByUser(userBody.user)
      const isAdminSupervisor = teacher.person.category.id === personCategories.ADMINISTRADOR || teacher.person.category.id === personCategories.SUPERVISOR
      const { classrooms } = await this.teacherClassrooms(request?.body.user)
      if (!classrooms.includes(Number(classId)) && !isAdminSupervisor) return { status: 401, message: "Você não tem permissão para acessar essa sala." }

      const classroom = await AppDataSource.getRepository(Classroom)
        .findOne({ relations: ['school'], where: { id: Number(classId) } }) as Classroom

      if (!classroom) return { status: 404, message: 'Sala não encontrada' }

      const notDigit = /\D/g
      const classroomNumber = classroom.shortName.replace(notDigit, '')

      const year = await AppDataSource.getRepository(Year)
        .findOne({ where: { name: yearName } }) as Year

      if (!year) return { status: 404, message: 'Ano não encontrado' }

      const examLevel = await AppDataSource.getRepository(TextGenderExam)
        .createQueryBuilder('textGenderExam')
        .leftJoinAndSelect('textGenderExam.textGenderExamLevelGroups', 'textGenderExamLevelGroup')
        .leftJoinAndSelect('textGenderExamLevelGroup.textGenderExamLevel', 'textGenderExamLevel')
        .getMany()

      const examTier = await AppDataSource.getRepository(TextGenderExamTier)
        .createQueryBuilder('textGenderExamTier')
        .getMany()

      const genders = await AppDataSource
        .getRepository(TextGenderClassroom)
        .createQueryBuilder('textGenderClassroom')
        .leftJoinAndSelect('textGenderClassroom.textGender', 'textGender')
        .where('classroomNumber = :classroomNumber', { classroomNumber })
        .getMany()

      const allData: { id: number, name: string, classrooms: Classroom[] }[] = []

      for (let gender of genders) {

        const classrooms = await AppDataSource.getRepository(Classroom)
          .createQueryBuilder('classroom')
          .leftJoinAndSelect('classroom.school', 'school')
          .leftJoinAndSelect('classroom.studentClassrooms', 'studentClassrooms')
          .leftJoinAndSelect('studentClassrooms.year', 'year')
          .leftJoinAndSelect('studentClassrooms.textGenderGrades', 'textGenderGrades')
          .leftJoinAndSelect('textGenderGrades.textGender', 'textGender')
          .leftJoinAndSelect('textGenderGrades.textGenderExam', 'textGenderExam')
          .leftJoinAndSelect('textGenderGrades.textGenderExamTier', 'textGenderExamTier')
          .leftJoinAndSelect('textGenderGrades.textGenderExamLevel', 'textGenderExamLevel')
          .where('classroom.shortName LIKE :shortName', { shortName: `%${classroomNumber}%` })
          .andWhere('year.id = :yearId', { yearId: year.id })
          .andWhere('textGender.id = :textGenderId', { textGenderId: gender.textGender.id })
          .getMany()

        allData.push({
          id: gender.textGender.id,
          name: gender.textGender.name,
          classrooms
        })
      }

      const onlySchool = allData.map(el => {
        return {
          ...el,
          classrooms: el.classrooms.filter(cl => cl.school.id === classroom.school.id)
        }
      })

      for (let gender of genders) {
        const cityHall = this.createCityHall()
        const groupIndex = onlySchool.findIndex(el => el.id === gender.textGender.id)
        const preResult = allData.filter(el => el.id === gender.textGender.id)
        cityHall.studentClassrooms = preResult.flatMap(el => el.classrooms.flatMap(st => st.studentClassrooms))
        onlySchool[groupIndex].classrooms.push(cityHall)
      }

      const result = {
        year,
        classroom,
        classroomNumber,
        genders,
        headers: { examLevel, examTier },
        groups: onlySchool
      }

      return { status: 200, data: result }

    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async getReport(request: Request) {

    const { classroom: classroomNumber, year: yearName, textgender: textGenderId } = request.params
    const { search } = request.query

    try {

      const [year, examLevel, examTier, textGender] = await Promise.all([
        this.getYear(yearName),
        this.getExamLevel(),
        this.getexamTier(),
        this.getTextGender(textGenderId)
      ])

      if (!year) return { status: 404, message: 'Ano não encontrado.' }

      const data = await AppDataSource.getRepository(School)
        .createQueryBuilder('school')
        .leftJoinAndSelect('school.classrooms', 'classroom')
        .leftJoinAndSelect('classroom.studentClassrooms', 'studentClassrooms')
        .leftJoinAndSelect('studentClassrooms.student', 'student')
        .leftJoinAndSelect('student.person', 'person')
        .leftJoinAndSelect('studentClassrooms.year', 'year')
        .leftJoinAndSelect('studentClassrooms.textGenderGrades', 'textGenderGrades')
        .leftJoinAndSelect('textGenderGrades.textGender', 'textGender')
        .leftJoinAndSelect('textGenderGrades.textGenderExam', 'textGenderExam')
        .leftJoinAndSelect('textGenderGrades.textGenderExamTier', 'textGenderExamTier')
        .leftJoinAndSelect('textGenderGrades.textGenderExamLevel', 'textGenderExamLevel')
        .where('classroom.shortName LIKE :shortName', { shortName: `%${classroomNumber}%` })
        .andWhere('year.id = :yearId', { yearId: year.id })
        .andWhere('textGender.id = :textGenderId', { textGenderId: textGender?.id })
        .andWhere(new Brackets(qb => {
          if (search) {
            qb.where("school.name LIKE :search", { search: `%${search}%` })
              .orWhere("school.shortName LIKE :search", { search: `%${search}%` })
          }
        }))
        .orderBy('school.name', 'ASC')
        .getMany()

      const arrOfSchools = data.map(school => ({
        id: school.id,
        name: school.name,
        shortName: school.shortName,
        studentsClassrooms: school.classrooms.flatMap(classroom => classroom.studentClassrooms)
      }))

      const examTotalizer: {
        examId: number,
        examTierId: number,
        examTierLevelId: number,
        total: number
      }[] = []

      for (let exam of examLevel) {
        for (let tier of examTier) {
          for (let examLevel of exam.textGenderExamLevelGroups.flatMap(el => el.textGenderExamLevel)) {
            const index = examTotalizer.findIndex(el => el.examId === exam.id && el.examTierId === tier.id && el.examTierLevelId === examLevel.id)
            const object = examTotalizer[index]
            if(!object) {
              examTotalizer.push({
                examId: exam.id,
                examTierId: tier.id,
                examTierLevelId: examLevel.id,
                total: 0 
              })
            }
          }
        }
      }

      const arrOfSchoolsWithGrades = arrOfSchools.map(school => ({
        ...school,
        examTotalizer
      }))

      for (let school of arrOfSchoolsWithGrades) {

        const schoolExamTotalizer = [...examTotalizer]

        for (let oneStudentClassroom of school.studentsClassrooms) {
          for (let stGrade of oneStudentClassroom.textGenderGrades) {
            const index = schoolExamTotalizer.findIndex(el => el.examId === stGrade.textGenderExam.id && el.examTierId === stGrade.textGenderExamTier.id && el.examTierLevelId === stGrade.textGenderExamLevel.id)
            const object = schoolExamTotalizer[index]
            if(object) {
              object.total += 1
            }
          }
        }

        school.examTotalizer = schoolExamTotalizer
      }

      const result = {
        classroomNumber,
        year,
        headers: { examLevel, examTier },
        schools: arrOfSchoolsWithGrades
      }

      return { status: 200, data: result }

    } catch (error: any) {
      console.log(error)
      return { status: 500, message: error.message }
    }
  }

  async updateStudentTextGenderExamGrade(body: BodyTextGenderExamGrade) {

    const {
      studentClassroom,
      textGender,
      textGenderExam,
      textGenderExamTier,
      textGenderExamTierLevel,
      user } = body

    try {

      const teacherClasses = await this.teacherClassrooms(user)

      const stTextGenderGrade = await AppDataSource.getRepository(TextGenderGrade)
        .createQueryBuilder('textGenderGrade')
        .leftJoin('textGenderGrade.studentClassroom', 'studentClassroom')
        .leftJoin('studentClassroom.classroom', 'classroom')
        .leftJoin('textGenderGrade.textGender', 'textGender')
        .leftJoin('textGenderGrade.textGenderExam', 'textGenderExam')
        .leftJoin('textGenderGrade.textGenderExamTier', 'textGenderExamTier')
        .where(new Brackets(qb => {
          if (user.category != personCategories.ADMINISTRADOR && user.category != personCategories.SUPERVISOR) {
            qb.where("classroom.id IN (:...teacherClasses)", { teacherClasses: teacherClasses.classrooms })
          }
        }))
        .andWhere('studentClassroom.id = :studentClassroomId', { studentClassroomId: studentClassroom.id })
        .andWhere('textGender.id = :textGenderId', { textGenderId: textGender.id })
        .andWhere('textGenderExam.id = :textGenderExamId', { textGenderExamId: textGenderExam.id })
        .andWhere('textGenderExamTier.id = :textGenderExamTierId', { textGenderExamTierId: textGenderExamTier.id })
        .getOne()

      if (!stTextGenderGrade) { return { status: 400, message: 'Não foi possível processar sua requisição' } }

      let textGenderExamTierLevelDb: any

      if (textGenderExamTierLevel && textGenderExamTierLevel.id) {
        textGenderExamTierLevelDb = await AppDataSource.getRepository(TextGenderExamLevel)
          .findOne({ where: { id: textGenderExamTierLevel.id } })
      }

      if (!textGenderExamTierLevel) { textGenderExamTierLevelDb = null }

      stTextGenderGrade.textGenderExamLevel = textGenderExamTierLevelDb

      const result = await AppDataSource.getRepository(TextGenderGrade).save(stTextGenderGrade)

      return { status: 200, data: result }


    } catch (error: any) { return { status: 500, message: error.message } }
  }

  getYear(yearName: string) {
    return AppDataSource.getRepository(Year).findOne({ where: { name: yearName } })
  }

  getTextGender(textGenderId: string) {
    return AppDataSource.getRepository(TextGender)
      .createQueryBuilder('textGender')
      .where('textGender.id = :textGenderId', { textGenderId })
      .getOne()
  }

  getExamLevel() {
    return AppDataSource.getRepository(TextGenderExam)
      .createQueryBuilder('textGenderExam')
      .leftJoinAndSelect('textGenderExam.textGenderExamLevelGroups', 'textGenderExamLevelGroup')
      .leftJoinAndSelect('textGenderExamLevelGroup.textGenderExamLevel', 'textGenderExamLevel')
      .getMany()
  }

  getexamTier() {
    return AppDataSource.getRepository(TextGenderExamTier)
      .createQueryBuilder('textGenderExamTier')
      .getMany()
  }

  createCityHall() {
    return {
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
      studentClassrooms: []
    } as unknown as Classroom
  }
}

export const textGenderGradeController = new TextGenderGradeController();
