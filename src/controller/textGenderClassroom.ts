import { GenericController } from "./genericController";
import { TextGenderClassroom } from "../model/TextGenderClassroom";
import { Request } from "express";
import { AppDataSource } from "../data-source";
import { Classroom } from "../model/Classroom";
import { EntityTarget } from "typeorm";

class TextGenderClassroomController extends GenericController<EntityTarget<TextGenderClassroom>> {

  constructor() {
    super(TextGenderClassroom);
  }

  async getTabs(req: Request) {

    const { id: classroomId } = req.params

    try {

      const classroom = await AppDataSource
        .getRepository(Classroom)
        .findOne({ select: ['shortName'], where: { id: Number(classroomId) } }) as Classroom

      if(!classroom) return { status: 404, message: 'Sala não encontrada' }

      const notDigit = /\D/g
      const classroomNumber = classroom.shortName.replace(notDigit, '')

      const textGenderTabs = await AppDataSource
        .getRepository(TextGenderClassroom)
        .createQueryBuilder('textGenderClassroom')
        .leftJoinAndSelect('textGenderClassroom.textGender', 'textGender')
        .where('classroomNumber = :classroomNumber', { classroomNumber })
        .getMany()

      let totalTab = {
        id: 99,
        classroomNumber: 99,
        textGender: { id: 99, name: "COMPARATIVO" },
        notInclude: true
      }

      return { status: 200, data: [...textGenderTabs, totalTab] }

    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async getTabsReport(req: Request) {

    const { classroomNumber, year } = req.params

    try {

      const textGenderTabs = await AppDataSource
        .getRepository(TextGenderClassroom)
        .createQueryBuilder('textGenderClassroom')
        .leftJoinAndSelect('textGenderClassroom.textGender', 'textGender')
        .where('classroomNumber = :classroomNumber', { classroomNumber })
        .getMany()

      if(!textGenderTabs) return { status: 404, message: 'Gêneros Textuais não foram encontrados' }

      let totalTab = {
        id: 99,
        classroomNumber: 99,
        textGender: { id: 99, name: "COMPARATIVO" },
        notInclude: true
      }

      return { status: 200, data: [...textGenderTabs, totalTab] }

    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const textGenderClassroomController = new TextGenderClassroomController();
