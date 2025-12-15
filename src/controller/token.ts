import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { Transfer } from "../model/Transfer";
import { Request } from "express";
import { Helper } from "../utils/helpers";
import { PERSON_CATEGORIES } from "../utils/enums";
import { UserInterface } from "../interfaces/interfaces";

class TokenController extends GenericController<EntityTarget<any>> {

  // TODO: change to Token
  constructor() { super(Transfer) }

  async getFormData(request: Request) {

    try {
      let result;

      const tUser = await this.qUser(request?.body.user.user)

      const masterUser = tUser?.categoryId === PERSON_CATEGORIES.ADMN ||
                         tUser?.categoryId === PERSON_CATEGORIES.SUPE ||
                         tUser?.categoryId === PERSON_CATEGORIES.FORM;

      result = await this.testByClassroomAndTeacher(tUser.teacherId, '2025', masterUser)

      return { status: 200, data: result };
    }
    catch (error: any) { console.log(error); return { status: 500, message: error.message } }
  }

  async getAllTokens(request: Request) {

    const { search, bimester, discipline, limit, offset } = request.query
    const { year } = request.params

    try {

      let result = [
        { id: 1, token: 'ASXC-98DC', student: 'JOÃO DA SILVA', test: 'AVALIAÇÃO ITATIBA 4º MAT', period: '4º BIM', discipline: 'MATEMÁTICA', startedAt: '12/12/2012 08:00', endedAt: '12/12/2012 09:00', duration: '01:00' },
        { id: 1, token: 'ASXC-98DC', student: 'JOÃO DA SILVA', test: 'AVALIAÇÃO ITATIBA 4º MAT', period: '4º BIM', discipline: 'MATEMÁTICA', startedAt: '12/12/2012 08:00', endedAt: '12/12/2012 09:00', duration: '01:00' },
        { id: 1, token: 'ASXC-98DC', student: 'JOÃO DA SILVA', test: 'AVALIAÇÃO ITATIBA 4º MAT', period: '4º BIM', discipline: 'MATEMÁTICA', startedAt: '12/12/2012 08:00', endedAt: '12/12/2012 09:00', duration: '01:00' },
        { id: 1, token: 'ASXC-98DC', student: 'JOÃO DA SILVA', test: 'AVALIAÇÃO ITATIBA 4º MAT', period: '4º BIM', discipline: 'MATEMÁTICA', startedAt: '12/12/2012 08:00', endedAt: '12/12/2012 09:00', duration: '01:00' },
        { id: 1, token: 'ASXC-98DC', student: 'JOÃO DA SILVA', test: 'AVALIAÇÃO ITATIBA 4º MAT', period: '4º BIM', discipline: 'MATEMÁTICA', startedAt: '12/12/2012 08:00', endedAt: '12/12/2012 09:00', duration: '01:00' },
        { id: 1, token: 'ASXC-98DC', student: 'JOÃO DA SILVA', test: 'AVALIAÇÃO ITATIBA 4º MAT', period: '4º BIM', discipline: 'MATEMÁTICA', startedAt: '12/12/2012 08:00', endedAt: '12/12/2012 09:00', duration: '01:00' },
        { id: 1, token: 'ASXC-98DC', student: 'JOÃO DA SILVA', test: 'AVALIAÇÃO ITATIBA 4º MAT', period: '4º BIM', discipline: 'MATEMÁTICA', startedAt: '12/12/2012 08:00', endedAt: '12/12/2012 09:00', duration: '01:00' },
        { id: 1, token: 'ASXC-98DC', student: 'JOÃO DA SILVA', test: 'AVALIAÇÃO ITATIBA 4º MAT', period: '4º BIM', discipline: 'MATEMÁTICA', startedAt: '12/12/2012 08:00', endedAt: '12/12/2012 09:00', duration: '01:00' },
        { id: 1, token: 'ASXC-98DC', student: 'JOÃO DA SILVA', test: 'AVALIAÇÃO ITATIBA 4º MAT', period: '4º BIM', discipline: 'MATEMÁTICA', startedAt: '12/12/2012 08:00', endedAt: '12/12/2012 09:00', duration: '01:00' },
        { id: 1, token: 'ASXC-98DC', student: 'JOÃO DA SILVA', test: 'AVALIAÇÃO ITATIBA 4º MAT', period: '4º BIM', discipline: 'MATEMÁTICA', startedAt: '12/12/2012 08:00', endedAt: '12/12/2012 09:00', duration: '01:00' },
        { id: 1, token: 'ASXC-98DC', student: 'JOÃO DA SILVA', test: 'AVALIAÇÃO ITATIBA 4º MAT', period: '4º BIM', discipline: 'MATEMÁTICA', startedAt: '12/12/2012 08:00', endedAt: '12/12/2012 09:00', duration: '01:00' },
        { id: 1, token: 'ASXC-98DC', student: 'JOÃO DA SILVA', test: 'AVALIAÇÃO ITATIBA 4º MAT', period: '4º BIM', discipline: 'MATEMÁTICA', startedAt: '12/12/2012 08:00', endedAt: '12/12/2012 09:00', duration: '01:00' },
        { id: 1, token: 'ASXC-98DC', student: 'JOÃO DA SILVA', test: 'AVALIAÇÃO ITATIBA 4º MAT', period: '4º BIM', discipline: 'MATEMÁTICA', startedAt: '12/12/2012 08:00', endedAt: '12/12/2012 09:00', duration: '01:00' },
        { id: 1, token: 'ASXC-98DC', student: 'JOÃO DA SILVA', test: 'AVALIAÇÃO ITATIBA 4º MAT', period: '4º BIM', discipline: 'MATEMÁTICA', startedAt: '12/12/2012 08:00', endedAt: '12/12/2012 09:00', duration: '01:00' },
        { id: 1, token: 'ASXC-98DC', student: 'JOÃO DA SILVA', test: 'AVALIAÇÃO ITATIBA 4º MAT', period: '4º BIM', discipline: 'MATEMÁTICA', startedAt: '12/12/2012 08:00', endedAt: '12/12/2012 09:00', duration: '01:00' },
        { id: 1, token: 'ASXC-98DC', student: 'JOÃO DA SILVA', test: 'AVALIAÇÃO ITATIBA 4º MAT', period: '4º BIM', discipline: 'MATEMÁTICA', startedAt: '12/12/2012 08:00', endedAt: '12/12/2012 09:00', duration: '01:00' },
        { id: 1, token: 'ASXC-98DC', student: 'JOÃO DA SILVA', test: 'AVALIAÇÃO ITATIBA 4º MAT', period: '4º BIM', discipline: 'MATEMÁTICA', startedAt: '12/12/2012 08:00', endedAt: '12/12/2012 09:00', duration: '01:00' },
        { id: 1, token: 'ASXC-98DC', student: 'JOÃO DA SILVA', test: 'AVALIAÇÃO ITATIBA 4º MAT', period: '4º BIM', discipline: 'MATEMÁTICA', startedAt: '12/12/2012 08:00', endedAt: '12/12/2012 09:00', duration: '01:00' },
        { id: 1, token: 'ASXC-98DC', student: 'JOÃO DA SILVA', test: 'AVALIAÇÃO ITATIBA 4º MAT', period: '4º BIM', discipline: 'MATEMÁTICA', startedAt: '12/12/2012 08:00', endedAt: '12/12/2012 09:00', duration: '01:00' },
        { id: 1, token: 'ASXC-98DC', student: 'JOÃO DA SILVA', test: 'AVALIAÇÃO ITATIBA 4º MAT', period: '4º BIM', discipline: 'MATEMÁTICA', startedAt: '12/12/2012 08:00', endedAt: '12/12/2012 09:00', duration: '01:00' },
        { id: 1, token: 'ASXC-98DC', student: 'JOÃO DA SILVA', test: 'AVALIAÇÃO ITATIBA 4º MAT', period: '4º BIM', discipline: 'MATEMÁTICA', startedAt: '12/12/2012 08:00', endedAt: '12/12/2012 09:00', duration: '01:00' },
        { id: 1, token: 'ASXC-98DC', student: 'JOÃO DA SILVA', test: 'AVALIAÇÃO ITATIBA 4º MAT', period: '4º BIM', discipline: 'MATEMÁTICA', startedAt: '12/12/2012 08:00', endedAt: '12/12/2012 09:00', duration: '01:00' },
        { id: 1, token: 'ASXC-98DC', student: 'JOÃO DA SILVA', test: 'AVALIAÇÃO ITATIBA 4º MAT', period: '4º BIM', discipline: 'MATEMÁTICA', startedAt: '12/12/2012 08:00', endedAt: '12/12/2012 09:00', duration: '01:00' },
        { id: 1, token: 'ASXC-98DC', student: 'JOÃO DA SILVA', test: 'AVALIAÇÃO ITATIBA 4º MAT', period: '4º BIM', discipline: 'MATEMÁTICA', startedAt: '12/12/2012 08:00', endedAt: '12/12/2012 09:00', duration: '01:00' },
        { id: 1, token: 'ASXC-98DC', student: 'JOÃO DA SILVA', test: 'AVALIAÇÃO ITATIBA 4º MAT', period: '4º BIM', discipline: 'MATEMÁTICA', startedAt: '12/12/2012 08:00', endedAt: '12/12/2012 09:00', duration: '01:00' },
        { id: 1, token: 'ASXC-98DC', student: 'JOÃO DA SILVA', test: 'AVALIAÇÃO ITATIBA 4º MAT', period: '4º BIM', discipline: 'MATEMÁTICA', startedAt: '12/12/2012 08:00', endedAt: '12/12/2012 09:00', duration: '01:00' },
        { id: 1, token: 'ASXC-98DC', student: 'JOÃO DA SILVA', test: 'AVALIAÇÃO ITATIBA 4º MAT', period: '4º BIM', discipline: 'MATEMÁTICA', startedAt: '12/12/2012 08:00', endedAt: '12/12/2012 09:00', duration: '01:00' },
        { id: 1, token: 'ASXC-98DC', student: 'JOÃO DA SILVA', test: 'AVALIAÇÃO ITATIBA 4º MAT', period: '4º BIM', discipline: 'MATEMÁTICA', startedAt: '12/12/2012 08:00', endedAt: '12/12/2012 09:00', duration: '01:00' },
        { id: 1, token: 'ASXC-98DC', student: 'JOÃO DA SILVA', test: 'AVALIAÇÃO ITATIBA 4º MAT', period: '4º BIM', discipline: 'MATEMÁTICA', startedAt: '12/12/2012 08:00', endedAt: '12/12/2012 09:00', duration: '01:00' },
        { id: 1, token: 'ASXC-98DC', student: 'JOÃO DA SILVA', test: 'AVALIAÇÃO ITATIBA 4º MAT', period: '4º BIM', discipline: 'MATEMÁTICA', startedAt: '12/12/2012 08:00', endedAt: '12/12/2012 09:00', duration: '01:00' },
        { id: 1, token: 'ASXC-98DC', student: 'JOÃO DA SILVA', test: 'AVALIAÇÃO ITATIBA 4º MAT', period: '4º BIM', discipline: 'MATEMÁTICA', startedAt: '12/12/2012 08:00', endedAt: '12/12/2012 09:00', duration: '01:00' },
        { id: 1, token: 'ASXC-98DC', student: 'JOÃO DA SILVA', test: 'AVALIAÇÃO ITATIBA 4º MAT', period: '4º BIM', discipline: 'MATEMÁTICA', startedAt: '12/12/2012 08:00', endedAt: '12/12/2012 09:00', duration: '01:00' },
        { id: 1, token: 'ASXC-98DC', student: 'JOÃO DA SILVA', test: 'AVALIAÇÃO ITATIBA 4º MAT', period: '4º BIM', discipline: 'MATEMÁTICA', startedAt: '12/12/2012 08:00', endedAt: '12/12/2012 09:00', duration: '01:00' },
        { id: 1, token: 'ASXC-98DC', student: 'JOÃO DA SILVA', test: 'AVALIAÇÃO ITATIBA 4º MAT', period: '4º BIM', discipline: 'MATEMÁTICA', startedAt: '12/12/2012 08:00', endedAt: '12/12/2012 09:00', duration: '01:00' },
        { id: 1, token: 'ASXC-98DC', student: 'JOÃO DA SILVA', test: 'AVALIAÇÃO ITATIBA 4º MAT', period: '4º BIM', discipline: 'MATEMÁTICA', startedAt: '12/12/2012 08:00', endedAt: '12/12/2012 09:00', duration: '01:00' },
        { id: 1, token: 'ASXC-98DC', student: 'JOÃO DA SILVA', test: 'AVALIAÇÃO ITATIBA 4º MAT', period: '4º BIM', discipline: 'MATEMÁTICA', startedAt: '12/12/2012 08:00', endedAt: '12/12/2012 09:00', duration: '01:00' }
      ]

      return { status: 200, data: result };
    }
    catch (error: any) { console.log(error); return { status: 500, message: error.message } }
  }

  async getToken(request: Request) {
    try {
      let result;
      return { status: 200, data: result };
    }
    catch (error: any) { console.log(error); return { status: 500, message: error.message } }
  }

  async saveToken(body: { user: UserInterface, maxUses: number | string, classroomId: number, testId: number }) {

    try {

      let result;

      const tUser = await this.qUser(body.user.user)

      const sqlDateTime = Helper.generateDateTime()

      const element = {
        teacherId: tUser.teacherId,
        maxUses: body.maxUses,
        classroomId: body.classroomId,
        testId: body.testId,
        created_at: sqlDateTime.createdAt,
        expiresAt: sqlDateTime.expiresAt
      }

      return { status: 201, data: result };
    }
    catch (error: any) { console.log(error); return { status: 500, message: error.message } }
  }
}

export const tokenController = new TokenController();
