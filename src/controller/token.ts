import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { Request } from "express";
import { Helper } from "../utils/helpers";
import { PER_CAT } from "../utils/enums";
import { UserInterface } from "../interfaces/interfaces";
import { TestToken } from "../model/Token";

class TokenController extends GenericController<EntityTarget<TestToken>> {

  constructor() { super(TestToken) }

  async getFormData(request: Request) {

    try {

      const tUser = await this.qUser(request?.body.user.user)

      const masterUser = tUser?.categoryId === PER_CAT.ADMN ||
                         tUser?.categoryId === PER_CAT.SUPE ||
                         tUser?.categoryId === PER_CAT.FORM;

      const currentYear = await this.qCurrentYear();

      if (!currentYear) { return { status: 404, message: 'Nenhum ano letivo ativo foi encontrado no sistema.' } }

      const activeYearValue = currentYear.name;

      let result = await this.testByClassroomAndTeacher(tUser.teacherId, activeYearValue, masterUser)

      return { status: 200, data: result };
    }
    catch (error: any) { console.log(error); return { status: 500, message: error.message } }
  }

  async getAllTokens(req: Request) {

    const { search, limit, offset, bimester, discipline } = req.query;

    const pSearch = search as string || '';
    const pLimit = !isNaN(parseInt(limit as string)) ? parseInt(limit as string) : 100;
    const pOffset = !isNaN(parseInt(offset as string)) ? parseInt(offset as string) : 0;
    const pBimesterId = !isNaN(parseInt(bimester as string)) ? parseInt(bimester as string) : null;
    const pDisciplineId = !isNaN(parseInt(discipline as string)) ? parseInt(discipline as string) : null;

    try {
      // 1. Resgata os dados do usuário que está fazendo a requisição
      const tUser = await this.qUser(req?.body?.user?.user);

      // 2. Define se ele é um "super usuário" (Admin, Supervisor, etc)
      const masterUser = tUser?.categoryId === PER_CAT.ADMN ||
        tUser?.categoryId === PER_CAT.SUPE ||
        tUser?.categoryId === PER_CAT.FORM;

      // 3. Passa o ID do professor e o status de masterUser para a querie
      let result = await this.qGetAllTokens(
        pSearch,
        pBimesterId,
        pDisciplineId,
        pLimit,
        pOffset,
        tUser.teacherId, // Novo parâmetro
        masterUser       // Novo parâmetro
      );

      return { status: 200, data: result };
    }
    catch (error: any) {
      console.log(error);
      return { status: 500, message: error.message };
    }
  }

  async saveToken(body: { user: UserInterface, leftUses: number, classroomId: number, testId: number }) {

    try {

      const tUser = await this.qUser(body.user.user)

      const sqlDateTime = Helper.generateDateTime()

      let testToken = await this.createTestToken({
        teacherId: tUser.teacherId,
        leftUses: body.leftUses,
        classroomId: body.classroomId,
        testId: body.testId,
        createdAt: sqlDateTime.createdAt,
        expiresAt: sqlDateTime.expiresAt,
        code: Helper.generateRandomCode()
      })

      return { status: 201, data: testToken };
    }
    catch (error: any) { console.log(error); return { status: 500, message: error.message } }
  }
}

export const tokenController = new TokenController();
