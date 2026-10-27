import { Request } from "express";
import { Training } from "../model/Training";
import { EntityTarget } from "typeorm";
import { GenericController } from "./genericController";
import { TrainingAndSchedulesBody, UserInterface, JwtPayload } from "../interfaces/interfaces";
import { yearRepository } from "../repositories/year.repository";
import { catalogRepository } from "../repositories/catalog.repository";
import { teacherRepository } from "../repositories/teacher.repository";
import { teacherClassDisciplineRepository } from "../repositories/teacher-class-discipline.repository";
import { classroomRepository } from "../repositories/classroom.repository";
import { trainingRepository } from "../repositories/training.repository";

class TrainingController extends GenericController<EntityTarget<Training>> {
  constructor() { super(Training) }

  async getAll(req: Request<{ year: string }>) {
    const { year } = req.params;
    const { search, peb, limit, offset } = req.query;

    try {

      const qYear = await yearRepository.qYearByName(year);

      const trainings = await trainingRepository.qTrainings(qYear.id, search as string, parseInt(peb as string), parseInt(limit as string), parseInt(offset as string));

      return { status: 200, data: trainings };
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  async getOne(req: Request<{ id: string }>) {
    const { id } = req.params;
    try {
      const result = await trainingRepository.qOneTraining(parseInt(id));
      return { status: 200, data: result };
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  async presenceTeachersByCategory(req: Request, authUser: JwtPayload) {
    const { reference } = req.query;

    try {
      const teacher = await teacherRepository.qTeacherByUser(authUser.user);
      const cYear = await yearRepository.qCurrentYear()

      const refTraining = await trainingRepository.qPresence(parseInt(reference as string));
      if (!refTraining) { return { status: 404, message: 'Training não encontrado' } }

      const refTrainingYear = await yearRepository.qYearById(refTraining.yearId);
      const allTrainings = await trainingRepository.qAllReferencedTrainings(refTraining);
      const trainingIds = allTrainings.map(t => t.id);

      const preTeachers = await teacherClassDisciplineRepository.qTeachersByCategory(refTraining, cYear.id === refTraining.yearId, refTrainingYear.name, teacher, trainingIds);
      const allReferencedTeachers = await trainingRepository.qTeacherTrainings(preTeachers, trainingIds, refTraining.categoryId, cYear.id === refTraining.yearId, refTrainingYear.name);

      const contracts = await catalogRepository.qContracts();
      const status = await trainingRepository.qTeacherTrainingStatus();

      return { status: 200, data: { allReferencedTrainings: allTrainings, allReferencedTeachers, contracts, status } };
    }
    catch (error: any) { console.log(error); return { status: 500, message: error.message } }
  }

  async trainingForm(_: Request) {
    try {
      const classroomCategories = await catalogRepository.qClassroomCategories();
      const disciplines = await catalogRepository.qDisciplines();
      const months = await trainingRepository.qTrainingSchedulesMonthReference();
      const classrooms = await classroomRepository.qNumberClassrooms();
      const meetings = await trainingRepository.qTrainingSchedulesMeetings();
      return { status: 200, data: { classrooms, classroomCategories, disciplines, months, meetings } };
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  async saveTraining(body: TrainingAndSchedulesBody, authUser: JwtPayload) {
    try {

      const { classroom, discipline, category, observation, month, meeting } = body;

      const currentYear = await yearRepository.qCurrentYear();

      const teacher = await teacherRepository.qTeacherByUser(authUser.user);

      const training = await trainingRepository.qNewTraining(currentYear.id, category, month, meeting, teacher.person.user.id, classroom, discipline, observation);

      return { status: 201, data: { message: 'OK', trainingId: training.insertId } };
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  async updateTraining(id: string, body: TrainingAndSchedulesBody, authUser: JwtPayload) {
    try {
      const trainingId = parseInt(id);
      if (isNaN(trainingId)) { return { status: 400, message: 'ID inválido' } }

      const { classroom, discipline, category, observation, month, meeting } = body;

      const existingTraining = await trainingRepository.qOneTraining(trainingId);

      if (!existingTraining) { return { status: 404, message: 'Formação não localizada.' } }

      const teacher = await teacherRepository.qTeacherByUser(authUser.user);

      if(body.discipline != existingTraining.discipline) { await trainingRepository.qDeleteTrainingTeacher(existingTraining.id) }

      await trainingRepository.qUpdateTraining(trainingId, meeting, category, month, teacher.person.user.id, classroom, discipline, observation);

      return { status: 200, data: { message: 'Formação atualizado com sucesso.' } };
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  async updateTeacherTrainingStatus(body: { user: UserInterface, teacherId: number, statusId: number, trainingId: number }, authUser: JwtPayload) {
    try {

      const existingTraining = await trainingRepository.qOneTraining(body.trainingId);
      if (!existingTraining) { return { status: 404, message: 'Formação não encontrada' } }

      if (await teacherClassDisciplineRepository.qIsMeetingBeforeTeacherLink(body.teacherId, body.trainingId)) { return { status: 400, message: 'Encontro anterior ao vínculo do professor' } }

      const teacher = await teacherRepository.qTeacherByUser(authUser.user);

      await trainingRepository.qUpsertTrainingTeacher(body.teacherId, body.trainingId, body.statusId, teacher.person.user.id );

      return { status: 200, data: { message: 'Status do professor na formação atualizado com sucesso.' } };
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  async updateTeacherTrainingObservation(body: { user: UserInterface, teacherId: number, observation: string, trainingId: number }, authUser: JwtPayload) {
    try {

      const existingTraining = await trainingRepository.qOneTraining(body.trainingId);
      if (!existingTraining) { return { status: 404, message: 'Training não encontrado' } }

      if (await teacherClassDisciplineRepository.qIsMeetingBeforeTeacherLink(body.teacherId, body.trainingId)) { return { status: 400, message: 'Encontro anterior ao vínculo do professor' } }

      const teacher = await teacherRepository.qTeacherByUser(authUser.user);

      await trainingRepository.qUpsertTrainingTeacherObs(body.teacherId, body.trainingId, body.observation, teacher.person.user.id );

      return { status: 200, data: { message: 'Status do professor na formação atualizado com sucesso' } };
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const trainingController = new TrainingController();