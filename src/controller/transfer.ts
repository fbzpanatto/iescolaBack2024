import { GenericController } from "./genericController";
import { DeepPartial, EntityTarget, IsNull, ObjectLiteral, SaveOptions } from "typeorm";
import { Transfer } from "../model/Transfer";
import { AppDataSource } from "../data-source";
import { transferStatus } from "../utils/transferStatus";
import { StudentClassroom } from "../model/StudentClassroom";

class TransferController extends GenericController<EntityTarget<Transfer>> {

  constructor() { super(Transfer) }

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
      if(transferInDatabse) return { status: 400, message: 'Já existe uma solicitação pendente para este aluno' }

      const transfer = new Transfer();
      transfer.student = body.student;
      transfer.startedAt = body.startedAt;
      transfer.endedAt = body.endedAt;
      transfer.requester = teacher;
      transfer.requested = body.classroom;
      transfer.status = await this.transferStatus(transferStatus.PENDING)

      const result = await this.repository.save(transfer)

      return { status: 201, data: result };
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  override async updateId(id: number | string, body: ObjectLiteral) {

    try {
      const teacher = await this.teacherByUser(body.user.user)
      const transfer = await AppDataSource.getRepository(Transfer).findOne({
        relations: ['status', 'requester.person', 'requested'],
        where: { id: Number(id) }
      })
      if(!transfer) return { status: 404, message: 'Registro não encontrado' }
      if(teacher.id !== transfer.requester.id && body.cancel) {
        return { status: 403, message: 'Você não tem permissão para alterar este registro'}
      }
      if(body.cancel) {
        transfer.status = await this.transferStatus(transferStatus.CANCELED)
        transfer.endedAt = new Date()
        await AppDataSource.getRepository(Transfer).save(transfer)
        return { status: 200, data: 'Cancelada com sucesso.' }
      }
      if(body.reject) {
        transfer.status = await this.transferStatus(transferStatus.REFUSED)
        transfer.endedAt = new Date()
        transfer.receiver = teacher
        await AppDataSource.getRepository(Transfer).save(transfer)
        return { status: 200, data: 'Rejeitada com sucesso.' }
      }
      if(body.accept) {

        const studentClassroom = await AppDataSource.getRepository(StudentClassroom)
          .findOne({where: { student: body.student, classroom: body.classroom, endedAt: IsNull() }})

        if(!studentClassroom) { return { status: 404, message: 'Registro não encontrado' } }

        const highestRosterNumber = await AppDataSource.getRepository(StudentClassroom)
          .createQueryBuilder('studentClassroom')
          .select('MAX(studentClassroom.rosterNumber)', 'number')
          .leftJoin('studentClassroom.classroom', 'classroom')
          .where('classroom.id = :classroom', { classroom: body.classroom.id })
          .getRawOne()

        await AppDataSource.getRepository(StudentClassroom).save({
          student: body.student,
          classroom: transfer.requested,
          startedAt: new Date(),
          rosterNumber: highestRosterNumber.number + 1,
          year: await this.currentYear()
        })

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
