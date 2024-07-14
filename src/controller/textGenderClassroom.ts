import { GenericController } from "./genericController";
import { TextGenderClassroom } from "../model/TextGenderClassroom";
import { Request } from "express";
import { AppDataSource } from "../data-source";
import { Classroom } from "../model/Classroom";
import { EntityTarget } from "typeorm";

class TextGenderClassroomController extends GenericController<EntityTarget<TextGenderClassroom>> {

  constructor() { super(TextGenderClassroom) }

  async getTabs(req: Request) {
    try {
      return await AppDataSource.transaction(async(CONN)=>{
        const classroom = await CONN.findOne(Classroom, { select: ['shortName'], where: { id: Number(req.params.id) } })
        if(!classroom) return { status: 404, message: 'Sala não encontrada.' }
        const tabs = await CONN.getRepository(TextGenderClassroom)
          .createQueryBuilder('textGenderClassroom')
          .leftJoinAndSelect('textGenderClassroom.textGender', 'textGender')
          .where('classroomNumber = :classroomNumber', { classroomNumber: classroom.shortName.replace(/\D/g, '') })
          .getMany()
        let totalTab = { id: 99, classroomNumber: 99, textGender: { id: 99, name: "COMPARATIVO" }, notInclude: true }
        return { status: 200, data: [...tabs, totalTab] }
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async getTabsReport(req: Request) {
    try {
      return await AppDataSource.transaction(async (CONN)=>{
        const textGenderTabs = await CONN.getRepository(TextGenderClassroom)
          .createQueryBuilder('textGenderClassroom')
          .leftJoinAndSelect('textGenderClassroom.textGender', 'textGender')
          .where('classroomNumber = :classroomNumber', { classroomNumber: req.params.classroomNumber })
          .getMany()
        if(!textGenderTabs) return { status: 404, message: 'Gêneros Textuais não foram encontrados' }
        return { status: 200, data: textGenderTabs }
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const textGenderClassroomController = new TextGenderClassroomController();
