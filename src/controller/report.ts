import {GenericController} from "./genericController";
import {DeepPartial, EntityTarget, FindManyOptions, ObjectLiteral, SaveOptions} from "typeorm";
import {Test} from "../model/Test";
import {AppDataSource} from "../data-source";
import {Person} from "../model/Person";
import {Period} from "../model/Period";
import {Classroom} from "../model/Classroom";
import {StudentClassroom} from "../model/StudentClassroom";
import {TestQuestion} from "../model/TestQuestion";
import {Request} from "express";
import {QuestionGroup} from "../model/QuestionGroup";
import {StudentQuestion} from "../model/StudentQuestion";
import {School} from "../model/School";

interface schoolAsClassroom { id: number, name: string, shortName: string, studentClassrooms: StudentClassroom[] }

class ReportController extends GenericController<EntityTarget<Test>> {

  constructor() {
    super(Test);
  }

  async getReport(request: Request) {

    const yearId = request?.query.year as string
    const testId = request?.params.id

    try {

      const testQuestions = await this.getTestQuestions(Number(testId))
      if (!testQuestions) return { status: 404, message: "Questões não encontradas" }

      const testQuestionsIds = testQuestions.map(testQuestion => testQuestion.id)
      const questionGroups = await this.getTestQuestionsGroups(Number(testId))

      const test = await AppDataSource.getRepository(Test)
        .createQueryBuilder("test")
        .leftJoinAndSelect("test.period", "period")
        .leftJoinAndSelect("period.bimester", "periodBimester")
        .leftJoinAndSelect("period.year", "periodYear")
        .leftJoinAndSelect("test.discipline", "discipline")
        .leftJoinAndSelect("test.category", "category")
        .leftJoinAndSelect("test.person", "testPerson")
        .where("test.id = :testId", { testId })
        .andWhere("periodYear.id = :yearId", { yearId })
        .getOne()

      if(!test) return { status: 404, message: "Teste não encontrado" }

      const schools = await AppDataSource.getRepository(School)
        .createQueryBuilder("school")
        .leftJoinAndSelect("school.classrooms", "classroom")
        .leftJoinAndSelect("classroom.studentClassrooms", "studentClassroom")
        .leftJoinAndSelect("studentClassroom.studentQuestions", "studentQuestions")
        .leftJoinAndSelect("studentQuestions.testQuestion", "testQuestion", "testQuestion.id IN (:...testQuestions)", { testQuestions: testQuestionsIds })
        .leftJoin("testQuestion.test", "test")
        .leftJoin("studentClassroom.year", "year")
        .where("year.id = :yearId", { yearId })
        .andWhere("test.id = :testId", { testId })
        .andWhere("studentClassroom.startedAt < :testCreatedAt", { testCreatedAt: test.createdAt })
        .getMany()

      const schoolsWithStudentQuestionsRefactored = schools.map(school => ({
        ...school,
        classrooms: school.classrooms.map(classroom => ({
          ...classroom,
          studentClassrooms: classroom.studentClassrooms.map(studentClassroom => ({
            ...studentClassroom,
            studentQuestions: studentClassroom.studentQuestions.map(studentQuestion => {
              const testQuestion = testQuestions.find(testQuestion => testQuestion.id === studentQuestion.testQuestion.id);
              const score = testQuestion?.answer.includes(studentQuestion.answer.toUpperCase()) ? 1 : 0;
              return {...studentQuestion, score};
            })
          }))
        }))
      }));

      const studentsBySchoolRefactored: schoolAsClassroom[] = schoolsWithStudentQuestionsRefactored.map(school => ({
        id: school.id,
        name: school.name,
        shortName: school.shortName,
        studentClassrooms: school.classrooms.flatMap(classroom => classroom.studentClassrooms)
      }));

      let response = { ...test, testQuestions, questionGroups, schools: studentsBySchoolRefactored }
      return { status: 200, data: response };
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async getTestQuestions(testId: number) {
    return await AppDataSource.getRepository(TestQuestion)
      .createQueryBuilder("testQuestion")
      .leftJoinAndSelect("testQuestion.question", "question")
      .leftJoinAndSelect("testQuestion.questionGroup", "questionGroup")
      .leftJoin("testQuestion.test", "test")
      .where("testQuestion.test = :testId", { testId })
      .orderBy("questionGroup.id", "ASC")
      .addOrderBy("testQuestion.order", "ASC")
      .getMany();
  }

  async getTestQuestionsGroups(testId: number) {
    return await AppDataSource.getRepository(QuestionGroup)
      .createQueryBuilder("questionGroup")
      .select(["questionGroup.id AS id", "questionGroup.name AS name"])
      .addSelect("COUNT(testQuestions.id)", "questionsCount")
      .leftJoin("questionGroup.testQuestions", "testQuestions")
      .where("testQuestions.test = :testId", { testId })
      .groupBy("questionGroup.id")
      .getRawMany();
  }

  override async findAllWhere(options: FindManyOptions<ObjectLiteral> | undefined, request?: Request) {

    const yearId = request?.query.year as string
    const search = request?.query.search as string

    try {

      // TODO: se não houver nenhuma sala cadastrada para o professor, vai dar erro no sistema após criação do banco de dados
      const teacherClasses = await this.teacherClassrooms(request?.body.user)

      const testClasses = await AppDataSource.getRepository(Test)
        .createQueryBuilder("test")
        .leftJoinAndSelect("test.person", "person")
        .leftJoinAndSelect("test.period", "period")
        .leftJoinAndSelect("test.category", "category")
        .leftJoinAndSelect("period.year", "year")
        .leftJoinAndSelect("period.bimester", "bimester")
        .leftJoinAndSelect("test.discipline", "discipline")
        .leftJoinAndSelect("test.classrooms", "classroom")
        .leftJoinAndSelect("classroom.school", "school")
        .where("classroom.id IN (:...teacherClasses)", { teacherClasses: teacherClasses.classrooms })
        .andWhere("year.id = :yearId", { yearId })
        .andWhere("test.name LIKE :search", { search: `%${search}%` })
        .getMany();

      return { status: 200, data: testClasses };
    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const reportController = new ReportController();
