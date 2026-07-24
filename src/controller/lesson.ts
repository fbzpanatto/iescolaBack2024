import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { Request } from "express";
import { Lesson } from "../model/Lesson";
import { UserInterface } from "../interfaces/interfaces";
import {PER_CAT} from "../utils/enums";

class LessonController extends GenericController<EntityTarget<Lesson>> {

  constructor() { super(Lesson) }

  async getFormData(_: Request) {
    try {

      const disciplines = await this.qDisciplines();

      return { status: 200, data: { disciplines } };
    }
    catch (error: any) { console.log(error); return { status: 500, message: error.message } }
  }

  async getAllLessons(req: Request) {

    const { search, limit, offset, discipline, classroom } = req.query;

    const pSearch = search as string || '';
    const pLimit = !isNaN(parseInt(limit as string)) ? parseInt(limit as string) : 100;
    const pOffset = !isNaN(parseInt(offset as string)) ? parseInt(offset as string) : 0;
    const pDisciplineId = !isNaN(parseInt(discipline as string)) ? parseInt(discipline as string) : null;
    const pClassroomNumber = !isNaN(parseInt(classroom as string)) ? parseInt(classroom as string) : null;

    try {

      let result = await this.qGetAllLessons(
        pSearch,
        pDisciplineId,
        pClassroomNumber,
        pLimit,
        pOffset
      );

      return { status: 200, data: result };
    }
    catch (error: any) {
      console.log(error);
      return { status: 500, message: error.message };
    }
  }

  async getLesson(req: Request) {

    const lessonId = Number(req.params.id);

    if (isNaN(lessonId)) { return { status: 400, message: 'Atividade inválida.' } }

    try {

      const lesson = await this.qGetLessonById(lessonId);

      if (!lesson) { return { status: 404, message: 'Atividade não encontrada.' } }

      return { status: 200, data: lesson };
    }
    catch (error: any) {
      console.log(error);
      return { status: 500, message: error.message };
    }
  }

  async saveLesson(body: { user: UserInterface, name: string, disciplineId: number, classroomNumber: number, s3Key: string }) {

    // Série precisa ser um inteiro de 1 a 9. A coluna é TINYINT UNSIGNED e aceitaria
    // qualquer valor até 255, deixando a atividade invisível nos filtros do front.
    if (!Number.isInteger(body.classroomNumber) || body.classroomNumber < 1 || body.classroomNumber > 9) {
      return { status: 400, message: 'Série informada é inválida.' };
    }

    try {

      const tUser = await this.qUser(body.user.user)

      // Nome sempre gravado em maiúsculas.
      let lesson = await this.createLesson(
        body.name.toUpperCase(),
        body.disciplineId,
        body.classroomNumber,
        body.s3Key,
        tUser.userId as number
      )

      return { status: 201, data: lesson };
    }
    catch (error: any) { console.log(error); return { status: 500, message: error.message } }
  }

  async updateLesson(req: Request) {

    const lessonId = Number(req.params.id);
    const body = req.body as { user: UserInterface, name: string, s3Key?: string };

    if (isNaN(lessonId)) { return { status: 400, message: 'Atividade inválida.' } }

    if (!body.name || !body.name.trim()) { return { status: 400, message: 'O nome da atividade é obrigatório.' } }

    try {

      const tUser = await this.qUser(body.user.user)

      // O aluno também tem PUT liberado na entidade "lesson" (usado no registro de
      // execução), então a edição da atividade precisa ser travada aqui pela categoria.
      if (tUser?.categoryId !== PER_CAT.ADMN) {
        return { status: 403, message: 'Você não tem permissão para editar esta atividade.' }
      }

      // Nome sempre gravado em maiúsculas. Disciplina e série não são editáveis:
      // alterá-las exigiria renumerar as aulas da sequência.
      const lesson = await this.updateLessonById(
        lessonId,
        body.name.toUpperCase(),
        body.s3Key ?? null,
        tUser.userId as number
      )

      if (!lesson) { return { status: 404, message: 'Atividade não encontrada.' } }

      return { status: 200, data: lesson };
    }
    catch (error: any) { console.log(error); return { status: 500, message: error.message } }
  }

  async saveLessonExecution(req: Request) {

    const lessonId = Number(req.params.id);
    const body = req.body as { user: { user: number, ra: string, category: number }, grade?: number | null };

    if (isNaN(lessonId)) { return { status: 400, message: 'Atividade inválida.' } }

    // Registrar execução é exclusivo do aluno: o id do aluno vem do próprio token.
    if (body.user?.category !== PER_CAT.ALUN) {
      return { status: 403, message: 'Apenas alunos podem registrar a execução de uma atividade.' }
    }

    const studentId = Number(body.user.user);

    const grade = body.grade === undefined || body.grade === null ? null : Number(body.grade);

    if (grade !== null && isNaN(grade)) { return { status: 400, message: 'Nota inválida.' } }

    try {

      // Confere a atividade antes de gravar: sem isso, um id inexistente
      // estouraria como erro de foreign key (500) em vez de um 404 claro.
      const lesson = await this.qGetLessonById(lessonId);

      if (!lesson) { return { status: 404, message: 'Atividade não encontrada.' } }

      const result = await this.upsertStudentLesson(studentId, lessonId, grade);

      return { status: 200, data: result };
    }
    catch (error: any) { console.log(error); return { status: 500, message: error.message } }
  }
}

export const lessonController = new LessonController();