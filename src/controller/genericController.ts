import { DeepPartial, EntityManager, EntityTarget, FindManyOptions, FindOneOptions, IsNull, ObjectLiteral, SaveOptions } from "typeorm";
import { AppDataSource } from "../data-source";
import { Person } from "../model/Person";
import {QueryClassrooms, QuerySchools, QueryStudentClassrooms, SavePerson, QueryTest, QueryYear} from "../interfaces/interfaces";
import { Year } from "../model/Year";
import { Classroom } from "../model/Classroom";
import { State } from "../model/State";
import { Request } from "express";
import { TransferStatus } from "../model/TransferStatus";
import { Teacher } from "../model/Teacher";
import { PoolConnection } from "mysql2/promise";
import { JoinClause } from "../utils/queries";
import { format } from "mysql2";

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

  async classroom(id: number, CONN?: EntityManager) {
    if(!CONN) { return (await AppDataSource.getRepository(Classroom).findOne({ where: { id: id } })) as Classroom }
    return await CONN.findOne(Classroom, { where: { id: id } }) as Classroom
  }

  async state(id: number, CONN?: EntityManager) {
    if(!CONN) { return (await AppDataSource.getRepository(State).findOne({ where: { id: id } })) as State }
    return await CONN.findOne(State, { where: { id: id } }) as State
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

  // ---------------------------------------------------------

  async query<T>(conn: PoolConnection, mainTable: string, fields: string[], whereArr: { tableCl: string, operator: string, value: any }[], onlyFirstResult: boolean, leftJoins: JoinClause[], groupBy: { column: string }[]): Promise<T | null> {

    const columns: string = whereArr.length > 0 ? 'WHERE ' + whereArr.map(el => `${ el.tableCl } ${ el.operator } ?`).join(' AND ') : '';

    const joins: string = leftJoins.map(el => `LEFT JOIN ${ el.table } ON ${ el.conditions.map(cond => `${ cond.foreignTable } = ${ cond.currTable }`).join(' AND ') }`).join(' ')

    const groups: string = groupBy.length > 0 ? 'GROUP BY ' + groupBy.map(el => `${ el.column }`).join(', ') : ''

    const qString = `SELECT ${ fields.length > 0 ? fields.join(', ') : '*' } FROM ${ mainTable } ${ joins } ${ columns } ${ groups }`

    const [ qResult ] = await conn.query(format(qString, whereArr.map(el => el.value))) as Array<{[key: string]: any}>

    return onlyFirstResult ? qResult[0] ?? null : qResult
  }

  async testClassroomQuery(myConnBd: PoolConnection, testId: number, classroomId: number ) {
    return await this.query<{ testId: number, classroomId: number }>(
      myConnBd,
      'test_classroom',
      [],
      [
        { tableCl: 'test_classroom.testId', operator: '=', value: testId },
        { tableCl: 'test_classroom.classroomId', operator: '=', value: classroomId }
      ],
      true,
      [],
      []
    )
  }

  async userQuery(myConnBd: PoolConnection, userId: number){
    return await this.query<{ userId: number, categoryId: number }>(
      myConnBd,
      'teacher',
      ['person_category.id AS categoryId', 'user.id AS userId'],
      [
        { tableCl: 'user.id', operator: '=', value: userId }
      ],
      true,
      [
        { table: 'person', conditions: [{ foreignTable: 'teacher.personId', currTable: 'person.id' }] },
        { table: 'person_category', conditions: [{ foreignTable: 'person.categoryId', currTable: 'person_category.id' }] },
        { table: 'user', conditions: [{ foreignTable: 'person.id', currTable: 'user.personId' }] }
      ],
      []
    )
  }

  async classroomQuery(myConnBd: PoolConnection, userId: number) {
    return await this.query<{teacher: number, classrooms: string}>(
      myConnBd,
      'teacher',
      ['teacher.id AS teacher', 'GROUP_CONCAT(DISTINCT classroom.id ORDER BY classroom.id ASC) AS classrooms'],
      [
        { tableCl: 'user.id', operator: '=', value: userId },
        { tableCl: 'teacher_class_discipline.endedAt', operator: 'IS', value: null }
      ],
      true,
      [
        { table: 'person', conditions: [{ foreignTable: 'teacher.personId', currTable: 'person.id' }] },
        { table: 'user', conditions: [{ foreignTable: 'person.id', currTable: 'user.personId' }] },
        { table: 'teacher_class_discipline', conditions: [{ foreignTable: 'teacher.id', currTable: 'teacher_class_discipline.teacherId' }] },
        { table: 'classroom', conditions: [{ foreignTable: 'teacher_class_discipline.classroomId', currTable: 'classroom.id' }] }
      ],
      [
        { column: 'teacher.id' }
      ]
    )
  }

  async testQuery(myConnBd: PoolConnection, testId: any, yearName: any) {
    return await this.query<QueryTest>(
      myConnBd,
      'test',
      [
        'test.id',
        'test.name',
        'test.active',
        'test.createdAt',
        'period.id AS period_id',
        'bimester.id AS bimester_id',
        'bimester.name AS bimester_name',
        'bimester.testName AS bimester_testName',
        'year.id AS year_id',
        'year.name AS year_name',
        'year.active AS year_active',
        'discipline.id AS discipline_id',
        'discipline.name AS discipline_name',
        'test_category.id AS test_category_id',
        'test_category.name AS test_category_name',
        'person.id AS person_id',
        'person.name AS person_name'
      ],
      [
        { tableCl: 'test.id', operator: '=', value: testId }, { tableCl: 'year.name', operator: '=', value: yearName }
      ],
      true,
      [
        { table: 'person', conditions: [{ foreignTable: 'test.personId', currTable: 'person.Id' }] },
        { table: 'period', conditions: [{ foreignTable: 'test.periodId', currTable: 'period.Id' }] },
        { table: 'bimester', conditions: [{ foreignTable: 'period.bimesterId', currTable: 'bimester.Id' }] },
        { table: 'year', conditions: [{ foreignTable: 'period.yearId', currTable: 'year.Id' }] },
        { table: 'discipline', conditions: [{ foreignTable: 'test.disciplineId', currTable: 'discipline.Id' }] },
        { table: 'test_category', conditions: [{ foreignTable: 'test.categoryId', currTable: 'test_category.Id' }] }
      ],
      []
    )
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
}