import { Request } from "express";
import { Training } from "../model/Training";
import { EntityTarget } from "typeorm";
import { GenericController } from "./genericController";
import { TrainingAndSchedulesBody, UserInterface } from "../interfaces/interfaces";

class TrainingController extends GenericController<EntityTarget<Training>> {
  constructor() { super(Training) }

  async getAll(req: Request) {
    const { year } = req.params;
    const { search, peb, limit, offset } = req.query;

    try {

      const qYear = await this.qYearByName(year);

      const trainings = await this.qTrainings(qYear.id, search as string, parseInt(peb as string), parseInt(limit as string), parseInt(offset as string));

      return { status: 200, data: trainings };
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  async getOne(req: Request) {
    const { id } = req.params;
    try {
      const result = await this.qOneTraining(parseInt(id));
      return { status: 200, data: result };
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  async presenceTeachersByCategory(req: Request) {
    const { reference } = req.query;
    const body = req.body

    try {
      const teacher = await this.qTeacherByUser(body.user.user);
      const cYear = await this.qCurrentYear()

      const refTraining = await this.qPresence(parseInt(reference as string));
      if (!refTraining) { return { status: 404, message: 'Training não encontrado' } }

      const refTrainingYear = await this.qYearById(refTraining.yearId);
      const allTrainings = await this.qAllReferencedTrainings(refTraining);
      const trainingIds = allTrainings.map(t => t.id);

      const preTeachers = await this.qTeachersByCategory(refTraining, cYear.id === refTraining.yearId, refTrainingYear.name, teacher);
      const allReferencedTeachers = await this.qTeacherTrainings(preTeachers, trainingIds, refTraining.categoryId, cYear.id === refTraining.yearId, refTrainingYear.name);

      const contracts = await this.qContracts();
      const status = await this.qTeacherTrainingStatus();

      return { status: 200, data: { allReferencedTrainings: allTrainings, allReferencedTeachers, contracts, status } };
    }
    catch (error: any) { console.log(error); return { status: 500, message: error.message } }
  }

  async trainingForm(_: Request) {
    try {
      const classroomCategories = await this.qClassroomCategories();
      const disciplines = await this.qDisciplines();
      const months = await this.qTrainingSchedulesMonthReference();
      const classrooms = await this.qNumberClassrooms();
      const meetings = await this.qTrainingSchedulesMeetings();
      return { status: 200, data: { classrooms, classroomCategories, disciplines, months, meetings } };
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  async saveTraining(body: TrainingAndSchedulesBody) {
    try {

      const { classroom, discipline, category, observation, month, meeting } = body;

      const currentYear = await this.qCurrentYear();

      const teacher = await this.qTeacherByUser(body.user.user);

      const training = await this.qNewTraining(currentYear.id, category, month, meeting, teacher.person.user.id, classroom, discipline, observation);

      return { status: 201, data: { message: 'OK', trainingId: training.insertId } };
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  async updateTraining(id: string, body: TrainingAndSchedulesBody) {
    try {
      const trainingId = parseInt(id);
      if (isNaN(trainingId)) { return { status: 400, message: 'ID inválido' } }

      const { classroom, discipline, category, observation, month, meeting } = body;

      const existingTraining = await this.qOneTraining(trainingId);

      if (!existingTraining) { return { status: 404, message: 'Formação não localizada.' } }

      const teacher = await this.qTeacherByUser(body.user.user);

      if(body.discipline != existingTraining.discipline) { await this.qDeleteTrainingTeacher(existingTraining.id) }

      await this.qUpdateTraining(trainingId, meeting, category, month, teacher.person.user.id, classroom, discipline, observation);

      return { status: 200, data: { message: 'Formação atualizado com sucesso.' } };
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  async updateTeacherTrainingStatus(body: { user: UserInterface, teacherId: number, statusId: number, trainingId: number }) {
    try {

      const existingTraining = await this.qOneTraining(body.trainingId);
      if (!existingTraining) { return { status: 404, message: 'Formação não encontrada' } }

      const teacher = await this.qTeacherByUser(body.user.user);

      await this.qUpsertTrainingTeacher(body.teacherId, body.trainingId, body.statusId, teacher.person.user.id );

      return { status: 200, data: { message: 'Status do professor na formação atualizado com sucesso.' } };
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  async updateTeacherTrainingObservation(body: { user: UserInterface, teacherId: number, observation: string, trainingId: number }) {
    try {

      const existingTraining = await this.qOneTraining(body.trainingId);
      if (!existingTraining) { return { status: 404, message: 'Training não encontrado' } }

      const teacher = await this.qTeacherByUser(body.user.user);

      await this.qUpsertTrainingTeacherObs(body.teacherId, body.trainingId, body.observation, teacher.person.user.id );

      return { status: 200, data: { message: 'Status do professor na formação atualizado com sucesso' } };
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const trainingController = new TrainingController();