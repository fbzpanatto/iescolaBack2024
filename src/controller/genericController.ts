import { DeepPartial, EntityManager, EntityTarget, FindManyOptions, FindOneOptions, IsNull, ObjectLiteral, SaveOptions } from "typeorm";
import { AppDataSource } from "../data-source";
import { Person } from "../model/Person";
import {
  QueryClassrooms,
  QuerySchools,
  QueryStudentClassrooms,
  SavePerson,
  QueryTest,
  QueryYear,
  QueryTestClassroom,
  QueryTeacherClassrooms,
  QueryUser,
  QueryClassroom,
  QueryState
} from "../interfaces/interfaces";
import { Year } from "../model/Year";
import { Classroom } from "../model/Classroom";
import { Request } from "express";
import { TransferStatus } from "../model/TransferStatus";
import { Teacher } from "../model/Teacher";
import { PoolConnection } from "mysql2/promise";
import { format } from "mysql2";
import { Test } from "../model/Test";

export class GenericController<T> {
  constructor(private entity: EntityTarget<ObjectLiteral>) {}

  get repository() { return AppDataSource.getRepository(this.entity) }

  async findAllWhere( options: FindManyOptions<ObjectLiteral> | undefined = {}, request?: Request, CONN?: EntityManager ) {
    try {
      if(!CONN){ const result = await this.repository.find(); return { status: 200, data: result } }
      const result = await CONN.find(this.entity); return { status: 200, data: result }
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async findOneByWhere(options: FindOneOptions<ObjectLiteral>, CONN?: EntityManager) {
    try {
      if(!CONN) {
        const result = await this.repository.findOne(options)
        if (!result) { return { status: 404, message: "Data not found" } } return { status: 200, data: result }
      }
      const result = await CONN.findOne(this.entity, options)
      if (!result) { return { status: 404, message: "Data not found" } } return { status: 200, data: result }
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async findOneById(id: number | string, body: ObjectLiteral, CONN?: EntityManager) {
    try {
      if(!CONN) {
        const result = await this.repository.findOneBy({ id: id });
        if (!result) { return { status: 404, message: "Data not found" } } return { status: 200, data: result }
      }
      const result = await CONN.findOneBy(this.entity, { id: id });
      if (!result) { return { status: 404, message: "Data not found" } } return { status: 200, data: result }
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async save( body: DeepPartial<ObjectLiteral>, options: SaveOptions | undefined, CONN?: EntityManager) {
    try {
      if(!CONN) { const result = await this.repository.save(body, options); return { status: 201, data: result } }
      const result = await CONN.save(this.entity, body, options); return { status: 201, data: result }
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async updateId(id: number | string, body: ObjectLiteral, CONN?: EntityManager) {
    try {
      if(!CONN){
        const dataInDataBase = await this.repository.findOneBy({ id: id });
        if (!dataInDataBase) { return { status: 404, message: "Data not found" } }
        for (const key in body) { dataInDataBase[key] = body[key] }
        const result = await this.repository.save(dataInDataBase); return { status: 200, data: result }
      }

      const dataInDataBase = await CONN.findOneBy(this.entity, { id: id });
      if (!dataInDataBase) { return { status: 404, message: "Data not found" } }
      for (const key in body) { dataInDataBase[key] = body[key] }
      const result = await CONN.save(this.entity, dataInDataBase); return { status: 200, data: result }
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  createPerson(body: SavePerson) {
    const el = new Person(); el.name = body.name; el.birth = body.birth; el.category = body.category; return el
  }

  async currentYear(CONN?: EntityManager) {
    if(!CONN) { return (await AppDataSource.getRepository(Year).findOne({ where: { endedAt: IsNull(), active: true } })) as Year }
    return await CONN.findOne(Year, { where: { endedAt: IsNull(), active: true } }) as Year
  }

  async transferStatus(id: number, CONN?: EntityManager) {
    if(!CONN) { return (await AppDataSource.getRepository(TransferStatus).findOne({ where: { id: id } })) as TransferStatus }
    return await CONN.findOne(TransferStatus, { where: { id: id } })
  }

  async teacherByUser(userId: number, CONN?: EntityManager) {
    const options = { relations: ["person.category", "person.user"], where: { person: { user: { id: userId } } } }
    if(!CONN) { return (await AppDataSource.getRepository(Teacher).findOne(options)) as Teacher }
    return await CONN.findOne(Teacher, options) as Teacher
  }

  // TODO: TRANSFORM THIS INTO PURE SQL.
  async tClassrooms(body: { user: number }, CONN?: EntityManager) {

    if(!CONN) {
      const result = (await AppDataSource.createQueryBuilder()
        .select("teacher.id", "teacher")
        .addSelect("GROUP_CONCAT(DISTINCT classroom.id ORDER BY classroom.id ASC)", "classrooms" )
        .from(Teacher, "teacher")
        .leftJoin("teacher.person", "person")
        .leftJoin("person.user", "user")
        .leftJoin("teacher.teacherClassDiscipline", "teacherClassDiscipline")
        .leftJoin("teacherClassDiscipline.classroom", "classroom")
        .where("user.id = :userId AND teacherClassDiscipline.endedAt IS NULL", { userId: body.user })
        .groupBy("teacher.id")
        .getRawOne()) as { teacher: number; classrooms: string };

      return { id: result.teacher, classrooms: result.classrooms?.split(",").map((classroomId: string) => Number(classroomId)) ?? [] }
    }

    const result = (await CONN.createQueryBuilder()
    .select("teacher.id", "teacher")
    .addSelect("GROUP_CONCAT(DISTINCT classroom.id ORDER BY classroom.id ASC)", "classrooms" )
    .from(Teacher, "teacher")
    .leftJoin("teacher.person", "person")
    .leftJoin("person.user", "user")
    .leftJoin("teacher.teacherClassDiscipline", "teacherClassDiscipline")
    .leftJoin("teacherClassDiscipline.classroom", "classroom")
    .where("user.id = :userId AND teacherClassDiscipline.endedAt IS NULL", { userId: body.user })
    .groupBy("teacher.id")
    .getRawOne()) as { teacher: number; classrooms: string };

    return { id: result.teacher, classrooms: result.classrooms?.split(",").map((classroomId: string) => Number(classroomId)) ?? [] }
  }

  async tDisciplines(body: { user: number }, CONN?: EntityManager) {
    if(!CONN) {
      const result = (await AppDataSource.createQueryBuilder()
      .select("teacher.id", "teacher")
      .addSelect("GROUP_CONCAT(DISTINCT discipline.id ORDER BY discipline.id ASC)", "disciplines" )
      .from(Teacher, "teacher")
      .leftJoin("teacher.person", "person")
      .leftJoin("person.user", "user")
      .leftJoin("teacher.teacherClassDiscipline", "teacherClassDiscipline")
      .leftJoin("teacherClassDiscipline.discipline", "discipline")
      .where("user.id = :userId AND teacherClassDiscipline.endedAt IS NULL", { userId: body.user })
      .groupBy("teacher.id")
      .getRawOne()) as { teacher: number; disciplines: string };

      return { id: result.teacher, disciplines: result.disciplines?.split(",").map((disciplineId: string) => Number(disciplineId)) ?? [] };
    }

    const result = (await CONN.createQueryBuilder()
    .select("teacher.id", "teacher")
    .addSelect("GROUP_CONCAT(DISTINCT discipline.id ORDER BY discipline.id ASC)", "disciplines" )
    .from(Teacher, "teacher")
    .leftJoin("teacher.person", "person")
    .leftJoin("person.user", "user")
    .leftJoin("teacher.teacherClassDiscipline", "teacherClassDiscipline")
    .leftJoin("teacherClassDiscipline.discipline", "discipline")
    .where("user.id = :userId AND teacherClassDiscipline.endedAt IS NULL", { userId: body.user })
    .groupBy("teacher.id")
    .getRawOne()) as { teacher: number; disciplines: string };

    return { id: result.teacher, disciplines: result.disciplines?.split(",").map((disciplineId: string) => Number(disciplineId)) ?? [] }
  }

  // ------------------ PURE SQL QUERIES ------------------------------------------------------------------------------------

  async qTeacherClassrooms(conn: PoolConnection, userId: number) {
    const query =

      `
        SELECT t.id AS teacher, GROUP_CONCAT(DISTINCT c.id ORDER BY c.id ASC) AS classrooms
        FROM teacher AS t
          INNER JOIN person AS p ON t.personId = p.id
          INNER JOIN user AS u ON p.id = u.personId
          INNER JOIN teacher_class_discipline AS tcd ON t.id = tcd.teacherId
          INNER JOIN classroom AS c ON tcd.classroomId = c.id
        WHERE u.id = ? AND tcd.endedAt IS NULL
        GROUP BY t.id
      `

    const [ queryResult ] = await conn.query(format(query), [userId])
    return (queryResult as QueryTeacherClassrooms[])[0]
  }

  async qState(conn: PoolConnection, stateId: number) {
    const query =

      `
        SELECT *
        FROM state
        WHERE state.id = ?
      `

    const [ queryResult ] = await conn.query(format(query), [stateId])
    return (queryResult as QueryState[])[0]
  }

  async qUser(conn: PoolConnection, userId: number) {
    const query =

      `
        SELECT pc.id as categoryId, u.id as userId
        FROM teacher
          INNER JOIN person AS p ON teacher.personId = p.id
          INNER JOIN person_category AS pc ON p.categoryId = pc.id
          INNER JOIN user AS u ON p.id = u.personId
        WHERE u.id = ?
      `

    const [ queryResult ] = await conn.query(format(query), [userId])
    return (queryResult as QueryUser[])[0]
  }

  async qTestClassroom(conn: PoolConnection, testId: number, classroomId: number) {
    const query =

      `
        SELECT *
        FROM test_classroom AS tc
        WHERE tc.testId = ? AND tc.classroomId = ?
      `

    const [ queryResult ] = await conn.query(format(query), [testId, classroomId])
    return (queryResult as QueryTestClassroom[])[0]
  }

  async qTestByIdAndYear(conn: PoolConnection, testId: number, yearName: string) {
    const query =

      `
        SELECT t.id, t.name, t.active, t.createdAt,
               pr.id AS period_id, 
               bm.id AS bimester_id, bm.name AS bimester_name, bm.testName AS bimester_testName, 
               yr.id AS year_id, yr.name AS year_name, yr.active AS year_active,
               dc.id AS discipline_id, dc.name AS discipline_name,
               tc.id AS test_category_id, tc.name AS test_category_name,
               pe.id AS person_id, pe.name AS person_name
        FROM test AS t
          INNER JOIN person AS pe ON t.personId = pe.id
          INNER JOIN period AS pr ON t.personId = pr.id
          INNER JOIN bimester AS bm ON pr.bimesterId = bm.id
          INNER JOIN year AS yr ON pr.yearId = yr.id
          INNER JOIN discipline AS dc ON t.disciplineId = dc.id
          INNER JOIN test_category AS tc ON t.categoryId = tc.id
        WHERE t.id = ? AND yr.name = ?
      `

    const [ queryResult ] = await conn.query(format(query), [testId, yearName])
    return (queryResult as QueryTest[])[0]
  }

  async qYearByName(conn: PoolConnection, yearName: string) {
    const query =

      `
        SELECT y.id, y.name
        FROM year AS y
        WHERE y.name = ?
      `

    const [ queryResult ] = await conn.query(format(query), [yearName])
    return (queryResult as QueryYear[])[0]
  }

  async qClassroom(conn: PoolConnection, classroomId: number) {
    const query =

      `
        SELECT c.id, c.name, c.shortName, s.id AS school_id, s.name AS school_name, s.shortName AS school_shortName
        FROM classroom AS c
          INNER JOIN school AS s ON c.schoolId = s.id
        WHERE c.id = ?
      `

    const [ queryResult ] = await conn.query(format(query), [classroomId])

    const res = (queryResult as QueryClassroom[])[0]

    return {
      id: res.id,
      name: res.name,
      shortName: res.shortName,
      school: { id: res.school_id, name: res.school_name, shortName: res.school_shortName }
    } as Classroom
  }

  async qSchools(conn: PoolConnection, testId: number) {
    const query =

      `
        SELECT s.id, s.shortName, s.name 
        FROM school AS s
        WHERE EXISTS
          (
            SELECT 1 
            FROM classroom AS c
              INNER JOIN test_classroom AS tc ON c.id = tc.classroomId
            WHERE tc.testId = ? AND s.id = c.schoolId
          )
        ORDER BY s.shortName
      `

    const [ queryResult ] = await conn.query(format(query), [testId])
    return queryResult as QuerySchools[]
  }

  async qClassroomsByTestId(conn: PoolConnection, schoolId: number, testId: number) {
    const query =

      `
        SELECT c.id, c.shortName 
        FROM classroom AS c
          INNER JOIN test_classroom AS tc ON c.id = tc.classroomId
        WHERE schoolId = ? AND tc.testId = ?
      `

    const [ queryResult ] = await conn.query(format(query), [schoolId, testId])
    return queryResult as QueryClassrooms[]
  }

  async qStudentClassrooms(conn: PoolConnection, classroomId: number, yearId: number) {
    const query =

      `
        SELECT sc.id, sc.studentId, sc.classroomId, p.name, sc.yearId, sc.endedAt
        FROM student_classroom AS sc
          INNER JOIN student AS s ON sc.studentId = s.id
          INNER JOIN person AS p ON s.personId = p.id
        WHERE sc.classroomId = ? AND sc.yearId = ?
      `

    const [ queryResult ] = await conn.query(format(query), [classroomId, yearId])
    return queryResult as QueryStudentClassrooms[]
  }

  async qReadingFluency(conn: PoolConnection, testId: number, studentId: number) {
    const query =

      `
        SELECT rf.id, rf.readingFluencyExamId, rf.readingFluencyLevelId, rf.rClassroomId
        FROM reading_fluency AS rf 
        WHERE rf.testId = ? AND rf.studentId = ?
      `

    const [ queryResult ] = await conn.query(format(query), [testId, studentId])
    return queryResult as any[]
  }

  // ------------------ FORMATTERS ------------------------------------------------------------------------------------

  formatedTest(qTest: QueryTest) {
    return {
      id: qTest.id,
      name: qTest.name,
      category: { id: qTest.test_category_id, name: qTest.test_category_name },
      period: {
        id: qTest.period_id,
        bimester: { id: qTest.bimester_id, name: qTest.bimester_name, testName: qTest.bimester_testName },
        year: { id: qTest.year_id, name: qTest.year_name }
      },
      discipline: { id: qTest.discipline_id, name: qTest.discipline_name },
    } as unknown as Test
  }
}