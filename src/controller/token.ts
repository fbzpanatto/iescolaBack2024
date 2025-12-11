import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { Transfer } from "../model/Transfer";
import { Request } from "express";

class TokenController extends GenericController<EntityTarget<any>> {

  // TODO: change to Token
  constructor() { super(Transfer) }

  async getAllTokens(request: Request) {

    const { search, bimester, discipline, limit, offset } = request.query
    const { year } = request.params

    console.log(year, search, bimester, discipline, limit, offset)

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

    console.log('getToken')

    try {
      let result;
      return { status: 200, data: result };
    }
    catch (error: any) { console.log(error); return { status: 500, message: error.message } }
  }

}

export const tokenController = new TokenController();
