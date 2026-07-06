import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { Student } from "../model/Student";
import { Request } from "express";
import { PER_CAT } from "../utils/enums";

import { UserInterface } from "../interfaces/interfaces";

class StudentMergeController extends GenericController<EntityTarget<Student>> {

  constructor() { super(Student) }

  async getAllStudentsToMerge(request: Request) {

    const { search, limit, offset } = request.query;

    try {

      const pSearch = search as string || '';
      const pLimit = !isNaN(parseInt(limit as string)) ? parseInt(limit as string) : 100;
      const pOffset = !isNaN(parseInt(offset as string)) ? parseInt(offset as string) : 0;

      const tUser = await this.qUser(request?.body?.user?.user);

      const masterUser = tUser?.categoryId === PER_CAT.ADMN ||
        tUser?.categoryId === PER_CAT.SUPE ||
        tUser?.categoryId === PER_CAT.FORM;

      const duplicatedStudents = await this.getDuplicatedStudents(masterUser, pLimit, pOffset, pSearch);

      return { status: 200, data: duplicatedStudents }

    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async mergeStudents(body: { user: UserInterface, wrongId: number, rightId: number, ra: string, dv: string, birth: string }) {
    try {

      const { wrongId, rightId, ra, dv, birth } = body;

      const processMerge = await this.mergeDuplicatedStudent({ wrongId, rightId, ra, dv, birth });

      return { status: 200, data: processMerge.message }

    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const smController = new StudentMergeController();