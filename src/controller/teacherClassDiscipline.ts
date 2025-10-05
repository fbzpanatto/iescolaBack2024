import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { TeacherClassDiscipline } from "../model/TeacherClassDiscipline";
import { UserInterface } from "../interfaces/interfaces";

class TeacherClassDisciplineController extends GenericController<EntityTarget<TeacherClassDiscipline>> {
  constructor() { super(TeacherClassDiscipline) }

  async updateContract(body: { teacherId: number, schoolId: number, contractId: number, categoryId: number, yearId: number, yearName: string, classroom: number, user: UserInterface }){
    try {
      const teacher = await this.qTeacherByUser(body.user.user);

      if(![1, 2, 10].includes(teacher.person.category.id)){ return { status: 403, message: 'Você não tem permissão para acessar ou modificar este recurso.' } }

      const currentYear = await this.qCurrentYear()
      const isCurrentYear = currentYear.name === body.yearName

      if(isCurrentYear){
        await this.updateTeacherContractCurrentYear(body)
        return { status: 200, data: { message: 'Contrato atualizado com sucesso' } };
      }

      await this.updateTeacherContractOtherYear(body)
      return { status: 200, data: { message: 'Contrato atualizado com sucesso' } };
    }
    catch(error: any) { console.log(error); return { status: 500, message: error.message } }
  }
}

export const teacherRelationController = new TeacherClassDisciplineController();