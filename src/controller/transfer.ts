import { AppDataSource } from './../data-source';
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

class TransferController extends GenericController<EntityTarget<Transfer>> {

  constructor() { super(Transfer) }

  override async findAllWhere(options: FindManyOptions<ObjectLiteral> | undefined, request?: Request) {

    const year = request?.params.year as string
    const search = request?.query.search as string

    try {

      const result = await AppDataSource.getRepository(Transfer)
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
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  override async save(body: DeepPartial<ObjectLiteral>, options: SaveOptions | undefined) {

    try {

      const teacher = await this.teacherByUser(body.user.user)

      const transferInDatabse = await AppDataSource.getRepository(Transfer).findOne({
        where: {
          student: body.student,
          status: { id: transferStatus.PENDING },
          endedAt: IsNull()
        }
      });
      if (transferInDatabse) return { status: 400, message: 'Já existe uma solicitação pendente para este aluno' }

      const currentClassroom = await AppDataSource.getRepository(Classroom).findOne({ where: { id: body.currentClassroom.id } })
      const requestedClassroom = await AppDataSource.getRepository(Classroom).findOne({ where: { id: body.classroom.id } })

      if (!currentClassroom) return { status: 404, message: 'Registro não encontrado' }
      if (!requestedClassroom) return { status: 404, message: 'Registro não encontrado' }

      const notDigit = /\D/g
      if (Number(requestedClassroom.name.replace(notDigit, '')) < Number(currentClassroom.name.replace(notDigit, ''))) {
        return { status: 400, message: 'Regressão de sala não é permitido.' }
      }

      const transfer = new Transfer();
      transfer.student = body.student;
      transfer.startedAt = body.startedAt;
      transfer.endedAt = body.endedAt;
      transfer.requester = teacher;
      transfer.requestedClassroom = body.classroom;
      transfer.year = await this.currentYear()
      transfer.currentClassroom = body.currentClassroom;
      transfer.status = await this.transferStatus(transferStatus.PENDING)

      const result = await this.repository.save(transfer)

      return { status: 201, data: result };
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  override async updateId(id: number | string, body: ObjectLiteral) {

    try {
      const teacher = await this.teacherByUser(body.user.user)
      const transfer = await AppDataSource.getRepository(Transfer).findOne({
        relations: ['status', 'requester.person', 'requestedClassroom'],
        where: { id: Number(id) }
      })
      if (!transfer) return { status: 404, message: 'Registro não encontrado.' }
      if (teacher.id !== transfer.requester.id && body.cancel) {
        return { status: 403, message: 'Você não tem permissão para alterar este registro.' }
      }
      if (body.cancel) {
        transfer.status = await this.transferStatus(transferStatus.CANCELED)
        transfer.endedAt = new Date()
        await AppDataSource.getRepository(Transfer).save(transfer)
        return { status: 200, data: 'Cancelada com sucesso.' }
      }
      if (body.reject) {
        transfer.status = await this.transferStatus(transferStatus.REFUSED)
        transfer.endedAt = new Date()
        transfer.receiver = teacher
        await AppDataSource.getRepository(Transfer).save(transfer)
        return { status: 200, data: 'Rejeitada com sucesso.' }
      }
      if (body.accept) {

        const arrayOfRelations = [
          'student',
          'classroom',
          'literacies.literacyTier',
          'literacies.literacyLevel',
          'textGenderGrades.textGender',
          'textGenderGrades.textGenderExam',
          'textGenderGrades.textGenderExamTier',
          'textGenderGrades.textGenderExamLevel',
          'year'
        ]

        const studentClassroom = await AppDataSource.getRepository(StudentClassroom)
          .findOne({
            relations: arrayOfRelations,
            where: { student: body.student, classroom: body.classroom, endedAt: IsNull() }
          })

        if (!studentClassroom) { return { status: 404, message: 'Registro não encontrado.' } }

        const currentYear = await this.currentYear()

        const lastRosterNumber = await AppDataSource.getRepository(StudentClassroom)
        .find({
          relations: ['classroom', 'year'],
          where: {
            year: { id: currentYear.id },
            classroom: { id: transfer.requestedClassroom.id }
          },
          order: { rosterNumber: 'DESC' },
          take: 1
        })

        let last = 1
        if(lastRosterNumber[0]?.rosterNumber) {
          last = lastRosterNumber[0].rosterNumber + 1
        }

        const newStudentClassroom = await AppDataSource.getRepository(StudentClassroom).save({
          student: body.student,
          classroom: transfer.requestedClassroom,
          startedAt: new Date(),
          rosterNumber: last,
          year: await this.currentYear()
        }) as StudentClassroom

        const notDigit = /\D/g

        const classroomNumber = Number(transfer.requestedClassroom.shortName.replace(notDigit, ''))

        const newClassroomNumber = Number(newStudentClassroom.classroom.shortName.replace(notDigit, ''))
        const oldClassroomNumber = Number(studentClassroom.classroom.shortName.replace(notDigit, ''))

        if (classroomNumber >= 1 && classroomNumber <= 3) {
          const literacyTier = await AppDataSource.getRepository(LiteracyTier).find() as LiteracyTier[]

          if (
            studentClassroom.classroom.id != newStudentClassroom.classroom.id &&
            oldClassroomNumber === newClassroomNumber &&
            studentClassroom.year.id === newStudentClassroom.year.id
          ) {

            for (let tier of literacyTier) {

              const element = studentClassroom.literacies.find(el => el.literacyTier.id === tier.id)

              if (element) {

                await AppDataSource.getRepository(Literacy).save({
                  studentClassroom: newStudentClassroom,
                  literacyTier: element.literacyTier,
                  literacyLevel: element.literacyLevel,
                  toRate: false
                })
              } else {

                await AppDataSource.getRepository(Literacy).save({
                  studentClassroom: newStudentClassroom,
                  literacyTier: tier
                })
              }
            }
          } else {

            for (let tier of literacyTier) {

              await AppDataSource.getRepository(Literacy).save({
                studentClassroom: newStudentClassroom,
                literacyTier: tier
              })
            }
          }
        }

        if (classroomNumber === 4 || classroomNumber === 5) {
          const textGenderExam = await AppDataSource.getRepository(TextGenderExam).find() as TextGenderExam[]
          const textGenderExamTier = await AppDataSource.getRepository(TextGenderExamTier).find() as TextGenderExamTier[]
          const textGenderClassroom = await AppDataSource.getRepository(TextGenderClassroom).find({
            where: { classroomNumber: classroomNumber },
            relations: ['textGender']
          }) as TextGenderClassroom[]

          if (
            studentClassroom.classroom.id != newStudentClassroom.classroom.id &&
            oldClassroomNumber === newClassroomNumber &&
            studentClassroom.year.id === newStudentClassroom.year.id
          ) {

            for (let tg of textGenderClassroom) {
              for (let tier of textGenderExamTier) {
                for (let exam of textGenderExam) {

                  const element = studentClassroom.textGenderGrades.find(el => el.textGender.id === tg.textGender.id && el.textGenderExam.id === exam.id && el.textGenderExamTier.id === tier.id)

                  if (element) {

                    await AppDataSource.getRepository(TextGenderGrade).save({
                      studentClassroom: newStudentClassroom,
                      textGender: element.textGender,
                      textGenderExam: element.textGenderExam,
                      textGenderExamTier: element.textGenderExamTier,
                      textGenderExamLevel: element.textGenderExamLevel,
                      toRate: false
                    })
                  } else {

                    for (let tg of textGenderClassroom) {
                      for (let tier of textGenderExamTier) {
                        for (let exam of textGenderExam) {
                          const textGenderGrade = new TextGenderGrade()
                          textGenderGrade.studentClassroom = newStudentClassroom
                          textGenderGrade.textGender = tg.textGender
                          textGenderGrade.textGenderExam = exam
                          textGenderGrade.textGenderExamTier = tier

                          await AppDataSource.getRepository(TextGenderGrade).save(textGenderGrade)
                        }
                      }
                    }
                  }
                }
              }
            }
          } else {

            for (let tg of textGenderClassroom) {
              for (let tier of textGenderExamTier) {
                for (let exam of textGenderExam) {
                  const textGenderGrade = new TextGenderGrade()
                  textGenderGrade.studentClassroom = newStudentClassroom
                  textGenderGrade.textGender = tg.textGender
                  textGenderGrade.textGenderExam = exam
                  textGenderGrade.textGenderExamTier = tier

                  await AppDataSource.getRepository(TextGenderGrade).save(textGenderGrade)
                }
              }
            }
          }
        }

        await AppDataSource.getRepository(StudentClassroom).save({
          ...studentClassroom,
          endedAt: new Date()
        })

        transfer.status = await this.transferStatus(transferStatus.ACCEPTED)
        transfer.endedAt = new Date()
        transfer.receiver = teacher
        await AppDataSource.getRepository(Transfer).save(transfer)

        return { status: 200, data: 'Aceita com sucesso.' }
      }
      let result = {}
      return { status: 200, data: result };
    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const transferController = new TransferController();
