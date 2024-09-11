import { AppDataSource } from '../data-source';
import { GenericController } from "./genericController";
import { Brackets, DeepPartial, EntityTarget, FindManyOptions, IsNull, ObjectLiteral, SaveOptions} from "typeorm";
import { Transfer } from "../model/Transfer";
import { transferStatus } from "../utils/transferStatus";
import { StudentClassroom } from "../model/StudentClassroom";
import { Request } from "express";
import { Classroom } from "../model/Classroom";
import { TransferStatus } from '../model/TransferStatus';
import { Teacher } from "../model/Teacher";
import { transferEmail } from "../utils/email.service";
import { Student } from "../model/Student";
import { pc } from "../utils/personCategories";

class TransferController extends GenericController<EntityTarget<Transfer>> {

  constructor() { super(Transfer) }

  override async findAllWhere(options: FindManyOptions<ObjectLiteral> | undefined, request?: Request) {
    const year = request?.params.year as string
    const search = request?.query.search as string

    const limit =  !isNaN(parseInt(request?.query.limit as string)) ? parseInt(request?.query.limit as string) : 100
    const offset =  !isNaN(parseInt(request?.query.offset as string)) ? parseInt(request?.query.offset as string) : 0

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
          .take(limit)
          .skip(offset)
          .orderBy('transfer.id', 'DESC')
          .getMany()
        return { status: 200, data: result };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  override async save(body: DeepPartial<ObjectLiteral>, options: SaveOptions | undefined) {
    try {
      return await AppDataSource.transaction(async(CONN) => {

        const uTeacher: Teacher = await this.teacherByUser(body.user.user, CONN)

        const dbTransfer: Transfer | null = await CONN.findOne(Transfer, { where: { student: body.student, status: { id: transferStatus.PENDING }, endedAt: IsNull()}})

        if (dbTransfer) return { status: 400, message: 'Já existe uma solicitação pendente para este aluno' }

        const currClass: Classroom | null = await CONN.findOne(Classroom, { where: { id: body.currentClassroom.id } })
        const newClass: Classroom | null = await CONN.findOne(Classroom, { relations: [ 'school' ], where: { id: body.classroom.id } })

        if (!currClass) return { status: 404, message: 'Registro não encontrado' }
        if (!newClass) return { status: 404, message: 'Registro não encontrado' }

        if (Number(newClass.name.replace(/\D/g, '')) < Number(currClass.name.replace(/\D/g, ''))) { return { status: 400, message: 'Regressão de sala não é permitido.' } }

        const student: Student | null = await CONN.findOne(Student, { relations: ['person'], where: { id: body.student.id } })

        const teachers = await CONN.getRepository(Teacher)
          .createQueryBuilder("teacher")
          .select(["teacher.id AS teacher_id", "user.id AS user_id", "user.email AS user_email"])
          .leftJoin("teacher.person", "person")
          .leftJoin("person.user", "user")
          .leftJoin("person.category", "category")
          .leftJoin("teacher.teacherClassDiscipline", "teacherClassDiscipline")
          .leftJoin("teacherClassDiscipline.classroom", "classroom")
          .where("classroom.id = :classroomId AND teacherClassDiscipline.endedAt IS NULL", { classroomId: currClass.id })
          // .andWhere("category.id IN (:categoryId1)", { categoryId1: 6 })
          .andWhere("category.id IN (:categoryId3, :categoryId4, :categoryId5, :categoryId6)", { categoryId3: 3, categoryId4: 4, categoryId5: 5, categoryId6: 6 })
          .groupBy("teacher.id")
          .orderBy("teacher_id")
          .getRawMany() as { teacher_id: number, user_id: number, user_email: string }[];

        for(let el of teachers) {
          if(student) {
            await transferEmail(el.user_email, student.person.name, newClass.shortName, uTeacher.person.name, newClass.school.shortName)
          }
        }

        const transfer = new Transfer();
        transfer.student = body.student;
        transfer.startedAt = body.startedAt;
        transfer.endedAt = body.endedAt;
        transfer.requester = uTeacher;
        transfer.requestedClassroom = body.classroom;
        transfer.year = await this.currentYear(CONN)
        transfer.currentClassroom = body.currentClassroom;
        transfer.createdByUser = uTeacher.person.user.id;
        transfer.status = await this.transferStatus(transferStatus.PENDING, CONN) as TransferStatus

        const result = await CONN.save(Transfer, transfer)

        return { status: 201, data: result }
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  override async updateId(transferId: number | string, body: ObjectLiteral) {
    try {
      return await AppDataSource.transaction(async(CONN) => {

        const uTeacher = await this.teacherByUser(body.user.user, CONN)
        const currTransfer = await CONN.findOne(Transfer, {
          relations: ['status', 'requester.person', 'requestedClassroom'],
          where: { id: Number(transferId), status: { id: transferStatus.PENDING }, endedAt: IsNull() }
        })

        const isAdmin = uTeacher.person.category.id === pc.ADMN;

        if (!currTransfer) return { status: 404, message: 'Transferência já processada ou não localizada. Atualize sua página.' }

        if(body.cancel && !(isAdmin || uTeacher.id === currTransfer.requester.id)) {
          return { status: 403, message: 'Você não pode modificar uma solicitação de transferência feita por outra pessoa.' }
        }

        if(body.reject && ![pc.ADMN, pc.SUPE, pc.SECR].includes(uTeacher.person.category.id)) {
          return { status: 403, message: 'O seu cargo não permite realizar a RECUSA de uma solicitação de transferência. Solicite ao auxiliar administrativo da unidade escolar.' }
        }

        if(body.accept && ![pc.ADMN, pc.SUPE, pc.SECR].includes(uTeacher.person.category.id)) {
          return { status: 403, message: 'O seu cargo não permite realizar o ACEITE de uma solicitação de transferência. Solicite ao auxiliar administrativo da unidade escolar.' }
        }

        if (body.cancel) {

          currTransfer.status = await this.transferStatus(transferStatus.CANCELED, CONN) as TransferStatus
          currTransfer.endedAt = new Date()
          currTransfer.receiver = uTeacher
          currTransfer.updatedByUser = uTeacher.person.user.id
          await CONN.save(Transfer, currTransfer)
          return { status: 200, data: 'Cancelada com sucesso.' }
        }

        if (body.reject) {

          currTransfer.status = await this.transferStatus(transferStatus.REFUSED, CONN) as TransferStatus
          currTransfer.endedAt = new Date()
          currTransfer.receiver = uTeacher
          currTransfer.updatedByUser = uTeacher.person.user.id
          await CONN.save(Transfer, currTransfer)
          return { status: 200, data: 'Rejeitada com sucesso.' }
        }

        if (body.accept) {

          const relations = [ 'student', 'classroom', 'year' ]

          const stClass = await CONN.findOne(StudentClassroom, { relations: relations, where: { student: body.student, classroom: body.classroom, endedAt: IsNull() }})

          if (!stClass) { return { status: 404, message: 'Registro não encontrado.' } }

          const currentYear = await this.currentYear(CONN)

          const lastRosterNumber = await CONN.find(StudentClassroom, { relations: ['classroom', 'year'], where: { year: { id: currentYear.id }, classroom: { id: currTransfer.requestedClassroom.id }}, order: { rosterNumber: 'DESC' }, take: 1 })

          let last = 1
          if (lastRosterNumber[0]?.rosterNumber) { last = lastRosterNumber[0].rosterNumber + 1 }

          const newStudentClassroom = await CONN.save(StudentClassroom, {
            student: body.student,
            classroom: currTransfer.requestedClassroom,
            startedAt: new Date(),
            rosterNumber: last,
            createdByUser: uTeacher.person.user.id,
            year: await this.currentYear(CONN)
          }) as StudentClassroom

          await CONN.save(StudentClassroom, { ...stClass, endedAt: new Date(), updatedByUser: uTeacher.person.user.id })
          currTransfer.status = await this.transferStatus(transferStatus.ACCEPTED, CONN) as TransferStatus
          currTransfer.endedAt = new Date()
          currTransfer.receiver = uTeacher
          await CONN.save(Transfer, currTransfer)
          return { status: 200, data: newStudentClassroom }
        }
        let data = {}
        return { status: 200, data };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const transferController = new TransferController();
