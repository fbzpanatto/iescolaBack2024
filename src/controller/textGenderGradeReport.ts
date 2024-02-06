import { TextGenderExam } from '../model/TextGenderExam';
import { GenericController } from "./genericController";
import { Brackets, EntityTarget } from "typeorm";
import { TextGenderGrade } from "../model/TextGenderGrade";
import { AppDataSource } from "../data-source";
import { Classroom } from "../model/Classroom";
import { Year } from "../model/Year";
import { TextGender } from "../model/TextGender";
import { TextGenderExamTier } from "../model/TextGenderExamTier";
import { Request } from "express";
import { School } from "../model/School";

class TextGenderGradeReportController extends GenericController<EntityTarget<TextGenderGrade>> {

  constructor() {
    super(TextGenderGrade);
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

      const allData = await this.getAllData(classroomNumber, textGender, year)
      const filteredSchool = await this.filteredSchool(classroomNumber, textGender, year, search)

      const arrOfSchools = filteredSchool.map(school => ({
        id: school.id,
        name: school.name,
        shortName: school.shortName,
        studentsClassrooms: school.classrooms.flatMap(classroom => classroom.studentClassrooms),
        examTotalizer: this.examTotalizer(examLevel, examTier)
      }))

      const cityHall = {
        id: 'ITA',
        name: 'PREFEITURA DO MUNICIPIO DE ITATIBA',
        shortName: 'ITA',
        studentsClassrooms: allData.flatMap(school => school.classrooms.flatMap(classroom => classroom.studentClassrooms)),
        examTotalizer: this.examTotalizer(examLevel, examTier)
      }

      for (let school of arrOfSchools) {
        for (let oneStudentClassroom of school.studentsClassrooms) {
          for (let stGrade of oneStudentClassroom.textGenderGrades) {

            const indexForSchool = school.examTotalizer.findIndex(el => stGrade.textGenderExamLevel !== null && el.examId === stGrade.textGenderExam.id && el.examTierId === stGrade.textGenderExamTier.id && el.examTierLevelId === stGrade.textGenderExamLevel.id)

            if (indexForSchool !== -1) {
              school.examTotalizer[indexForSchool].total += 1
              school.examTotalizer[indexForSchool].rate = Math.round((school.examTotalizer[indexForSchool].total / school.studentsClassrooms.length) * 100)
            }
          }
        }
      }

      for (let studentClassroom of cityHall.studentsClassrooms) {
        for (let stGrade of studentClassroom.textGenderGrades) {

          const indexForCity = cityHall.examTotalizer.findIndex(el => stGrade.textGenderExamLevel !== null && el.examId === stGrade.textGenderExam.id && el.examTierId === stGrade.textGenderExamTier.id && el.examTierLevelId === stGrade.textGenderExamLevel.id)

          if (indexForCity !== -1) {
            cityHall.examTotalizer[indexForCity].total += 1
            cityHall.examTotalizer[indexForCity].rate = Math.round((cityHall.examTotalizer[indexForCity].total / cityHall.studentsClassrooms.length) * 100)
          }
        }
      }

      const examLevelLabels = this.examTotalizer(examLevel, examTier).map(el => el.graphicLabel)

      const result = {
        classroomNumber,
        year,
        headers: { examLevel, examTier },
        schools: [...arrOfSchools, cityHall],
        examLevelLabels
      }

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

  examTotalizer(examLevel: TextGenderExam[], examTier: TextGenderExamTier[]) {

    const examTotalizer: {
      examId: number,
      examLabel: string,
      examTierId: number,
      examTierLabel: string,
      examTierLevelId: number,
      examTierLevelLabel: string,
      total: number,
      rate: number,
      graphicLabel: string
    }[] = []

    for (let exam of examLevel) {
      for (let tier of examTier) {
        for (let examLevel of exam.textGenderExamLevelGroups.flatMap(el => el.textGenderExamLevel)) {
          const index = examTotalizer.findIndex(el => el.examId === exam.id && el.examTierId === tier.id && el.examTierLevelId === examLevel.id)
          if (index === -1) {
            examTotalizer.push({
              examId: exam.id,
              examLabel: exam.name,
              examTierId: tier.id,
              examTierLabel: tier.name,
              examTierLevelId: examLevel.id,
              examTierLevelLabel: examLevel.name,
              total: 0,
              rate: 0,
              graphicLabel: tier.id === 1 ? `${exam.name.split(" ").join("").slice(0, 4)} - 1 - ${examLevel.name.split(" ").join("").slice(0, 2)}` : `${exam.name.split(" ").join("").slice(0, 4)} - 2 - ${examLevel.name.split(" ").join("").slice(0, 2)}`
            })
          }
        }
      }
    }
    return examTotalizer
  }

  async getAllData(classroomNumber: string, textGender: TextGender | null, year: Year) {
    return await AppDataSource.getRepository(School)
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
      .andWhere('textGenderExamLevel.id IS NOT NULL')
      .andWhere('textGender.id = :textGenderId', { textGenderId: textGender?.id })
      .orderBy('school.name', 'ASC')
      .getMany()
  }

  async filteredSchool(classroomNumber: string, textGender: TextGender | null, year: Year, search: any) {
    return await AppDataSource.getRepository(School)
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
      .andWhere('textGenderExamLevel.id IS NOT NULL')
      .andWhere('textGender.id = :textGenderId', { textGenderId: textGender?.id })
      .andWhere(new Brackets(qb => {
        if (search) {
          qb.where("school.name LIKE :search", { search: `%${search}%` })
            .orWhere("school.shortName LIKE :search", { search: `%${search}%` })
        }
      }))
      .orderBy('school.name', 'ASC')
      .getMany()
  }
}

export const textGenderGradeReportController = new TextGenderGradeReportController();
