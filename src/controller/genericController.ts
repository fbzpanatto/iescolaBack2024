import {DeepPartial, EntityManager, EntityTarget, FindManyOptions, FindOneOptions, ObjectLiteral, SaveOptions} from "typeorm";
import {AppDataSource} from "../data-source";
import {Person} from "../model/Person";
import {
  qAlphabeticLevels,
  qAlphaStuClassrooms,
  qAlphaStuClassroomsFormated,
  qAlphaStudentsFormated,
  qAlphaTests,
  qClassroom,
  qClassrooms,
  qFormatedYear,
  qReadingFluenciesHeaders,
  qSchools,
  qState,
  qStudentClassroomFormated,
  qStudentsClassroomsForTest,
  qStudentTests,
  qTeacherClassrooms,
  qTeacherDisciplines,
  qTeacherRelationShip,
  qTest,
  qTestClassroom,
  qTestQuestions,
  qTransferStatus,
  qUser,
  qUserTeacher,
  qYear,
  SavePerson
} from "../interfaces/interfaces";
import {Classroom} from "../model/Classroom";
import {Request} from "express";
import {PoolConnection} from "mysql2/promise";
import {format} from "mysql2";
import {Test} from "../model/Test";
import {Transfer} from "../model/Transfer";

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

  // ------------------ PURE SQL QUERIES ------------------------------------------------------------------------------------

  async qAlphabeticHeaders(conn: PoolConnection, yearName: string) {
    const qYear =

      `
        SELECT year.id, year.name, period.id AS period_id, bimester.id AS bimester_id, bimester.name AS bimester_name, bimester.testName AS bimester_testName
        FROM year
            INNER JOIN period ON period.yearId = year.id
            INNER JOIN bimester ON period.bimesterId = bimester.id
        WHERE year.name = ?
      `

    const [qYearResult] = await conn.query(format(qYear), [yearName]);
    let year = this.formatAlphabeticYearHeader(qYearResult as qYear[])

    const qAlphabeticLevels =

      `
        SELECT al.id, al.shortName, al.color
        FROM alphabetic_level AS al
      `

    const [qAlphaLevelsResult] = await conn.query(format(qAlphabeticLevels), []);
    const alphabeticLevels = qAlphaLevelsResult as qAlphabeticLevels[]

    return year.periods.flatMap(period => {
      return {
        ...period.bimester,
        levels: alphabeticLevels,
      }
    })
  }

  async qLastRegister(conn: PoolConnection, studentId: number, yearId: number ) {
    const query =

      `
        SELECT stu.id AS studentId, per.name AS personName, sc.id AS studentClassroomId, sc.rosterNumber, sc.startedAt, sc.endedAt, sc.classroomId, sc.yearId, sc.studentId AS studentIdSc
        FROM student AS stu
        INNER JOIN person AS per ON stu.personId = per.id
        INNER JOIN student_classroom AS sc ON stu.id = sc.studentId
        INNER JOIN classroom AS clas ON sc.classroomId = clas.id
        INNER JOIN school AS sch ON clas.schoolId = sch.id
        INNER JOIN year AS y ON sc.yearId = y.id
        WHERE 
          sc.endedAt IS NOT NULL AND
          stu.id = ? AND
          y.id = ? AND
          sc.endedAt = (SELECT MAX(sc2.endedAt) FROM student_classroom AS sc2 WHERE sc2.studentId = stu.id AND sc2.yearId = ?)
      `

    const [ queryResult ] = await conn.query(format(query), [studentId, yearId, yearId])

    return (queryResult as { [key: string]: any }[])
  }

  async qStudentDisabilities(conn: PoolConnection, arr: qAlphaStudentsFormated[]) {
    for(let item of arr) {

      const query =
        `
          SELECT sd.id, sd.startedAt, sd.endedAt
          FROM student_disability AS sd 
          WHERE sd.studentId = ?
        `

      const [ queryResult ] = await conn.query(format(query), [item.student.id])

      item.student.studentDisabilities = queryResult as { id: number, startedAt: string, endedAt: string | null }[]
    }
    return arr
  }

  async qAlphabeticStudentsForLink(conn: PoolConnection, classroomId: number, testCreatedAt: Date | string, yearName: string){
    const query =

      `
        SELECT DISTINCT sc.id, sc.rosterNumber, sc.startedAt, sc.endedAt, sc.classroomId,
               s.id AS student_id,
               p.id AS person_id, p.name AS person_name
        FROM student_classroom AS sc
          INNER JOIN year AS y ON sc.yearId = y.id
          INNER JOIN student AS s ON sc.studentId = s.id
          INNER JOIN person AS p ON s.personId = p.id
          LEFT JOIN alphabetic AS a ON a.studentId = s.id
          LEFT JOIN test AS t ON a.testId = t.id
        WHERE sc.classroomId = ?
          AND (sc.startedAt < ? OR a.id IS NOT NULL)
          AND y.name = ?
      `

    const [ queryResult ] = await conn.query(format(query), [classroomId, testCreatedAt, yearName])

    return this.formatStudentClassroom(queryResult as qAlphaStuClassrooms[])
  }

  async qCurrentYear(conn: PoolConnection) {
    const query =

      `
        SELECT *
        FROM year
        WHERE year.endedAt IS NULL AND year.active = 1
      `

    const [ queryResult ] = await conn.query(format(query))
    return (queryResult as qYear[])[0]
  }

  async qActiveSc(conn: PoolConnection, studentId: number) {
    const query =

      `
        SELECT p.name AS personName, c.shortName AS classroomName, s.shortName AS schoolName, y.name AS yearName
        FROM student_classroom AS sc
        INNER JOIN classroom AS c ON sc.classroomId = c.id
        INNER JOIN school AS s ON c.schoolId = s.id
        INNER JOIN year AS y ON sc.yearId = y.id
        INNER JOIN student AS stu ON sc.studentId = stu.id
        INNER JOIN person AS p ON stu.personId = p.id
        WHERE stu.id = ? AND sc.endedAt IS NULL
      `

    const [ queryResult ] = await conn.query(format(query), [studentId])
    return (queryResult as { personName: string, classroomName: string, schoolName: string, yearName: string }[])[0]
  }

  async qNewStudentClassroom(conn: PoolConnection, studentId: number, classroomId: number, yearId: number, createdByUser: number) {
    const insertQuery = `
        INSERT INTO student_classroom (studentId, classroomId, yearId, rosterNumber, startedAt, createdByUser) 
        VALUES (?, ?, ?, ?, ?, ?)
    `
    const [ queryResult ] = await conn.query(format(insertQuery), [studentId, classroomId, yearId, 99, new Date(), createdByUser])
    return queryResult as { fieldCount: number, affectedRows: number, insertId: number, info: string, serverStatus: number, warningStatus: number, changedRows: number }
  }

  async qNewTransfer(conn: PoolConnection, requesterId: number, requestedClassroomId: number, currentClassroomId: number, receiverId: number, studentId: number, yearId: number, createdByUser: number) {
    const insertQuery = `
        INSERT INTO transfer (startedAt, endedAt, requesterId, requestedClassroomId, currentClassroomId, receiverId, studentId, statusId, yearId, createdByUser) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    const [ queryResult ] = await conn.query(format(insertQuery), [new Date(), new Date(), requesterId, requestedClassroomId, currentClassroomId, receiverId, studentId, 1, yearId, createdByUser])
    return queryResult as { fieldCount: number, affectedRows: number, insertId: number, info: string, serverStatus: number, warningStatus: number, changedRows: number }
  }

  async qTeacherDisciplines(conn: PoolConnection, userId: number) {
    const query =

      `
        SELECT t.id, GROUP_CONCAT(DISTINCT d.id ORDER BY d.id ASC) AS disciplines
        FROM teacher AS t
          INNER JOIN person AS p ON t.personId = p.id
          INNER JOIN user AS u ON p.id = u.personId
          INNER JOIN teacher_class_discipline AS tcd ON t.id = tcd.teacherId
          INNER JOIN discipline AS d ON tcd.disciplineId = d.id
        WHERE u.id = ? AND tcd.endedAt IS NULL
        GROUP BY t.id
      `

    const [ queryResult ] = await conn.query(format(query), [userId])

    const qTeacherDisciplines = (queryResult as qTeacherDisciplines[])[0]

    return { id: qTeacherDisciplines?.id, disciplines: qTeacherDisciplines?.disciplines?.split(',').map(el => Number(el)) ?? [] }
  }

  async qTeacherClassrooms(conn: PoolConnection, userId: number) {
    const query =

      `
        SELECT t.id, GROUP_CONCAT(DISTINCT c.id ORDER BY c.id ASC) AS classrooms
        FROM teacher AS t
          INNER JOIN person AS p ON t.personId = p.id
          INNER JOIN user AS u ON p.id = u.personId
          INNER JOIN teacher_class_discipline AS tcd ON t.id = tcd.teacherId
          INNER JOIN classroom AS c ON tcd.classroomId = c.id
        WHERE u.id = ? AND tcd.endedAt IS NULL
        GROUP BY t.id
      `

    const [ queryResult ] = await conn.query(format(query), [userId])

    const qTeacherClassrooms = (queryResult as qTeacherClassrooms[])[0]

    return { id: qTeacherClassrooms?.id, classrooms: qTeacherClassrooms?.classrooms?.split(',').map(el => Number(el)) ?? [] }
  }

  async qTransferStatus(conn: PoolConnection, statusId: number) {
    const query =

      `
          SELECT *
          FROM transfer_status AS ts
          WHERE ts.id = ?
      `

    const [ queryResult ] = await conn.query(format(query), [statusId])
    return (queryResult as qTransferStatus[])[0]
  }

  async qChangeMasterTeacherSchool(conn: PoolConnection, teacherId: number) {

    const updateQuery =
      `
        UPDATE teacher_class_discipline SET endedAt = ? where teacherId = ?;
      `

    const [ queryResult ] = await conn.query(format(updateQuery), [new Date(), teacherId])
    return queryResult
  }

  async qTeacherByUser(conn: PoolConnection, userId: number) {
    const query =

      `
        SELECT teacher.id, teacher.email, teacher.register,
               p.id AS person_id, p.name AS person_name,
               pc.id AS person_category_id, pc.name AS person_category_name,
               u.id AS user_id, u.username AS user_name, u.email AS user_email
        FROM teacher
          INNER JOIN person AS p ON teacher.personId = p.id
          INNER JOIN person_category AS pc ON p.categoryId = pc.id
          INNER JOIN user AS u ON p.id = u.personId
        WHERE u.id = ?
      `

    const [ queryResult ] = await conn.query(format(query), [userId])
    const data = (queryResult as any[])[0]

    return this.formatUserTeacher(data)
  }

  async qState(conn: PoolConnection, stateId: number) {
    const query =

      `
        SELECT *
        FROM state
        WHERE state.id = ?
      `

    const [ queryResult ] = await conn.query(format(query), [stateId])
    return (queryResult as qState[])[0]
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
    return (queryResult as qUser[])[0]
  }

  async qTestClassroom(conn: PoolConnection, testId: number, classroomId: number) {
    const query =

      `
        SELECT *
        FROM test_classroom AS tc
        WHERE tc.testId = ? AND tc.classroomId = ?
      `

    const [ queryResult ] = await conn.query(format(query), [testId, classroomId])
    return (queryResult as qTestClassroom[])[0]
  }

  // TODO: create a function that checks if there is only one element into array. Return error if there is more than one?
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
          INNER JOIN period AS pr ON t.periodId = pr.id
          INNER JOIN bimester AS bm ON pr.bimesterId = bm.id
          INNER JOIN year AS yr ON pr.yearId = yr.id
          INNER JOIN discipline AS dc ON t.disciplineId = dc.id
          INNER JOIN test_category AS tc ON t.categoryId = tc.id
        WHERE t.id = ? AND yr.name = ?
      `

    const [ queryResult ] = await conn.query(format(query), [testId, yearName])
    return (queryResult as qTest[])[0]
  }

  async qYearByName(conn: PoolConnection, yearName: string) {
    const query =

      `
        SELECT y.id, y.name
        FROM year AS y
        WHERE y.name = ?
      `

    const [ queryResult ] = await conn.query(format(query), [yearName])
    return (queryResult as qYear[])[0]
  }

  async qYearById(conn: PoolConnection, yearId: number | string) {
    const query =

      `
        SELECT y.id, y.name
        FROM year AS y
        WHERE y.id = ?
      `

    const [ queryResult ] = await conn.query(format(query), [yearId])
    return (queryResult as qYear[])[0]
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

    const res = (queryResult as qClassroom[])[0]

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
    return queryResult as qSchools[]
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
    return queryResult as qClassrooms[]
  }

  async qStudentClassroomsForTest(conn: PoolConnection, test: Test, classroomId: number, yearName: string, studentClassroomId: number | null) {

    let responseQuery;

    if(studentClassroomId) {
      const query =
        `
        SELECT sc.id AS student_classroom_id, sc.startedAt,
               s.id AS student_id,
               sts.id AS student_classroom_test_status_id,
               person.name
        FROM student_classroom AS sc
         INNER JOIN year AS y ON sc.yearId = y.id
         INNER JOIN student AS s ON sc.studentId = s.id
         INNER JOIN person ON s.personId = person.id
         LEFT JOIN student_test_status AS sts ON sc.id = sts.studentClassroomId AND sts.testId = ?
        WHERE sc.classroomId = ? AND y.name = ? AND (sc.startedAt < ? OR sts.id IS NOT NULL) AND sc.id = ?
        ORDER BY sc.rosterNumber
      `;

      const [queryResult] = await conn.query(format(query), [test.id, classroomId, yearName, test.createdAt, studentClassroomId]);
      responseQuery = queryResult as qStudentsClassroomsForTest[];
      return responseQuery
    }

    const query =
      `
        SELECT sc.id AS student_classroom_id, sc.startedAt,
               s.id AS student_id,
               sts.id AS student_classroom_test_status_id,
               person.name
        FROM student_classroom AS sc
         INNER JOIN year AS y ON sc.yearId = y.id
         INNER JOIN student AS s ON sc.studentId = s.id
         INNER JOIN person ON s.personId = person.id
         LEFT JOIN student_test_status AS sts ON sc.id = sts.studentClassroomId AND sts.testId = ?
        WHERE sc.classroomId = ? AND y.name = ? AND (sc.startedAt < ? OR sts.id IS NOT NULL)
        ORDER BY sc.rosterNumber
      `;

    const [queryResult] = await conn.query(format(query), [test.id, classroomId, yearName, test.createdAt]);
    responseQuery = queryResult as qStudentsClassroomsForTest[];
    return responseQuery
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

  async qReadingFluencyHeaders(conn: PoolConnection) {

    const query =

      `
        SELECT 
            rfg.id AS id,
            rfl.id AS readingFluencyLevelId, rfl.name AS readingFluencyLevelName, rfl.color AS readingFluencyLevelColor,
            rfe.id AS readingFluencyExamId, rfe.name AS readingFluencyExamName, rfe.color AS readingFluencyExamColor
        FROM reading_fluency_group AS rfg
          INNER JOIN reading_fluency_level AS rfl ON rfg.readingFluencyLevelId = rfl.id
          INNER JOIN reading_fluency_exam as rfe ON rfg.readingFluencyExamId = rfe.id
      `

    const [ queryResult ] = await conn.query(format(query), [])

    return queryResult as Array<qReadingFluenciesHeaders>
  }

  async qAlphabeticTests(conn: PoolConnection, categoryId: number, disciplineId: number, yearName: string) {
    const query =

      `
        SELECT 
            t.id AS test_id, t.active AS test_active,
            d.id AS discipline_id, d.name AS discipline_name,
            tc.id AS test_category_id,
            pr.id AS period_id,
            b.id AS bimester_id, b.name AS bimester_name, b.testName AS bimester_testName,
            y.id AS year_id, y.name AS year_name           
            
        FROM test AS t
            INNER JOIN discipline AS d ON t.disciplineId = d.id
            INNER JOIN period AS pr ON t.periodId = pr.id
            INNER JOIN bimester AS b ON pr.bimesterId = b.id
            INNER JOIN year AS y ON pr.yearId = y.id
            INNER JOIN test_category AS tc ON t.categoryId = tc.id
        WHERE tc.id = ? AND d.id = ? AND y.name = ?
      `

    const [ queryResult ] = await conn.query(format(query), [categoryId, disciplineId, yearName])

    return this.formatAlphabeticTests(queryResult as qAlphaTests[])
  }

  async qTestQuestions(conn: PoolConnection, testId: number | string) {

    const query =
      `
        SELECT 
            tq.id AS test_question_id, tq.order AS test_question_order, tq.answer AS test_question_answer, tq.active AS test_question_active,
            qt.id AS question_id,
            qg.id AS question_group_id, qg.name AS question_group_name
                
        FROM test_question AS tq
        INNER JOIN question AS qt ON tq.questionId = qt.id
        INNER JOIN question_group AS qg ON tq.questionGroupId = qg.id
        INNER JOIN test AS tt ON tq.testId = tt.id
        WHERE tt.id = ?
        ORDER BY qg.id, tq.order
      `

    const [ queryResult ] = await conn.query(format(query), [testId])
    return this.formatTestQuestions(queryResult as qTestQuestions[])
  }

  async qCreateLinkAlphabetic(studentClassrooms: qAlphaStuClassroomsFormated[], test: Test, userId: number, conn: PoolConnection) {

    // async createLinkAlphabetic(studentClassrooms: qAlphaStuClassroomsFormated[], test: Test, userId: number, CONN: EntityManager) {
    //   for(let studentClassroom of studentClassrooms) {
    //     const sAlphabetic = await CONN.findOne(Alphabetic, { where: { test: { id: test.id }, student: { id: studentClassroom.student?.id } } } )
    //     if(!sAlphabetic) { await CONN.save(Alphabetic, { createdAt: new Date(), createdByUser: userId, student: { id: studentClassroom.student.id }, test } ) }
    //   }
    // }

    for(let element of studentClassrooms) {

      const query = `
        SELECT *
        FROM alphabetic AS alpha
        INNER JOIN test AS tt ON alpha.testId = tt.id
        INNER JOIN student AS stu ON alpha.studentId = stu.id
        WHERE tt.id = ? AND stu.id = ?
      `
      const [ queryResult ] = await conn.query(format(query), [test.id, element.student.id])

      const response = (queryResult as { [key: string]: any }[])[0]

      if(!response) {
        const insertQuery = `INSERT INTO alphabetic (createdAt, createdByUser, studentId, testId ) VALUES (?, ?, ?, ?)`
        const [ queryResult ] = await conn.query(format(insertQuery), [new Date(), userId, element.student.id, test.id])
      }
    }
  }

  async qStudentClassrooms(conn: PoolConnection, classroomId: number, yearId: number) {
    const query =

      `
        SELECT sc.id, sc.rosterNumber, sc.classroomId, sc.startedAt, sc.endedAt, s.id AS student_id, p.id AS person_id, p.name AS person_name
        FROM student_classroom AS sc
          INNER JOIN student AS s ON sc.studentId = s.id
          INNER JOIN person AS p ON s.personId = p.id
        WHERE sc.classroomId = ? AND sc.yearId = ?
      `

    const [ queryResult ] = await conn.query(format(query), [classroomId, yearId])
    return  this.formatStudentClassroom(queryResult as Array<qStudentClassroomFormated>)
  }

  async qTeacherRelationship(conn: PoolConnection, teacherId: number | string) {
    const qTeacher =

      `
        SELECT 
          person.id AS person_id, person.name AS person_name, person.birth AS person_birth,
          person_category.id AS category_id, person_category.name AS category_name,
          teacher.id AS teacher_id, teacher.register AS teacher_register, teacher.email AS teacher_email, teacher.schoolId AS school_id, teacher.observation
        FROM person
          INNER JOIN teacher ON person.id = teacher.personId
          INNER JOIN person_category ON person.categoryId = person_category.id
        WHERE teacher.id = ?
      `

    const [ teacherQueryResult ] = await conn.query(format(qTeacher), [teacherId])

    const qRelationships =
      `
        SELECT 
          tcd.id, tcd.teacherId, tcd.classroomId, tcd.disciplineId, 
          classroom.shortName AS classroomName, 
          school.shortName AS schoolName, 
          discipline.name AS disciplineName
        FROM teacher_class_discipline as tcd
          INNER JOIN classroom ON tcd.classroomId = classroom.id
          INNER JOIN school ON classroom.schoolId = school.id
          INNER JOIN discipline ON tcd.disciplineId = discipline.id
        WHERE tcd.teacherId = ? AND tcd.endedAt IS NULL
        ORDER BY classroom.shortName, school.shortName, discipline.name
      `

    const [ teacherClassesDisciplines ] = (await conn.query(format(qRelationships), [teacherId]))

    let relationships = teacherClassesDisciplines as Array<qTeacherRelationShip>

    let teacher = (teacherQueryResult as Array<any>)[0]

    return {
      id: teacher.teacher_id,
      email: teacher.teacher_email,
      register: teacher.teacher_register,
      school: teacher.school_id,
      observation: teacher.observation,
      person: {
        id: teacher.person_id,
        name: teacher.person_name,
        birth: teacher.person_birth,
        category: {
          id: teacher.category_id,
          name: teacher.category_name
        }
      },
      teacherClassesDisciplines: relationships.map(el => ({ ...el, active: true }))
    }
  }

  async qAlphaStudents(conn: PoolConnection, test: Test, classroomId: number, year: number, studentClassroomId: number | null) {

    if(studentClassroomId) {

      let query = `
        SELECT
          student_classroom.id, student_classroom.rosterNumber, student_classroom.startedAt, student_classroom.endedAt,
          student.id AS studentId, student.active,
          person.id AS personId, person.name AS name,
          alphabetic.id AS alphabeticId, alphabetic.alphabeticLevelId, alphabetic.rClassroomId, alphaLevel.color AS alphabeticLevelColor, alphabetic.observation,
          test.id AS testId, test.name AS testName,
          period.id AS periodId,
          bim.id AS bimesterId,
          year.id AS yearId
        FROM student_classroom
          INNER JOIN student ON student_classroom.studentId = student.id
          INNER JOIN person ON student.personId = person.id
          LEFT JOIN alphabetic ON student.id = alphabetic.studentId
          LEFT JOIN classroom AS rClassroom ON alphabetic.rClassroomId = rClassroom.id
          LEFT JOIN alphabetic_level AS alphaLevel ON alphabetic.alphabeticLevelId = alphaLevel.id
          INNER JOIN test ON alphabetic.testId = test.id
          INNER JOIN discipline ON test.disciplineId = discipline.id
          INNER JOIN test_category ON test.categoryId = test_category.id
          INNER JOIN period ON test.periodId = period.id
          INNER JOIN bimester AS bim ON period.bimesterId = bim.id
          INNER JOIN year ON period.yearId = year.id
          INNER JOIN classroom ON student_classroom.classroomId = classroom.id
          WHERE 
              student_classroom.id = ? AND
              (student_classroom.yearId = ? AND student_classroom.yearId = period.yearId AND classroom.id = ?) AND
              discipline.id = ? AND test_category.id
      `

      const [ queryResult ] = await conn.query(format(query), [studentClassroomId, year, classroomId, test.discipline.id, test.category.id])

      return this.formatAlphaStuWQuestions(queryResult as {[key:string]:any}[])
    }

    let query =

      `
        SELECT
          student_classroom.id, student_classroom.rosterNumber, student_classroom.startedAt, student_classroom.endedAt,
          student.id AS studentId, student.active,
          person.id AS personId, person.name AS name,
          alphabetic.id AS alphabeticId, alphabetic.alphabeticLevelId, alphabetic.rClassroomId, alphaLevel.color AS alphabeticLevelColor, alphabetic.observation,
          test.id AS testId, test.name AS testName,
          period.id AS periodId,
          bim.id AS bimesterId,
          year.id AS yearId
        FROM student_classroom
          INNER JOIN student ON student_classroom.studentId = student.id
          INNER JOIN person ON student.personId = person.id
          LEFT JOIN alphabetic ON student.id = alphabetic.studentId
          LEFT JOIN classroom AS rClassroom ON alphabetic.rClassroomId = rClassroom.id
          LEFT JOIN alphabetic_level AS alphaLevel ON alphabetic.alphabeticLevelId = alphaLevel.id
          INNER JOIN test ON alphabetic.testId = test.id
          INNER JOIN discipline ON test.disciplineId = discipline.id
          INNER JOIN test_category ON test.categoryId = test_category.id
          INNER JOIN period ON test.periodId = period.id
          INNER JOIN bimester AS bim ON period.bimesterId = bim.id
          INNER JOIN year ON period.yearId = year.id
          INNER JOIN classroom ON student_classroom.classroomId = classroom.id
        WHERE

            (student_classroom.yearId = ? AND student_classroom.yearId = period.yearId AND classroom.id = ?) AND
            discipline.id = ? AND test_category.id
        ORDER BY student_classroom.rosterNumber
      `

      // (student_classroom.startedAt < ? OR alphabetic.id IS NOT NULL) AND
    // test.createdAt

    const [ queryResult ] = await conn.query(format(query), [year, classroomId, test.discipline.id, test.category.id])

    return this.formatAlphaStuWQuestions(queryResult as {[key:string]:any}[])
  }

  async qPendingTransferStatus(conn: PoolConnection, year: number, status: number) {
    const query =

      `
        SELECT *
        FROM transfer
        WHERE transfer.yearId = ? AND transfer.statusId = ?
      `

    const [ queryResult ] = await conn.query(format(query), [year, status])
    return  queryResult as Array<Transfer>
  }

  async qCurrentTeacherStudents(conn: PoolConnection, classrooms: number[], student: string | number, masterTeacher: boolean, limit: number, offset: number) {

    const studentSearch = `%${student.toString().toUpperCase()}%`

    let responseData

    if(masterTeacher) {

      let query = `
        SELECT sc.id AS studentClassroomId, stu.id AS studentId, per.name
        FROM student_classroom AS sc
        INNER JOIN student AS stu ON sc.studentId = stu.id
        INNER JOIN person AS per ON stu.personId = per.id
        WHERE per.name LIKE ? OR stu.ra LIKE ?
        LIMIT ?
        OFFSET ?
        `

      const [ queryResult ] = await conn.query(format(query), [studentSearch, studentSearch, limit, offset])
      responseData = queryResult

      return responseData as { studentClassroomId: number, studentId: number, name: string }[]
    }

    let query = `
        SELECT sc.id, stu.id AS studentId, per.name
        FROM student_classroom AS sc
        INNER JOIN student AS stu ON sc.studentId = stu.id
        INNER JOIN person AS per ON stu.personId = per.id
        WHERE (per.name LIKE ? OR stu.ra LIKE ?) AND sc.classroomId IN (?) AND sc.endedAt IS NULL
        `

    const [ queryResult ] = await conn.query(format(query), [studentSearch, studentSearch, classrooms])
    responseData = queryResult

    return responseData as { id: number, studentId: number, name: string }[]
  }

  async qStudentTestsByYear(conn: PoolConnection, studentIds: number[], year: string, limit: number, offset: number) {

    const query = `
      SELECT sc.id AS studentClassroomId, stu.id AS studentId, per.name AS studentName, cls.id AS classroomId, cls.shortName AS classroomName, sch.shortName AS schoolName, tt.id AS testId, tt.name AS testName, br.name AS bimesterName, br.testName AS bimesterTestName, yr.name AS yearName, ttc.id AS testCategoryId, stu.ra, stu.dv
      FROM student_test_status AS sts
      INNER JOIN student_classroom AS sc ON sts.studentClassroomId = sc.id
      INNER JOIN classroom AS cls ON sc.classroomId = cls.id
      INNER JOIN school AS sch ON cls.schoolId = sch.id
      INNER JOIN student AS stu ON sc.studentId = stu.id
      INNER JOIN person AS per ON stu.personId = per.id
      INNER JOIN test AS tt ON sts.testId = tt.id
      INNER JOIN test_category AS ttc ON tt.categoryId = ttc.id
      INNER JOIN period AS pr ON tt.periodId = pr.id
      INNER JOIN year AS yr ON pr.yearId = yr.id
      INNER JOIN bimester AS br ON pr.bimesterId = br.id
      WHERE stu.id IN (?) AND yr.name = ?
      LIMIT ?
      OFFSET ?
    `

    const [ queryResult ] = await conn.query(format(query), [studentIds, year, limit, offset])
    return queryResult as qStudentTests[]
  }

  async qStudentAlphabeticByYear(conn: PoolConnection, studentIds: number[], year: string, limit: number, offset: number) {

    const query = `
      SELECT sc.id AS studentClassroomId, stu.id AS studentId, per.name AS studentName, cls.id AS classroomId, cls.shortName AS classroomName, sch.shortName AS schoolName, tt.id AS testId, tt.name AS testName, br.name AS bimesterName, br.testName AS bimesterTestName, yr.name AS yearName, ttc.id AS testCategoryId, stu.ra, stu.dv
      FROM alphabetic AS alpha
      INNER JOIN student AS stu ON alpha.studentId = stu.id
      INNER JOIN student_classroom AS sc ON stu.id = sc.studentId
      INNER JOIN classroom AS cls ON sc.classroomId = cls.id
      INNER JOIN school AS sch ON cls.schoolId = sch.id
      INNER JOIN person AS per ON stu.personId = per.id
      INNER JOIN test AS tt ON alpha.testId = tt.id
      INNER JOIN test_category AS ttc ON tt.categoryId = ttc.id
      INNER JOIN period AS pr ON tt.periodId = pr.id
      INNER JOIN year AS yr ON pr.yearId = yr.id
      INNER JOIN bimester AS br ON pr.bimesterId = br.id
      WHERE stu.id IN (?) AND yr.name = ? AND sc.endedAt IS NOT NULL
      LIMIT ?
      OFFSET ?
    `

    const [ queryResult ] = await conn.query(format(query), [studentIds, year, limit, offset])
    return queryResult as qStudentTests[]
  }

  // ------------------ FORMATTERS ------------------------------------------------------------------------------------

  formatStudentClassroom(arr: any[]) {
    return arr.map(el => {
      return {
        id: el.id,
        rosterNumber: el.rosterNumber,
        classroomId: el.classroomId,
        startedAt: el.startedAt,
        endedAt: el.endedAt,
        student: { id: el.student_id, person: { id: el.person_id, name: el.person_name }
        }
      }
    })
  }

  formatAlphaStuWQuestions(el: any[]) {
    return el.reduce((acc: any[], prev) => {

      let studentClassroom = acc.find(el => el.id === prev.id)

      if (!studentClassroom) {

        studentClassroom = {
          id: prev.id,
          rosterNumber: prev.rosterNumber,
          endedAt: prev.endedAt,
          student: {
            id: prev.studentId,
            alphabetic: [],
            person: {
              id: prev.personId,
              name: prev.name
            }
          }
        }
        acc.push(studentClassroom)
      }

      studentClassroom.student.alphabetic.push({
        id: prev.alphabeticId,
        observation: prev.observation,
        rClassroom: { id: prev.rClassroomId },
        alphabeticLevel: {
          id: prev.alphabeticLevelId,
          color: prev.alphabeticLevelColor,
        },
        test: {
          id: prev.testId,
          name: prev.testName,
          period: {
            id: prev.periodId,
            bimester: { id: prev.bimesterId },
            year: { id: prev.yearId },
          }
        }
      })

      return acc
    }, [])
  }

  formatTestQuestions(arr: qTestQuestions[]) {
    return arr.map(el => {
      return {
        id: el.test_question_id,
        order: el.test_question_order,
        answer: el.test_question_answer,
        active: el.test_question_active,
        question: {
          id: el.question_id,
        },
        questionGroup: {
          id: el.question_group_id,
          name: el.question_group_name,
        }
      }
    })
  }

  formatAlphabeticTests(arr: qAlphaTests[]) {
    return arr.map(el => {
      return {
        id: el.test_id,
        active: el.test_active,
        category: { id: el.test_id },
        discipline: { id: el.discipline_id, name: el.discipline_name },
        period: {
          id: el.period_id,
          bimester: { id: el.bimester_id, name: el.bimester_name, testName: el.bimester_testName },
          year: { id: el.year_id, name: el.year_name }
        }
      }
    })
  }

  formatUserTeacher(el: {[key: string]: any}) {

    return {
      id: el.id,
      email: el.email,
      register: el.register,
      person: {
        id: el.person_id,
        name: el.person_name,
        category: { id: el.person_category_id, name: el.person_category_name },
        user: { id: el.user_id, username: el.user_name, email: el.user_email
        }
      }
    } as qUserTeacher
  }

  formatedTest(qTest: qTest) {
    return {
      id: qTest.id,
      name: qTest.name,
      createdAt: qTest.createdAt,
      category: { id: qTest.test_category_id, name: qTest.test_category_name },
      period: {
        id: qTest.period_id,
        bimester: { id: qTest.bimester_id, name: qTest.bimester_name, testName: qTest.bimester_testName },
        year: { id: qTest.year_id, name: qTest.year_name }
      },
      discipline: { id: qTest.discipline_id, name: qTest.discipline_name },
    } as unknown as Test
  }

  formatAlphabeticYearHeader(el: qYear[]){
    return el.reduce((acc: qFormatedYear, prev: qYear) => {
      if (!acc.id) { acc.id = prev.id; acc.name = prev.name; acc.periods = [] }
      acc.periods.push({id: prev.period_id, bimester: {id: prev.bimester_id, name: prev.bimester_name, testName: prev.bimester_testName}});
      return acc;
    }, {} as qFormatedYear)
  }
}