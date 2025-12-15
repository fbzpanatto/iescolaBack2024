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

  async saveToken(body: { user: UserInterface, maxUses: number, classroomId: number, testId: number }) {

    try {

      const tUser = await this.qUser(body.user.user)

      const sqlDateTime = Helper.generateDateTime()

      let testToken = await this.createTestToken({
        teacherId: tUser.teacherId,
        maxUses: body.maxUses,
        classroomId: body.classroomId,
        testId: body.testId,
        createdAt: sqlDateTime.createdAt,
        expiresAt: sqlDateTime.expiresAt,
        code: this.generateRandomCode()
      })

      return { status: 201, data: testToken };
    }
    catch (error: any) { console.log(error); return { status: 500, message: error.message } }
  }

  generateRandomCode(length: number = 8): string {

    const CHARACTERS_SAFE = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

    const charsLength = CHARACTERS_SAFE.length;
    const middle = Math.floor(length / 2);

    const randomString = Array.from({ length: length }, () => {
      const randomIndex = Math.floor(Math.random() * charsLength);
      return CHARACTERS_SAFE.charAt(randomIndex);
    }).join('');

    // Insere o hífen no meio
    return randomString.slice(0, middle) + '-' + randomString.slice(middle);
  }
}

export const tokenController = new TokenController();
