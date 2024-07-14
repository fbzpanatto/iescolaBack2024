import { AppDataSource } from '../data-source';
import { GenericController } from "./genericController";
import { Brackets, DeepPartial, EntityTarget, FindManyOptions, IsNull, ObjectLiteral, SaveOptions } from "typeorm";
import { Transfer } from "../model/Transfer";
import { transferStatus } from "../utils/transferStatus";
import { StudentClassroom } from "../model/StudentClassroom";
import { Request } from "express";
import { Classroom } from "../model/Classroom";
import { LiteracyTier } from "../model/LiteracyTier";
import { Literacy } from "../model/Literacy";
import { TextGenderExam } from "../model/TextGenderExam";
import { TextGenderExamTier } from "../model/TextGenderExamTier";
import { TextGenderClassroom } from "../model/TextGenderClassroom";
import { TextGenderGrade } from "../model/TextGenderGrade";
import { TransferStatus } from '../model/TransferStatus';

class TransferController extends GenericController<EntityTarget<Transfer>> {

  constructor() { super(Transfer) }

  override async findAllWhere(options: FindManyOptions<ObjectLiteral> | undefined, request?: Request) {
    const year = request?.params.year as string
    const search = request?.query.search as string
    try {
      return await AppDataSource.transaction(async(CONN)=> {
        const result = await CONN.getRepository(Transfer)
            .createQueryBuilder('transfer')
            .leftJoinAndSelect('transfer.status', 'status')
            .leftJoin('transfer.year', 'year')
            .leftJoinAndSelect('transfer.requester', 'requester')
            .leftJoinAndSelect('requester.person', 'requesterPerson')
            .leftJoinAndSelect('transfer.student', 'student')
            .leftJoinAndSelect('student.person', 'studentPerson')
            .leftJoinAndSelect('transfer.receiver', 'receiver')
            .leftJoinAndSelect('receiver.person', 'receiverPerson')
            .leftJoinAndSelect('transfer.requestedClassroom', 'requestedClassroom')
            .leftJoinAndSelect('transfer.currentClassroom', 'currentClassroom')
            .leftJoinAndSelect('requestedClassroom.school', 'school')
            .leftJoinAndSelect('currentClassroom.school', 'currentSchool')
            .where(new Brackets(qb => {
              qb.where('studentPerson.name LIKE :search', { search: `%${search}%` })
                .orWhere('student.ra LIKE :search', { search: `%${search}%` })
                .orWhere('requesterPerson.name LIKE :search', { search: `%${search}%` })
                .orWhere('receiverPerson.name LIKE :search', { search: `%${search}%` })
            }))
            .andWhere('year.name = :year', { year })
            .orderBy('transfer.startedAt', 'DESC')
            .getMany()
        return { status: 200, data: result };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  override async save(body: DeepPartial<ObjectLiteral>, options: SaveOptions | undefined) {
    try {
      return await AppDataSource.transaction(async(CONN) => {
        const uTeacher = await this.teacherByUser(body.user.user, CONN)
        const dataBaseTransfer = await CONN.findOne(Transfer, { where: { student: body.student, status: { id: transferStatus.PENDING }, endedAt: IsNull()}});
        if (dataBaseTransfer) return { status: 400, message: 'Já existe uma solicitação pendente para este aluno' }
        const currentClassroom = await CONN.findOne(Classroom, { where: { id: body.currentClassroom.id } })
        const requestedClassroom = await CONN.findOne(Classroom, { where: { id: body.classroom.id } })
        if (!currentClassroom) return { status: 404, message: 'Registro não encontrado' }
        if (!requestedClassroom) return { status: 404, message: 'Registro não encontrado' }
        if (Number(requestedClassroom.name.replace(/\D/g, '')) < Number(currentClassroom.name.replace(/\D/g, ''))) { return { status: 400, message: 'Regressão de sala não é permitido.' } }
        const transfer = new Transfer();
        transfer.student = body.student;
        transfer.startedAt = body.startedAt;
        transfer.endedAt = body.endedAt;
        transfer.requester = uTeacher;
        transfer.requestedClassroom = body.classroom;
        transfer.year = await this.currentYear(CONN)
        transfer.currentClassroom = body.currentClassroom;
        transfer.status = await this.transferStatus(transferStatus.PENDING, CONN) as TransferStatus
        const result = await CONN.save(Transfer, transfer)
        return { status: 201, data: result };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  override async updateId(id: number | string, body: ObjectLiteral) {
    try {
      return await AppDataSource.transaction(async(CONN) => {
        const uTeacher = await this.teacherByUser(body.user.user, CONN)
        const transfer = await CONN.findOne(Transfer, { relations: ['status', 'requester.person', 'requestedClassroom'], where: { id: Number(id) }})
        if (!transfer) return { status: 404, message: 'Registro não encontrado.' }
        if (uTeacher.id !== transfer.requester.id && body.cancel) { return { status: 403, message: 'Você não tem permissão para alterar este registro.' }}
        if (body.cancel) {
          transfer.status = await this.transferStatus(transferStatus.CANCELED, CONN) as TransferStatus
          transfer.endedAt = new Date()
          await CONN.save(Transfer, transfer)
          return { status: 200, data: 'Cancelada com sucesso.' }
        }
        if (body.reject) {
          transfer.status = await this.transferStatus(transferStatus.REFUSED, CONN) as TransferStatus
          transfer.endedAt = new Date()
          transfer.receiver = uTeacher
          await CONN.save(Transfer, transfer)
          return { status: 200, data: 'Rejeitada com sucesso.' }
        }
        if (body.accept) {

          const arrayOfRelations = [ 'student', 'classroom', 'literacies.literacyTier', 'literacies.literacyLevel', 'textGenderGrades.textGender', 'textGenderGrades.textGenderExam', 'textGenderGrades.textGenderExamTier', 'textGenderGrades.textGenderExamLevel', 'year' ]
          const stClass = await CONN.findOne(StudentClassroom, { relations: arrayOfRelations, where: { student: body.student, classroom: body.classroom, endedAt: IsNull() }})
          if (!stClass) { return { status: 404, message: 'Registro não encontrado.' } }
          const currentYear = await this.currentYear(CONN)
          const lastRosterNumber = await CONN.find(StudentClassroom, { relations: ['classroom', 'year'], where: { year: { id: currentYear.id }, classroom: { id: transfer.requestedClassroom.id }}, order: { rosterNumber: 'DESC' }, take: 1 })
          let last = 1
          if (lastRosterNumber[0]?.rosterNumber) { last = lastRosterNumber[0].rosterNumber + 1 }
          const newStudentClassroom = await CONN.save(StudentClassroom, { student: body.student, classroom: transfer.requestedClassroom, startedAt: new Date(), rosterNumber: last, year: await this.currentYear(CONN)}) as StudentClassroom
          const classNumber = Number(transfer.requestedClassroom.shortName.replace(/\D/g, ''))
          const newNumber = Number(newStudentClassroom.classroom.shortName.replace(/\D/g, ''))
          const oldNumber = Number(stClass.classroom.shortName.replace(/\D/g, ''))
          if (classNumber >= 1 && classNumber <= 3) {
            const literacyTier = await CONN.find(LiteracyTier)
            if (stClass.classroom.id != newStudentClassroom.classroom.id && oldNumber === newNumber && stClass.year.id === newStudentClassroom.year.id ) {
              for (let tier of literacyTier) {
                const element = stClass.literacies.find(el => el.literacyTier.id === tier.id && el.literacyLevel != null)
                if (element) { await CONN.save(Literacy, { studentClassroom: newStudentClassroom, literacyTier: element.literacyTier, literacyLevel: element.literacyLevel, toRate: false })}
                else { await CONN.save(Literacy, { studentClassroom: newStudentClassroom, literacyTier: tier })}
              }
            }
            else { for (let tier of literacyTier) { await CONN.save(Literacy, { studentClassroom: newStudentClassroom, literacyTier: tier })}}
          }
          if (classNumber === 4 || classNumber === 5) {
            const textGenderExam = await CONN.find(TextGenderExam) as TextGenderExam[]
            const textGenderExamTier = await CONN.find(TextGenderExamTier) as TextGenderExamTier[]
            const textGenderClassroom = await CONN.find(TextGenderClassroom, {where: { classroomNumber: classNumber },relations: ['textGender']}) as TextGenderClassroom[]
            if (stClass.classroom.id != newStudentClassroom.classroom.id && oldNumber === newNumber && stClass.year.id === newStudentClassroom.year.id ) {
              for (let tg of textGenderClassroom) {
                for (let tier of textGenderExamTier) {
                  for (let exam of textGenderExam) {
                    const element = stClass.textGenderGrades.find(el => el.textGender.id === tg.textGender.id && el.textGenderExam.id === exam.id && el.textGenderExamTier.id === tier.id && el.textGenderExamLevel != null )
                    if (element) { await CONN.save(TextGenderGrade, { studentClassroom: newStudentClassroom, textGender: element.textGender, textGenderExam: element.textGenderExam, textGenderExamTier: element.textGenderExamTier, textGenderExamLevel: element.textGenderExamLevel, toRate: false })}
                    else { await CONN.save(TextGenderGrade, { studentClassroom: newStudentClassroom, textGender: tg.textGender, textGenderExam: exam, textGenderExamTier: tier }) }
                  }
                }
              }
            }
            else { for (let tg of textGenderClassroom) { for (let tier of textGenderExamTier) { for (let exam of textGenderExam) { await CONN.save(TextGenderGrade, { studentClassroom: newStudentClassroom, textGender: tg.textGender, textGenderExam: exam, textGenderExamTier: tier })}}}}
          }
          await CONN.save(StudentClassroom, { ...stClass, endedAt: new Date() })
          transfer.status = await this.transferStatus(transferStatus.ACCEPTED, CONN) as TransferStatus
          transfer.endedAt = new Date()
          transfer.receiver = uTeacher
          await CONN.save(Transfer, transfer)
          return { status: 200, data: 'Aceita com sucesso.' }
        }
        let data = {}
        return { status: 200, data };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const transferController = new TransferController();
