import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { TeacherClassDiscipline } from "../model/TeacherClassDiscipline";
import { UserInterface } from "../interfaces/interfaces";
import { yearRepository } from "../repositories/year.repository";
import { teacherRepository } from "../repositories/teacher.repository";
import { teacherClassDisciplineRepository } from "../repositories/teacher-class-discipline.repository";

class TeacherClassDisciplineController extends GenericController<EntityTarget<TeacherClassDiscipline>> {
  constructor() {
    super(TeacherClassDiscipline, {
      table: 'teacher_class_discipline',
      selectColumns: ['id', 'startedAt', 'endedAt'],
      relations: { discipline: 'disciplineId', teacher: 'teacherId', classroom: 'classroomId', contract: 'contractId' },
      dateColumns: ['startedAt', 'endedAt']
    })
  }

  async updateContract(body: { teacherId: number, schoolId: number, contractId: number, categoryId: number, yearId: number, yearName: string, classroom: number, user: UserInterface }, authUser: UserInterface){
    try {
      const teacher = await teacherRepository.qTeacherByUser(authUser.user);

      if(![1, 2, 10].includes(teacher.person.category.id)){ return { status: 403, message: 'Você não tem permissão para acessar ou modificar este recurso.' } }

      const currentYear = await yearRepository.qCurrentYear()
      const isCurrentYear = currentYear.name === body.yearName

      if(isCurrentYear){
        await teacherClassDisciplineRepository.updateTeacherContractCurrentYear(body)
        return { status: 200, data: { message: 'Contrato atualizado com sucesso' } };
      }

      await teacherClassDisciplineRepository.updateTeacherContractOtherYear(body)
      return { status: 200, data: { message: 'Contrato atualizado com sucesso' } };
    }
    catch(error: any) { console.log(error); return { status: 500, message: error.message } }
  }
}

export const teacherRelationController = new TeacherClassDisciplineController();