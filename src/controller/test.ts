import { GenericController } from "./genericController";
import {Brackets, DeepPartial, EntityTarget, FindManyOptions, ObjectLiteral, SaveOptions} from "typeorm";
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

class TestController extends GenericController<EntityTarget<Test>> {

  constructor() {
    super(Test);
  }

  async getAllClassroomStudents(options: FindManyOptions<ObjectLiteral> | undefined, request?: Request) {

    const testId = request?.params.id
    const classroomId = request?.params.classroom

    try {

      const { classrooms } = await this.teacherClassrooms(request?.body.user)
      if(!classrooms.includes(Number(classroomId))) return { status: 401, message: "Você não tem permissão para acessar essa sala." }

      const test = await AppDataSource.getRepository(Test)
        .createQueryBuilder("test")
        .leftJoinAndSelect("test.person", "person")
        .leftJoinAndSelect("test.period", "period")
        .leftJoinAndSelect("period.bimester", "bimester")
        .leftJoinAndSelect("period.year", "year")
        .leftJoinAndSelect("test.discipline", "discipline")
        .leftJoinAndSelect("test.category", "category")
        .where("test.id = :testId", { testId })
        .getOne()

      if(!test) return { status: 404, message: "Teste não encontrado" }

      const questionGroups = await AppDataSource.getRepository(QuestionGroup)
        .createQueryBuilder("questionGroup")
        .select(["questionGroup.id AS id", "questionGroup.name AS name"])
        .addSelect("COUNT(testQuestions.id)", "questionsCount")
        .leftJoin("questionGroup.testQuestions", "testQuestions")
        .where("testQuestions.test = :testId", { testId: test.id })
        .groupBy("questionGroup.id")
        .getRawMany();

      const testQuestions = await AppDataSource.getRepository(TestQuestion)
        .createQueryBuilder("testQuestion")
        .leftJoinAndSelect("testQuestion.question", "question")
        .leftJoinAndSelect("testQuestion.questionGroup", "questionGroup")
        .leftJoinAndSelect("testQuestion.test", "test")
        .where("testQuestion.test = :testId", { testId: test.id })
        .orderBy("questionGroup.id", "ASC")
        .addOrderBy("testQuestion.order", "ASC")
        .getMany();

      const classroom = await AppDataSource.getRepository(Classroom)
        .createQueryBuilder("classroom")
        .leftJoinAndSelect("classroom.school", "school")
        .where("classroom.id = :classroomId", { classroomId })
        .getOne();

      const studentClassrooms = await this.studentClassrooms(test, Number(classroomId))

      for (let studentClassroom of studentClassrooms) {
        for (let testQuestion of testQuestions) {
          const existingRecord = await AppDataSource.getRepository(StudentQuestion).findOne({
            where: {
              student: { id: Number(studentClassroom.student.id) },
              testQuestion: { id: Number(testQuestion.id) }
            },
          });
          if (!existingRecord) {
            await AppDataSource.getRepository(StudentQuestion).upsert({
              student: studentClassroom.student,
              testQuestion: testQuestion,
              answer: '',
            }, ["student", "testQuestion"]);
          }
        }
      }

      return { status: 200, data: { test, classroom, testQuestions, studentClassrooms, questionGroups  } };
    } catch (error: any) {return { status: 500, message: error.message }}
  }

  async studentClassrooms(test: Test, classroomId: number) {
    return await AppDataSource.getRepository(StudentClassroom)
      .createQueryBuilder("studentClassroom")
      .leftJoinAndSelect("studentClassroom.student", "student")
      .leftJoinAndSelect("student.person", "person")
      .leftJoinAndSelect("student.studentQuestions", "studentQuestions")
      .leftJoinAndSelect("studentQuestions.testQuestion", "testQuestion")
      .leftJoin("testQuestion.questionGroup", "questionGroup")
      .leftJoinAndSelect("testQuestion.test", "test", "test.id = :testId", { testId: test.id })
      .leftJoin("studentClassroom.classroom", "classroom")
      .where("classroom.id = :classroomId", { classroomId })
      .andWhere(new Brackets(qb => {
        qb.where("studentClassroom.startedAt < :testCreatedAt", { testCreatedAt: test.createdAt })
      }))
      .orderBy("questionGroup.id", "ASC")
      .addOrderBy("testQuestion.order", "ASC")
      .getMany();
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

  override async findOneById(testId: number | string, body?: ObjectLiteral) {

    try {

      const teacher = await this.teacherByUser(body?.user.user)

      const test = await AppDataSource.getRepository(Test)
        .findOne({
          relations: ["period", "period.year", "period.bimester", "discipline", "category", "person", "classrooms.school"],
          where: { id: Number(testId) },
        })

      if( teacher.person.id !== test?.person.id ) return { status: 401, message: "Você não tem permissão para editar esse teste." }

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
        .leftJoin("classroom.studentClassrooms", "studentClassroom", "studentClassroom.endedAt IS NULL")
        .where("classroom.id IN (:...classesIds)", { classesIds })
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
        classrooms: classes,
        createdAt: new Date(),
      });

      const testQuestions = body.testQuestions.map((register: any) => ({ ...register, test: newTest }))
      await AppDataSource.getRepository(TestQuestion).save(testQuestions)

      return { status: 201, data: newTest };
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  override async updateId(id: number | string, body: ObjectLiteral) {
    try {

      const teacher = await this.teacherByUser(body.user.user)

      const test = await AppDataSource.getRepository(Test)
        .findOne({
          relations: ["person"],
          where: { id: Number(id) }
        })

      if(!test) return { status: 404, message: "Teste não encontrado" }
      if( teacher.person.id !== test.person.id ) return { status: 401, message: "Você não tem permissão para editar esse teste." }

      test.name = body.name

      await AppDataSource.getRepository(Test).save(test)

      const testQuestions = body.testQuestions.map((register: any) => ({ ...register, test: test }))

      await AppDataSource.getRepository(TestQuestion).save(testQuestions)

      const result = (await this.findOneById(id, body)).data

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
    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const testController = new TestController();
