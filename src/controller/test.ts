import { GenericController } from "./genericController";
import {DeepPartial, EntityTarget, FindManyOptions, In, ObjectLiteral, SaveOptions} from "typeorm";
import { Bimester } from "../model/Bimester";
import {Test} from "../model/Test";
import {AppDataSource} from "../data-source";
import {Person} from "../model/Person";
import {Period} from "../model/Period";
import {Classroom} from "../model/Classroom";
import {StudentClassroom} from "../model/StudentClassroom";
import {TestQuestion} from "../model/TestQuestion";
import {Request} from "express";

class TestController extends GenericController<EntityTarget<Test>> {

  constructor() {
    super(Test);
  }

  override async findAllWhere(options: FindManyOptions<ObjectLiteral> | undefined, request?: Request) {

    const yearId = request?.query.year as string
    const search = request?.query.search as string

    try {
      const tests = await AppDataSource.getRepository(Test)
        .createQueryBuilder("test")
        .select([
          "test.id",
          "test.name",
          "year.id",
          "year.name",
          "bimester.id",
          "bimester.name",
          "discipline.id",
          "discipline.name",
          "category.id",
          "category.name",
          "person.id",
          "person.name",
        ])
        .leftJoinAndSelect("test.period", "period")
        .leftJoin("period.year", "year")
        .leftJoin("period.bimester", "bimester")
        .leftJoin("test.discipline", "discipline")
        .leftJoin("test.category", "category")
        .leftJoin("test.person", "person")
        .where("period.year = :yearId", { yearId })
        .andWhere("test.name LIKE :search", { search: `%${search}%` })
        .getMany();

      return { status: 200, data: tests };
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  override async findOneById(testId: string | number) {
    try {

      const test = await AppDataSource.getRepository(Test)
        .findOne({
          relations: ["period", "period.year", "period.bimester", "discipline", "category", "person", "classrooms.school"],
          where: { id: Number(testId) },
        })

      if (!test) { return { status: 404, message: 'Data not found' } }

      const testQuestions = await AppDataSource.getRepository(TestQuestion)
        .createQueryBuilder("testQuestion")
        .select([
          "testQuestion.id",
          "testQuestion.order",
          "testQuestion.answer",
          "testQuestion.active",
          "question.id",
          "question.title",
          "descriptor.id",
          "descriptor.code",
          "descriptor.name",
          "topic.id",
          "topic.name",
          "topic.description",
          "classroomCategory.id",
          "classroomCategory.name",
          "questionGroup.id",
          "questionGroup.name",
        ])
        .leftJoin("testQuestion.question", "question")
        .leftJoin("question.descriptor", "descriptor")
        .leftJoin("descriptor.topic", "topic")
        .leftJoin("topic.classroomCategory", "classroomCategory")
        .leftJoin("testQuestion.questionGroup", "questionGroup")
        .where("testQuestion.test = :testId", { testId: test.id })
        .getMany();

      return { status: 200, data: { ...test, testQuestions } };
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  override async save(body: DeepPartial<ObjectLiteral>, options: SaveOptions | undefined) {

    const classesIds = body.classroom.map((classroom: { id: number }) => classroom.id)

    try {
      const userPerson = await AppDataSource.getRepository(Person)
        .findOne({ where: { user: { id: body.user.user } } })

      const period = await AppDataSource.getRepository(Period)
        .findOne({ where: { year: body.year, bimester: body.bimester }})

      if(!userPerson) return { status: 404, message: "Usuário inexistente" }
      if(!period) return { status: 404, message: "Period não encontrado" }

      const classes = await AppDataSource.getRepository(Classroom)
        .createQueryBuilder("classroom")
        .select(["classroom.id", "classroom.name", "classroom.shortName"])
        .leftJoinAndSelect("classroom.studentClassrooms", "studentClassroom")
        .where("classroom.id IN (:...classesIds)", { classesIds })
        .andWhere("studentClassroom.endedAt IS NULL")
        .groupBy("classroom.id, studentClassroom.id")
        .having("COUNT(studentClassroom.id) > 0")
        .getMany();

      if(!classes || classes.length < 1) return { status: 404, message: "Não existem alunos matriculados em alguma das salas informadas." }

      const newTest = await AppDataSource.getRepository(Test).save({
        name: body.name,
        category: body.category,
        discipline: body.discipline,
        person: userPerson,
        period: period,
        classrooms: classes
      });

      const testQuestions = body.testQuestions.map((register: any) => ({ ...register, test: newTest }))
      await AppDataSource.getRepository(TestQuestion).save(testQuestions)

      return { status: 201, data: newTest };
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  override async updateId(id: number | string, body: ObjectLiteral) {
    try {

      const test = await AppDataSource.getRepository(Test)
        .findOne({ where: { id: Number(id) } })

      if(!test) return { status: 404, message: "Teste não encontrado" }

      test.name = body.name

      await AppDataSource.getRepository(Test).save(test)

      const testQuestions = body.testQuestions.map((register: any) => ({ ...register, test: test }))

      await AppDataSource.getRepository(TestQuestion).save(testQuestions)

      const result = (await this.findOneById(id)).data

      return { status: 200, data: result };
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  override async deleteId(request: Request) {

    const testId = request.params.id
    const body = request.body

    try {

      const teacher = await this.teacherByUser(body.user.user)

      const test = await AppDataSource.getRepository(Test)
        .findOne({
          relations: ["person"],
          where: { id: Number(testId) }
        })
      if (!test) { return { status: 404, message: 'Data not found' } }

      if( teacher.person.id !== test.person.id ) return { status: 401, message: "Você não tem permissão para deletar esse teste." }

      // TODO: Only delete if there is no student with a test result

      await AppDataSource.getRepository(TestQuestion)
        .createQueryBuilder()
        .delete()
        .from(TestQuestion)
        .where("test = :testId", { testId })
        .execute();

      const result = await AppDataSource.getRepository(Test)
        .createQueryBuilder()
        .delete()
        .from(Test)
        .where("id = :testId", { testId })
        .execute();

      return { status: 200, data: result };
    } catch (error: any) {
      console.log(error)
      return { status: 500, message: error.message }
    }
  }
}

export const testController = new TestController();
