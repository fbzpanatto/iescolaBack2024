import { GenericController } from "./genericController";
import {Brackets, EntityTarget} from "typeorm";
import { TextGenderGrade } from "../model/TextGenderGrade";
import { AppDataSource } from "../data-source";
import { Classroom } from "../model/Classroom";
import { Year } from "../model/Year";
import { TextGender } from "../model/TextGender";
import { StudentClassroom } from "../model/StudentClassroom";
import {TextGenderExamLevelGroup} from "../model/TextGenderExamLevelGroup";
import {TextGenderExam} from "../model/TextGenderExam";
import {TextGenderExamTier} from "../model/TextGenderExamTier";
import {BodyTextGenderExamGrade, UserInterface} from "../interfaces/interfaces";
import {personCategories} from "../utils/personCategories";
import {TextGenderExamLevel} from "../model/TextGenderExamLevel";

class TextGenderGradeController extends GenericController<EntityTarget<TextGenderGrade>> {

  constructor() {
    super(TextGenderGrade);
  }

  async getAll(req: any) {

    const { classroom: classId, year: yearName, gender: genderId } = req.params

    try {

      const classroom = await AppDataSource.getRepository(Classroom)
        .findOne({ where: { id: Number(classId) } }) as Classroom

      if(!classroom) return { status: 404, message: 'Sala não encontrada' }

      const year = await AppDataSource.getRepository(Year)
        .findOne({ where: { name: yearName } }) as Year

      if(!year) return { status: 404, message: 'Ano não encontrado' }

      const gender = await AppDataSource.getRepository(TextGender)
        .findOne({ where: { id: Number(genderId) } }) as TextGender

      if(!gender) return { status: 404, message: 'Gênero não encontrado' }

      const examLevel = await AppDataSource.getRepository(TextGenderExam)
        .createQueryBuilder('textGenderExam')
        .leftJoinAndSelect('textGenderExam.textGenderExamLevelGroups', 'textGenderExamLevelGroup')
        .leftJoinAndSelect('textGenderExamLevelGroup.textGenderExamLevel', 'textGenderExamLevel')
        .getMany()

      const examTier = await AppDataSource.getRepository(TextGenderExamTier)
        .createQueryBuilder('textGenderExamTier')
        .getMany()

      const result= await AppDataSource.getRepository(StudentClassroom)
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
        headers: { examLevel, examTier },
        data: result
      }

      return { status: 200, data: finalResult }

    } catch (error: any) { return { status: 500, message: error.message } }
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
          if(user.category != personCategories.ADMINISTRADOR && user.category != personCategories.SUPERVISOR) {
            qb.where("classroom.id IN (:...teacherClasses)", { teacherClasses: teacherClasses.classrooms })
          }
        }))
        .andWhere('studentClassroom.id = :studentClassroomId', { studentClassroomId: studentClassroom.id })
        .andWhere('textGender.id = :textGenderId', { textGenderId: textGender.id })
        .andWhere('textGenderExam.id = :textGenderExamId', { textGenderExamId: textGenderExam.id })
        .andWhere('textGenderExamTier.id = :textGenderExamTierId', { textGenderExamTierId: textGenderExamTier.id })
        .getOne()

      if(!stTextGenderGrade) { return { status: 400, message: 'Não foi possível processar sua requisição' } }

      let textGenderExamTierLevelDb: any

      if(textGenderExamTierLevel && textGenderExamTierLevel.id) {
        textGenderExamTierLevelDb = await AppDataSource.getRepository(TextGenderExamLevel)
          .findOne({ where: { id: textGenderExamTierLevel.id } })
      }

      if(!textGenderExamTierLevel) { textGenderExamTierLevelDb = null }

      stTextGenderGrade.textGenderExamLevel = textGenderExamTierLevelDb

      const result = await AppDataSource.getRepository(TextGenderGrade).save(stTextGenderGrade)

      return { status: 200, data: result }


    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const textGenderGradeController = new TextGenderGradeController();
