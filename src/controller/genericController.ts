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
  qPendingTransfers,
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
  SavePerson, TeacherParam,
  Training,
  TrainingResult,
  TrainingWithSchedulesResult
} from "../interfaces/interfaces";
import {Classroom} from "../model/Classroom";
import {Request} from "express";
import {PoolConnection, ResultSetHeader} from "mysql2/promise";
import {format} from "mysql2";
import {Test} from "../model/Test";
import {Transfer} from "../model/Transfer";
import {Discipline} from "../model/Discipline";
import {Teacher} from "../model/Teacher";
import {ClassroomCategory} from "../model/ClassroomCategory";
import {Contract} from "../model/Contract";
import {TrainingTeacherStatus} from "../model/TrainingTeacherStatus";

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

  async qNewTraining(conn: PoolConnection, yearId: number, category: number, month: number, meeting: number, createdByUser: number, classroom?: number, discipline?: number, observation?: string ) {
    const insertQuery = `
        INSERT INTO training (yearId, categoryId, monthReferenceId, meetingId, classroom, createdByUser, updatedByUser, disciplineId, observation)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [queryResult] = await conn.query<ResultSetHeader>(format(insertQuery), [yearId, category, month, meeting, classroom, createdByUser, createdByUser, discipline || null, observation || null])
    return queryResult;
  }

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

  async qNotTestIncluded(conn: PoolConnection, yearName: string, classroomId: number, testId: number) {
    const query = `
        SELECT sc.id AS id, st.id AS student_id, st.ra AS ra, st.dv AS dv, per.name AS name
        FROM student_classroom AS sc
                 INNER JOIN student AS st ON sc.studentId = st.id
                 INNER JOIN person AS per ON st.personId = per.id
                 INNER JOIN year AS yr ON sc.yearId = yr.id
                 INNER JOIN classroom AS cl ON sc.classroomId = cl.id
        WHERE
            yr.name = ?
          AND cl.id = ?
          AND sc.endedAt IS NULL
          AND NOT EXISTS (
            SELECT 1
            FROM student_test_status AS sts
            WHERE sts.studentClassroomId = sc.id
              AND sts.testId = ?
        )
    `;

    const [queryResult] = await conn.query(format(query), [yearName, classroomId, testId]);
    return queryResult as { id: number, student_id: number, name: string, ra: string, dv: string }[];
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

  async qNewStudentClassroom(conn: PoolConnection, studentId: number, classroomId: number, yearId: number, createdByUser: number, rosterNumber: number) {
    const insertQuery = `
        INSERT INTO student_classroom (studentId, classroomId, yearId, rosterNumber, startedAt, createdByUser) 
        VALUES (?, ?, ?, ?, ?, ?)
    `
    const [ queryResult ] = await conn.query(format(insertQuery), [studentId, classroomId, yearId, rosterNumber, new Date(), createdByUser])
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

  async qTestByStudentId<T>(conn: PoolConnection, studentId: number, yearName: number | string, search: string, limit: number, offset: number) {

    const testSearch = `%${search.toString().toUpperCase()}%`

    const query =
      `
        SELECT
          sts.id AS studentTestStatusId,
          sc.id AS studentClassroomId,
          t.id AS testId,
          sc.studentId,
          t.name AS testName,
          bim.name AS bimesterName,
          yr.name AS yearName,
          c.shortName AS classroomName,
          s.shortName AS schoolName,
          UPPER(d.name) AS discipline
        FROM test_classroom tc
         INNER JOIN student_classroom sc ON tc.classroomId = sc.classroomId
         INNER JOIN test t ON tc.testId = t.id
         INNER JOIN discipline d ON t.disciplineId = d.id
         INNER JOIN classroom c ON sc.classroomId = c.id
         INNER JOIN school s ON c.schoolId = s.id
         INNER JOIN student stu ON sc.studentId = stu.id
         INNER JOIN person per ON stu.personId = per.id
         INNER JOIN period pri ON t.periodId = pri.id
         INNER JOIN year yr ON pri.yearId = yr.id
         INNER JOIN bimester bim ON pri.bimesterId = bim.id
         LEFT JOIN student_test_status sts ON sts.studentClassroomId = sc.id AND sts.testId = t.id
        WHERE
          sc.studentId = ?
          AND yr.name = ?
          AND t.categoryId = 6
          AND t.name LIKE ?
          AND ((sc.startedAt <= t.createdAt AND (sc.endedAt IS NULL OR sc.endedAt >= t.createdAt)) OR sts.id IS NOT NULL)
        LIMIT ?
        OFFSET ?
      `

    const [ queryResult ] = await conn.query(format(query), [ studentId, yearName, testSearch, limit, offset ])

    return queryResult as T[]
  }

  async qFilteredTestByStudentId<T>(conn: PoolConnection, studentId: number, testId: number) {

    const query =
      `
          SELECT
              sts.id AS studentTestStatusId,
              sts.active,
              sc.id AS studentClassroomId,  -- Mudança importante: pegar direto de sc
              sc.studentId,
              t.id AS testId,  -- Mudança: pegar direto de t
              t.name AS testName,
              bim.name AS bimesterName,
              yr.name AS yearName,
              c.id AS classroomId,
              c.shortName AS classroomName,
              s.shortName AS schoolName,
              UPPER(d.name) AS discipline
          FROM test_classroom tc
                   INNER JOIN student_classroom sc ON tc.classroomId = sc.classroomId
                   INNER JOIN test t ON tc.testId = t.id
                   INNER JOIN discipline d ON t.disciplineId = d.id
                   INNER JOIN classroom c ON sc.classroomId = c.id
                   INNER JOIN school s ON c.schoolId = s.id
                   INNER JOIN student stu ON sc.studentId = stu.id
                   INNER JOIN person per ON stu.personId = per.id
                   INNER JOIN period pri ON t.periodId = pri.id
                   INNER JOIN year yr ON pri.yearId = yr.id
                   INNER JOIN bimester bim ON pri.bimesterId = bim.id
                   LEFT JOIN student_test_status sts ON sts.studentClassroomId = sc.id AND sts.testId = t.id
          WHERE
              sc.studentId = ?
            AND t.id = ?
            AND t.categoryId = 6
            AND sc.startedAt <= t.createdAt
            AND (sc.endedAt IS NULL OR sc.endedAt >= t.createdAt)
      `

    const [ queryResult ] = await conn.query(format(query), [studentId, testId])

    return (queryResult as { studentTestStatusId: number, active: boolean, studentClassroomId: number, classroomId: number }[])[0]
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
        SELECT t.id, GROUP_CONCAT(DISTINCT c.id ORDER BY c.id ASC) AS classrooms, pc.id AS categoryId
        FROM teacher AS t
          INNER JOIN person AS p ON t.personId = p.id
          INNER JOIN user AS u ON p.id = u.personId
          INNER JOIN teacher_class_discipline AS tcd ON t.id = tcd.teacherId
          INNER JOIN classroom AS c ON tcd.classroomId = c.id
          INNER JOIN person_category AS pc ON p.categoryId = pc.id
        WHERE u.id = ? AND tcd.endedAt IS NULL
        GROUP BY t.id
      `

    const [ queryResult ] = await conn.query(format(query), [userId])

    const qTeacherClassrooms = (queryResult as qTeacherClassrooms[])[0]

    return { id: qTeacherClassrooms?.id, personCategoryId: qTeacherClassrooms?.categoryId, classrooms: qTeacherClassrooms?.classrooms?.split(',').map(el => Number(el)) ?? [] }
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

  async qEndAllTeacherRelations(conn: PoolConnection, teacherId: number) {

    const updateQuery =
      `
        UPDATE teacher_class_discipline SET endedAt = ? where teacherId = ?;
      `

    const [ queryResult ] = await conn.query(format(updateQuery), [new Date(), teacherId])
    return queryResult
  }

  async qStudentByRa(conn: PoolConnection, ra: string, dv: string) {
    const query =
      `
        SELECT student.*, perc.id AS categoryId, per.name AS name
        FROM student
        INNER JOIN person per ON student.personId = per.id
        INNER JOIN person_category perc ON per.categoryId = perc.id
        WHERE student.ra = ? AND student.dv = ? 
      `

    const [ queryResult ] = await conn.query(format(query), [ra, dv])

    return (queryResult as { id: number, name: string, ra: string, dv: string, categoryId: number }[])[0]
  }

  async qTeacherByUser(conn: PoolConnection, userId: number) {
    const query =
      `
        SELECT teacher.id, teacher.email, teacher.register, teacher.schoolId,
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

  async qUpsertTrainingTeacher(conn: PoolConnection, teacherId: number, trainingId: number, statusId: number, userId: number ) {
    const query = `
        INSERT INTO training_teacher (teacherId, trainingId, statusId, createdAt, createdByUser, updatedAt, updatedByUser)
        VALUES (?, ?, ?, NOW(), ?, NOW(), ?)
        ON DUPLICATE KEY UPDATE
                             statusId = VALUES(statusId),
                             updatedAt = NOW(),
                             updatedByUser = VALUES(updatedByUser)
    `;

    const [result] = await conn.query<ResultSetHeader>(query, [teacherId, trainingId, statusId, userId, userId]);

    return result;
  }

  async qUpsertTrainingTeacherObs(conn: PoolConnection, teacherId: number, trainingId: number, observation: string, userId: number ) {
    const query = `
        INSERT INTO training_teacher (teacherId, trainingId, observation, createdAt, createdByUser, updatedAt, updatedByUser)
        VALUES (?, ?, ?, NOW(), ?, NOW(), ?)
        ON DUPLICATE KEY UPDATE
                             observation = VALUES(observation),
                             updatedAt = NOW(),
                             updatedByUser = VALUES(updatedByUser)
    `;

    const [result] = await conn.query<ResultSetHeader>(query, [teacherId, trainingId, observation, userId, userId]);

    return result;
  }

  async qUpdateTraining(
    conn: PoolConnection,
    id: number,
    meeting: number,
    category: number,
    month: number,
    updatedByUser: number,
    classroom?: number,
    discipline?: number,
    observation?: string
  ) {
    const updateQuery = `
    UPDATE training 
    SET
      meetingId = ?, 
      categoryId = ?, 
      monthReferenceId = ?,
      classroom = ?, 
      disciplineId = ?, 
      observation = ?, 
      updatedByUser = ?
    WHERE id = ?
  `;

    const [queryResult] = await conn.query<ResultSetHeader>(
      updateQuery,
      [meeting, category, month, classroom, discipline || null, observation || null, updatedByUser, id]
    );

    return queryResult;
  }

  async qAggregateTest(conn: PoolConnection, yearName: string, classroom: number, bimesterId: number) {

    const likeClassroom = `%${classroom}%`

    const query = `
        SELECT DISTINCT(t.id), tcat.name AS category, b.name AS bimester, y.name AS year, t.name AS testName, d.name AS disciplineName
        FROM test_classroom AS tc
                 INNER JOIN classroom AS c ON tc.classroomId = c.id
                 INNER JOIN test AS t ON tc.testId = t.id
                 INNER JOIN discipline AS d ON t.disciplineId = d.id
                 INNER JOIN test_category AS tcat ON tcat.id = t.categoryId
                 INNER JOIN period AS p ON t.periodId = p.id
                 INNER JOIN bimester AS b ON p.bimesterId = b.id
                 INNER JOIN year AS y ON p.yearId = y.id
        WHERE y.name = ? AND c.shortName like ? AND p.bimesterId = ?;    
    `

    const [ queryResult ] = await conn.query(format(query), [yearName, likeClassroom, bimesterId])
    return queryResult as { id: number, category: string, bimester: string, year: string, testName: string, disciplineName: string }[];
  }

  async qTestQuestionsGroups(testId: number, connection: any) {
    const query = `
    SELECT 
      qg.id AS id,
      qg.name AS name,
      COUNT(tq.id) AS questionsCount
    FROM question_group qg
    LEFT JOIN test_question tq ON qg.id = tq.questionGroupId
    WHERE tq.testId = ?
    GROUP BY qg.id, qg.name
    ORDER BY qg.id
  `;

    const result = await connection.execute(query, [testId]);
    return result[0];
  }

  async qDeleteStudentFromTest(conn: PoolConnection, classroomId: number, studentClassroomId: number) {
    try {
      // Inicia a transação
      await conn.beginTransaction();

      // Primeiro, exclui o status de teste do aluno
      await conn.query(
        `DELETE FROM student_test_status WHERE studentClassroomId = ?`,
        [studentClassroomId]
      );

      // Depois, exclui o vínculo do aluno com a sala
      const [result] = await conn.query(
        `DELETE FROM student_classroom WHERE id = ? AND classroomId = ?`,
        [studentClassroomId, classroomId]
      );

      // Finaliza a transação com sucesso
      await conn.commit();
      return result;

    } catch (error) {
      // Reverte qualquer alteração em caso de erro
      await conn.rollback();
      throw error;
    }
  }

  async qAllTeachersForSuperUser(conn: PoolConnection, search: string){

    const personSearch = `%${search.toString().toUpperCase()}%`

    const query =
      `
          SELECT t.id, t.email, t.register,
                 p.id AS pId, p.name, p.birth,
                 pc.id AS pcId, pc.name AS catName, pc.active
          FROM teacher AS t
                   LEFT JOIN person AS p ON t.personId = p.id
                   LEFT JOIN person_category AS pc ON p.categoryId = pc.id
          WHERE EXISTS (
              SELECT 1
              FROM teacher_class_discipline AS tcd
              WHERE tcd.teacherId = t.id
          )
            AND p.name LIKE ?
          ORDER BY p.name;
      `

    const [ queryResult ] = await conn.query(format(query), [personSearch])

    let result = queryResult as { [key: string]: any }[]

    return result.map(el => {
      return {
        id: el.id,
        email: el.email,
        register: el.register,
        person: {
          id: el.pId,
          name: el.name,
          birth: el.birth,
          category: {
            id: el.pcId,
            name: el.catName,
            active: el.active
          }
        }
      }
    })
  }

  async qTeacherThatBelongs(conn: PoolConnection, classroomsIds: number[], search: string){

    const personSearch = `%${search.toString().toUpperCase()}%`

    const query =
      `
          SELECT t.id, t.email, t.register,
                 p.id AS pId, p.name, p.birth,
                 pc.id AS pcId, pc.name AS catName, pc.active
          FROM teacher AS t
                   LEFT JOIN person AS p ON t.personId = p.id
                   LEFT JOIN person_category AS pc ON p.categoryId = pc.id
          WHERE EXISTS (
              SELECT 1
              FROM teacher_class_discipline AS tcd
              WHERE tcd.teacherId = t.id AND tcd.classroomId IN (?) AND tcd.endedAt IS NULL
          )
            AND p.name LIKE ?
          ORDER BY p.name;
      `

    const [ queryResult ] = await conn.query(format(query), [classroomsIds, personSearch])

    let result = queryResult as { [key: string]: any }[]

    return result.map(el => {
      return {
        id: el.id,
        email: el.email,
        register: el.register,
        person: {
          id: el.pId,
          name: el.name,
          birth: el.birth,
          category: {
            id: el.pcId,
            name: el.catName,
            active: el.active
          }
        }
      }
    })
  }

  async qTeacherThatNotBelongs(conn: PoolConnection, classroomsIds: number[], search: string){

    const personSearch = `%${search.toString().toUpperCase()}%`

    const query =
      `
          SELECT t.id, t.email, t.register,
                 p.id AS pId, p.name, p.birth,
                 pc.id AS pcId, pc.name AS catName, pc.active
          FROM teacher AS t
                   LEFT JOIN person AS p ON t.personId = p.id
                   LEFT JOIN person_category AS pc ON p.categoryId = pc.id
          WHERE NOT EXISTS (
              SELECT 1
              FROM teacher_class_discipline AS tcd
              WHERE tcd.teacherId = t.id
                AND tcd.classroomId IN (?)
                AND tcd.endedAt IS NULL -- Apenas aqueles que ainda têm vínculo devem ser excluídos
          )
            AND pc.id = ?
            AND p.name LIKE ?
          ORDER BY p.name;

      `

    const [ queryResult ] = await conn.query(format(query), [classroomsIds, 8, personSearch])

    let result = queryResult as { [key: string]: any }[]

    return result.map(el => {
      return {
        id: el.id,
        email: el.email,
        register: el.register,
        person: {
          id: el.pId,
          name: el.name,
          birth: el.birth,
          category: {
            id: el.pcId,
            name: el.catName,
            active: el.active
          }
        }
      }
    })
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

  async qSingleRel(conn: PoolConnection, teacherId: number, classroomId: number, disciplineId: number) {
    const insertQuery = `
        INSERT INTO teacher_class_discipline (startedAt, teacherId, classroomId, disciplineId) 
        VALUES (?, ?, ?, ?)
    `
    const [ queryResult ] = await conn.query(format(insertQuery), [new Date(), teacherId, classroomId, disciplineId])
    return queryResult
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

  async qDiscipline(conn: PoolConnection, disciplineId: number) {
    const query =

      `
        SELECT *
        FROM discipline AS d
        WHERE d.id = ?
      `

    const [ queryResult ] = await conn.query(format(query), [disciplineId])

    return (queryResult as Discipline[])[0]
  }

  async qTeacher(conn: PoolConnection, teacherId: number) {
    const query =

      `
        SELECT *
        FROM teacher AS t
        WHERE t.id = ?
      `

    const [ queryResult ] = await conn.query(format(query), [teacherId])

    return (queryResult as Teacher[])[0]
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
            WHERE tc.testId = ? AND s.id = c.schoolId AND s.id NOT IN (?)
          )
        ORDER BY s.shortName
      `

    const [ queryResult ] = await conn.query(format(query), [testId, [28, 29]])
    return queryResult as qSchools[]
  }

  async qClassroomsByTestId(conn: PoolConnection, schoolId: number, testId: number) {
    const query =

      `
        SELECT c.id, c.shortName 
        FROM classroom AS c
          INNER JOIN test_classroom AS tc ON c.id = tc.classroomId
        WHERE schoolId = ? AND tc.testId = ? AND c.id NOT IN (?)
      `

    const [ queryResult ] = await conn.query(format(query), [schoolId, testId, [1216, 1217, 1218]])
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
            qg.id AS question_group_id, qg.name AS question_group_name,
            sk.id AS skill_id, sk.reference AS skill_reference, sk.description AS skill_description
        FROM test_question AS tq
        INNER JOIN question AS qt ON tq.questionId = qt.id
            LEFT JOIN skill AS sk ON qt.skillId = sk.id
        INNER JOIN question_group AS qg ON tq.questionGroupId = qg.id
        INNER JOIN test AS tt ON tq.testId = tt.id
        WHERE tt.id = ?
        ORDER BY qg.id, tq.order
      `

    const [ queryResult ] = await conn.query(format(query), [testId])
    return this.formatTestQuestions(queryResult as qTestQuestions[])
  }

  async qTestQuestionsWithTitle(conn: PoolConnection, testId: number | string) {

    const query =
      `
        SELECT 
            tq.id AS test_question_id, tq.order AS test_question_order, tq.answer AS test_question_answer, tq.active AS test_question_active,
            qt.id AS question_id,
            qt.title AS question_title,
            qt.images AS question_images,
            qg.id AS question_group_id, qg.name AS question_group_name,
            sk.id AS skill_id, sk.reference AS skill_reference, sk.description AS skill_description
        FROM test_question AS tq
        INNER JOIN question AS qt ON tq.questionId = qt.id
            LEFT JOIN skill AS sk ON qt.skillId = sk.id
        INNER JOIN question_group AS qg ON tq.questionGroupId = qg.id
        INNER JOIN test AS tt ON tq.testId = tt.id
        WHERE tt.id = ?
        ORDER BY qg.id, tq.order
      `

    const [ queryResult ] = await conn.query(format(query), [testId])
    return this.formatTestQuestions(queryResult as qTestQuestions[])
  }

  async qStudentTestQuestions(conn: PoolConnection, testId: number, studentId: number) {

    const query =
      `
        SELECT sq.id AS studentQuestionId, sq.answer, sq.testQuestionId, sq.studentId, sq.rClassroomId
        FROM student_question sq
          INNER JOIN test_question tq ON sq.testQuestionId = tq.id
          INNER JOIN question qt ON tq.questionId = qt.id
          INNER JOIN test tt ON tq.testId = tt.id
        WHERE studentId = ? AND tt.id = ?;
      `

    const [ queryResult ] = await conn.query(format(query), [studentId, testId])

    return queryResult as Array<{ id: number, answer: string, testQuestionId: string, studentId: number, rClassroomId: number }>
  }

  async qCreateLinkAlphabetic(studentClassrooms: qAlphaStuClassroomsFormated[], test: Test, userId: number, conn: PoolConnection) {

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
        await conn.query(format(insertQuery), [new Date(), userId, element.student.id, test.id])
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

  async qSetFirstLevel(conn: PoolConnection, studentId: number, levelId: number, userId: number) {

    const query = `
      INSERT INTO alphabetic_first (studentId, alphabeticFirstId, createdByUser, updatedByUser, createdAt, updatedAt) 
      VALUES (?, ?, ?, ?, ?, ?) 
      ON DUPLICATE KEY UPDATE alphabeticFirstId = VALUES(alphabeticFirstId), updatedByUser = VALUES(updatedByUser), updatedAt = VALUES(updatedAt)
    `

    const [ queryResult ] = await conn.query(format(query), [studentId, levelId, userId, userId, new Date(), new Date()])
    return queryResult as any
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
          tcd.id, tcd.teacherId, tcd.classroomId, tcd.disciplineId, tcd.contractId AS contract, tcd.startedAt,
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
          SELECT student_classroom.id,
                 student_classroom.rosterNumber,
                 student_classroom.startedAt,
                 student_classroom.endedAt,
                 student.id       AS studentId,
                 student.active,
                 person.id        AS personId,
                 person.name      AS name,
                 alphabetic.id    AS alphabeticId,
                 alphabetic.alphabeticLevelId,
                 alphabetic.rClassroomId,
                 alphaLevel.color AS alphabeticLevelColor,
                 alphabetic.observation,
                 test.id          AS testId,
                 test.name        AS testName,
                 period.id        AS periodId,
                 bim.id           AS bimesterId,
                 year.id          AS yearId,
                 al.id            AS alphaFirstLevelId,
                 al.shortName     AS alphaFirstLevelShortName,
                 al.name          AS alphaFirstLevelName
          FROM student_classroom
                   INNER JOIN student ON student_classroom.studentId = student.id
                   LEFT JOIN alphabetic_first AS af ON student.id = af.studentId
                   LEFT JOIN alphabetic_level AS al ON af.alphabeticFirstId = al.id
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
          WHERE student_classroom.id = ?
            AND (student_classroom.yearId = ? AND student_classroom.yearId = period.yearId AND classroom.id = ?)
            AND discipline.id = ?
            AND test_category.id
          ORDER BY student_classroom.rosterNumber, person.name
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
          year.id AS yearId,
          al.id AS alphaFirstLevelId,
          al.shortName AS alphaFirstLevelShortName,
          al.name AS alphaFirstLevelName
        FROM student_classroom
          INNER JOIN student ON student_classroom.studentId = student.id
          LEFT JOIN alphabetic_first AS af ON student.id = af.studentId
          LEFT JOIN alphabetic_level AS al ON af.alphabeticFirstId = al.id
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
        ORDER BY student_classroom.rosterNumber, name
      `

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

  async qPresence(conn: PoolConnection, trainingId: number) {

    const query = `
        SELECT *
        FROM training AS t
        WHERE t.id = ?
    `;

    const [queryResult] = await conn.query(format(query), [trainingId]);
    return (queryResult as Array<Training>)[0]
  }

  async qAllReferencedTrainings(conn: PoolConnection, referencedTraining: Training) {
    let query = '';

    if (!referencedTraining.disciplineId && referencedTraining.categoryId === 1) {
      query = `
          SELECT
              t.id,
              t.classroom,
              cc.id AS categoryId,
              cc.name AS categoryName,
              y.id AS yearId,
              y.name AS yearName,
              tm.id AS meetingId,
              tm.name AS meetingName,
              tmr.id AS monthId,
              tmr.name AS monthName,
              d.id AS disciplineId,
              d.name AS disciplineName
          FROM training AS t
                   INNER JOIN training_schedules_meeting AS tm ON t.meetingId = tm.id
                   INNER JOIN training_schedules_months_references AS tmr ON t.monthReferenceId = tmr.id
                   INNER JOIN classroom_category AS cc ON t.categoryId = cc.id
                   INNER JOIN year AS y ON t.yearId = y.id
                   LEFT JOIN discipline AS d ON t.disciplineId = d.id
          WHERE
              t.yearId = ? AND
              t.categoryId = ? AND
              t.classroom = ?
          ORDER BY t.id
      `;

      const [queryResult] = await conn.query(query, [
        referencedTraining.yearId,
        referencedTraining.categoryId,
        referencedTraining.classroom
      ]);

      return this.formatTrainingsWithSchedules(queryResult as any[]);
    }

    query = `
        SELECT
            t.id,
            cc.id AS categoryId,
            cc.name AS categoryName,
            y.id AS yearId,
            y.name AS yearName,
            tm.id AS meetingId,
            tm.name AS meetingName,
            tmr.id AS monthId,
            tmr.name AS monthName,
            d.id AS disciplineId,
            d.name AS disciplineName
        FROM training AS t
                 INNER JOIN training_schedules_meeting AS tm ON t.meetingId = tm.id
                 INNER JOIN training_schedules_months_references AS tmr ON t.monthReferenceId = tmr.id
                 INNER JOIN classroom_category AS cc ON t.categoryId = cc.id
                 INNER JOIN year AS y ON t.yearId = y.id
                 LEFT JOIN discipline AS d ON t.disciplineId = d.id
        WHERE
            t.yearId = ? AND
            t.categoryId = ? AND
            t.disciplineId = ?
        ORDER BY t.id
    `;

    const [queryResult] = await conn.query(query, [
      referencedTraining.yearId,
      referencedTraining.categoryId,
      referencedTraining.disciplineId
    ]);

    return this.formatTrainingsWithSchedules(queryResult as any[]);
  }

  async updateTeacherContractCurrentYear(conn: PoolConnection, body: { teacherId: number, schoolId: number, contractId: number, categoryId: number, yearId: number, yearName: string, classroom: number }) {
    const query =
      `
          UPDATE teacher_class_discipline AS tcd
              INNER JOIN classroom AS c ON tcd.classroomId = c.id
              INNER JOIN school AS s ON c.schoolId = s.id
          SET tcd.contractId = ?
          WHERE
              tcd.teacherId = ? AND
              s.id = ? AND
              CAST(LEFT(c.shortName, 1) AS UNSIGNED) = ? AND
              c.categoryId = ? AND
              tcd.endedAt IS NULL
      `

    const [ queryResult ] = await conn.query(query, [body.contractId, body.teacherId, body.schoolId, body.classroom, body.categoryId])
    return queryResult
  }

  async updateTeacherContractOtherYear(conn: PoolConnection, body: { teacherId: number, schoolId: number, contractId: number, categoryId: number, yearId: number, yearName: string, classroom: number }) {
    const query = `
    UPDATE teacher_class_discipline AS tcd
    INNER JOIN classroom AS c ON tcd.classroomId = c.id
    INNER JOIN school AS s ON c.schoolId = s.id
    INNER JOIN training_teacher AS tt ON tt.teacherId = tcd.teacherId
    INNER JOIN training AS tr ON tt.trainingId = tr.id
    INNER JOIN year AS y ON tr.yearId = y.id
    SET tcd.contractId = ?
    WHERE
      tcd.teacherId = ? AND
      s.id = ? AND
      CAST(LEFT(c.shortName, 1) AS UNSIGNED) = ? AND
      c.categoryId = ? AND
      y.name = ?
  `

    const [ queryResult ] = await conn.query(query, [
      body.contractId,
      body.teacherId,
      body.schoolId,
      body.classroom,
      body.categoryId,
      body.yearName
    ])

    return queryResult
  }

  async qSpecificDisciplinesInPEBI(conn: PoolConnection, referencedTraining: Training, isCurrentYear: boolean, referencedTrainingYear: string, teacher: qUserTeacher) {

    const shouldFilterBySchool = teacher.school?.id !== null && ![1, 2, 10].includes(teacher.person.category.id);
    const shouldFilterByDiscipline = referencedTraining.disciplineId !== null && referencedTraining.disciplineId !== undefined;
    const shouldFilterByTeacher = [7, 8].includes(teacher.person.category.id);

    const query = `
        SELECT
            t.id,
            p.name,
            d.name AS discipline,
            GROUP_CONCAT(DISTINCT CAST(LEFT(c.shortName, 1) AS UNSIGNED) ORDER BY CAST(LEFT(c.shortName, 1) AS UNSIGNED) SEPARATOR ', ') AS classroom,
            s.id AS schoolId,
            s.shortName,
            d.id AS disciplineId,
            CASE WHEN s.id = t.schoolId THEN 1 ELSE 0 END AS isHeadquarterSchool
        FROM teacher_class_discipline AS tcd
                 INNER JOIN discipline AS d ON tcd.disciplineId = d.id
                 INNER JOIN teacher AS t ON tcd.teacherId = t.id
                 INNER JOIN person AS p ON t.personId = p.id
                 INNER JOIN person_category AS pc ON p.categoryId = pc.id
                 INNER JOIN classroom AS c ON tcd.classroomId = c.id
                 INNER JOIN classroom_category AS cc ON c.categoryId = cc.id
                 INNER JOIN school AS s ON c.schoolId = s.id
            ${!isCurrentYear ? `
 INNER JOIN training_teacher AS tt ON tt.teacherId = t.id
 INNER JOIN training AS tr ON tt.trainingId = tr.id
 INNER JOIN year AS y ON tr.yearId = y.id
 ` : ''}
        WHERE
            ${ shouldFilterByTeacher ? 'tcd.teacherId = ? AND' : '' }
            pc.id = 8 AND
            ${ isCurrentYear ? 'tcd.endedAt IS NULL' : 'y.name = ?' } AND
            ${ shouldFilterBySchool ? 'c.schoolId = ? AND' : '' }
        -- Disciplinas específicas (Inglês=6, Ed. Física=7, Artes=8) em turmas PEBI (1º ao 5º ano)
            d.id IN (6, 7, 8) AND
            CAST(LEFT(c.shortName, 1) AS UNSIGNED) BETWEEN 1 AND 5
            ${ shouldFilterByDiscipline ? 'AND tcd.disciplineId = ?' : '' }
        GROUP BY t.id, p.id, p.name, s.id, s.shortName, d.id, d.name, CASE WHEN s.id = t.schoolId THEN 1 ELSE 0 END
        ORDER BY
            CASE WHEN s.id = t.schoolId THEN 0 ELSE 1 END,  -- Escola sede primeiro
            s.shortName,
            p.name
    `;

    const queryParams = [
      ...(shouldFilterByTeacher ? [teacher.id] : []),
      ...(isCurrentYear ? [] : [referencedTrainingYear]),
      ...(shouldFilterBySchool ? [teacher.school.id] : []),
      ...(shouldFilterByDiscipline ? [referencedTraining.disciplineId] : [])
    ];

    const [queryResult] = await conn.query(query, queryParams);

    return queryResult as Array<{ id: number, name: string, discipline: string, classroom: string, schoolId: number, shortName: string, disciplineId: number, isHeadquarterSchool: number }>;
  }

  async qTeachersByCategory(conn: PoolConnection, referencedTraining: Training, isCurrentYear: boolean, referencedTrainingYear: string, teacher: qUserTeacher) {

    const shouldFilterBySchool = teacher.school?.id !== null && ![1, 2, 10].includes(teacher.person.category.id);
    const shouldFilterByClassroom = referencedTraining.categoryId === 1 && referencedTraining.classroom !== null && referencedTraining.classroom !== undefined;
    const shouldFilterByDiscipline = referencedTraining.categoryId === 2 && referencedTraining.disciplineId !== null && referencedTraining.disciplineId !== undefined;
    const shouldFilterByTeacher = [7, 8].includes(teacher.person.category.id);

    // Query principal (mantém comportamento original + escola sede)
    const mainQuery = `
        SELECT
            t.id,
            p.name,
            CASE WHEN cc.id = 1 THEN 'POLIVALENTE' ELSE d.name END AS discipline,
            ${referencedTraining.categoryId === 2 ?
      `GROUP_CONCAT(DISTINCT CAST(LEFT(c.shortName, 1) AS UNSIGNED) ORDER BY CAST(LEFT(c.shortName, 1) AS UNSIGNED) SEPARATOR ', ') AS classroom` :
      `CAST(LEFT(MIN(c.shortName), 1) AS UNSIGNED) AS classroom`
    },
            s.id AS schoolId,
            s.shortName,
            ${referencedTraining.categoryId === 2 ? 'd.id AS disciplineId' : 'NULL AS disciplineId'},
            CASE WHEN s.id = t.schoolId THEN 1 ELSE 0 END AS isHeadquarterSchool
        FROM teacher_class_discipline AS tcd
                 INNER JOIN discipline AS d ON tcd.disciplineId = d.id
                 INNER JOIN teacher AS t ON tcd.teacherId = t.id
                 INNER JOIN person AS p ON t.personId = p.id
                 INNER JOIN person_category AS pc ON p.categoryId = pc.id
                 INNER JOIN classroom AS c ON tcd.classroomId = c.id
                 INNER JOIN classroom_category AS cc ON c.categoryId = cc.id
                 INNER JOIN school AS s ON c.schoolId = s.id
            ${!isCurrentYear ? `
 INNER JOIN training_teacher AS tt ON tt.teacherId = t.id
 INNER JOIN training AS tr ON tt.trainingId = tr.id
 INNER JOIN year AS y ON tr.yearId = y.id
 ` : ''}
        WHERE
            ${ shouldFilterByTeacher ? 'tcd.teacherId = ? AND' : '' }
            cc.id = ? AND
            pc.id = 8 AND
            ${ isCurrentYear ? 'tcd.endedAt IS NULL' : 'y.name = ?' } AND
            ${ shouldFilterByClassroom ? 'CAST(LEFT(c.shortName, 1) AS UNSIGNED) = ? AND' : '' }
            ${ shouldFilterBySchool ? 'c.schoolId = ? AND' : '' }
            (
            (cc.id = 1 AND d.id NOT IN (6, 7, 8, 9)) OR
            (cc.id = 2 AND ${ shouldFilterByDiscipline ? 'tcd.disciplineId = ?' : 'tcd.disciplineId = COALESCE(?, tcd.disciplineId)' })
            )
        GROUP BY
            ${referencedTraining.categoryId === 2 ?
      `t.id, p.id, p.name, s.id, s.shortName, d.id, CASE WHEN cc.id = 1 THEN 'POLIVALENTE' ELSE d.name END, CASE WHEN s.id = t.schoolId THEN 1 ELSE 0 END` :
      `t.id, p.id, p.name, s.id, s.shortName, CAST(LEFT(c.shortName, 1) AS UNSIGNED), CASE WHEN cc.id = 1 THEN 'POLIVALENTE' ELSE d.name END, CASE WHEN s.id = t.schoolId THEN 1 ELSE 0 END`
    }
        ORDER BY s.shortName
    `;

    const mainQueryParams = [
      ...(shouldFilterByTeacher ? [teacher.id] : []),
      referencedTraining.categoryId,
      ...(isCurrentYear ? [] : [referencedTrainingYear]),
      ...(shouldFilterByClassroom ? [referencedTraining.classroom] : []),
      ...(shouldFilterBySchool ? [teacher.school.id] : []),
      referencedTraining.disciplineId
    ];

    // Executa query principal
    const [mainResult] = await conn.query(mainQuery, mainQueryParams);
    let allTeachers = mainResult as Array<{ id: number, name: string, discipline: string, classroom: number | string, schoolId: number, shortName: string, disciplineId?: number | null, isHeadquarterSchool: number }>;

    // Se for busca por PEBII, adiciona professores de disciplinas específicas que lecionam em PEBI
    if (referencedTraining.categoryId === 2) {
      const specificTeachers = await this.qSpecificDisciplinesInPEBI(conn, referencedTraining, isCurrentYear, referencedTrainingYear, teacher);

      // Remove duplicatas (caso um professor já esteja no resultado principal)
      const existingIds = new Set(allTeachers.map(t => `${t.id}-${t.schoolId}-${t.disciplineId}`));
      const newTeachers = specificTeachers.filter(t =>
        !existingIds.has(`${t.id}-${t.schoolId}-${t.disciplineId}`)
      );

      allTeachers = [...allTeachers, ...newTeachers];

      // Ordenação simplificada: apenas por nome da escola
      allTeachers.sort((a, b) => a.shortName.localeCompare(b.shortName));
    }

    return allTeachers;
  }

  async qTeacherTrainings(conn: PoolConnection, teachers: TeacherParam[], trainingIds: number[], categoryId: number, isCurrentYear: boolean, referencedTrainingYear: string ) {

    const query = `
        SELECT tt.id, tt.teacherId, tt.trainingId, tt.statusId, tt.observation
        FROM training_teacher AS tt
        WHERE tt.trainingId IN (?) AND tt.teacherId = ?
    `

    // Query para PEBI (categoryId = 1) - comportamento original
    const contractQueryPEBI = `
        SELECT tcd.id, tcd.teacherId, tcd.contractId
        FROM teacher_class_discipline AS tcd
                 INNER JOIN classroom AS c ON tcd.classroomId = c.id
                 INNER JOIN school AS s ON c.schoolId = s.id
            ${!isCurrentYear ? `
INNER JOIN training_teacher AS tt ON tt.teacherId = tcd.teacherId
INNER JOIN training AS tr ON tt.trainingId = tr.id
INNER JOIN year AS y ON tr.yearId = y.id
` : ''}
        WHERE
            tcd.teacherId = ? AND
            s.id = ? AND
            CAST(LEFT(c.shortName, 1) AS UNSIGNED) = ? AND
            c.categoryId = 1 AND
            tcd.disciplineId = COALESCE(?, tcd.disciplineId) AND
            ${isCurrentYear
                    ? 'tcd.endedAt IS NULL'
                    : 'y.name = ?'
            }
        LIMIT 1
    `

    // Query para PEBII (categoryId = 2) - comportamento original
    const contractQueryPEBII = `
        SELECT tcd.id, tcd.teacherId, tcd.contractId
        FROM teacher_class_discipline AS tcd
                 INNER JOIN classroom AS c ON tcd.classroomId = c.id
                 INNER JOIN school AS s ON c.schoolId = s.id
            ${!isCurrentYear ? `
INNER JOIN training_teacher AS tt ON tt.teacherId = tcd.teacherId
INNER JOIN training AS tr ON tt.trainingId = tr.id
INNER JOIN year AS y ON tr.yearId = y.id
` : ''}
        WHERE
            tcd.teacherId = ? AND
            s.id = ? AND
            c.categoryId = 2 AND
            tcd.disciplineId = COALESCE(?, tcd.disciplineId) AND
            ${isCurrentYear
                    ? 'tcd.endedAt IS NULL'
                    : 'y.name = ?'
            }
        LIMIT 1
    `

    // Query para disciplinas específicas em PEBI (nova)
    const contractQuerySpecificInPEBI = `
        SELECT tcd.id, tcd.teacherId, tcd.contractId
        FROM teacher_class_discipline AS tcd
                 INNER JOIN classroom AS c ON tcd.classroomId = c.id
                 INNER JOIN school AS s ON c.schoolId = s.id
            ${!isCurrentYear ? `
INNER JOIN training_teacher AS tt ON tt.teacherId = tcd.teacherId
INNER JOIN training AS tr ON tt.trainingId = tr.id
INNER JOIN year AS y ON tr.yearId = y.id
` : ''}
        WHERE
            tcd.teacherId = ? AND
            s.id = ? AND
            c.categoryId = 1 AND
            tcd.disciplineId = ? AND
            ${isCurrentYear
                    ? 'tcd.endedAt IS NULL'
                    : 'y.name = ?'
            }
        LIMIT 1
    `

    // Busca contratos
    for(let teacher of teachers) {
      let queryParams: any[];
      let contractQuery: string;

      // Detecta se é um professor de disciplina específica lecionando em PEBI
      const isSpecificDisciplineInPEBI = teacher.disciplineId !== null &&
        teacher.disciplineId !== undefined &&
        [6, 7, 8].includes(teacher.disciplineId) &&
        typeof teacher.classroom === 'string' &&
        teacher.classroom.split(',').some(c => parseInt(c.trim()) >= 1 && parseInt(c.trim()) <= 5);

      if (categoryId === 1) {
        // PEBI - usa classroom específico
        const classroom = typeof teacher.classroom === 'string' ?
          parseInt(teacher.classroom.split(',')[0].trim()) :
          teacher.classroom;

        queryParams = [
          teacher.id,
          teacher.schoolId,
          classroom,
          teacher.disciplineId,
          ...(isCurrentYear ? [] : [referencedTrainingYear])
        ];
        contractQuery = contractQueryPEBI;

      } else if (isSpecificDisciplineInPEBI) {
        // Professor de disciplina específica que leciona em PEBI mas aparece em busca PEBII
        queryParams = [
          teacher.id,
          teacher.schoolId,
          teacher.disciplineId,
          ...(isCurrentYear ? [] : [referencedTrainingYear])
        ];
        contractQuery = contractQuerySpecificInPEBI;

      } else {
        // PEBII - comportamento original
        queryParams = [
          teacher.id,
          teacher.schoolId,
          teacher.disciplineId,
          ...(isCurrentYear ? [] : [referencedTrainingYear])
        ];
        contractQuery = contractQueryPEBII;
      }

      const [queryResult] = await conn.query(contractQuery, queryParams);
      const result = (queryResult as Array<{ id: number, teacherId: number, contractId: number | null }>)[0];

      teacher.contract = result ? result.contractId : null;
    }

    // Busca treinamentos dos professores
    for(let teacher of teachers) {
      const [queryResult] = await conn.query(query, [trainingIds, teacher.id]);
      teacher.trainingTeachers = queryResult as Array<{ id: number, teacherId: number, trainingId: number, statusId: number | string, observation: string | null }>;
    }

    return teachers;
  }

  async qTrainings(conn: PoolConnection, yearId: number, search: string, peb: number, limit: number, offset: number) {

    const query =
      `
          SELECT
              t.id AS id,
              t.classroom AS classroom,
              t.observation AS observation,
              d.name AS discipline,
              cc.name AS category,
              tm.name AS meeting,
              tsc.name AS month,
              y.name AS year,
              p.name AS createdBy
          FROM training AS t
                   INNER JOIN training_schedules_meeting AS tm ON t.meetingId = tm.id
                   INNER JOIN classroom_category AS cc ON t.categoryId = cc.id
                   INNER JOIN year AS y ON t.yearId = y.id
                   INNER JOIN training_schedules_months_references AS tsc ON t.monthReferenceId = tsc.id
                   INNER JOIN user AS u ON t.createdByUser = u.id
                   INNER JOIN person AS p ON u.personId = p.id
                   LEFT JOIN discipline AS d ON t.disciplineId = d.id
          WHERE t.yearId = ? AND t.categoryId = ?
          GROUP BY t.id, tm.name, t.classroom, t.observation, d.name, cc.name, y.name, p.name
          LIMIT ?
          OFFSET ?
      `

    const [ queryResult ] = await conn.query(query, [yearId, peb, limit, offset])

    return queryResult as Array<{
      id: number,
      classroom: string,
      observation: string,
      discipline: string,
      category: string,
      meeting: string,
      month: string,
      year: string,
      createdBy: string,
    }>
  }

  async qOneTraining(conn: PoolConnection, id: number): Promise<TrainingResult | null> {
    const query = `
        SELECT
            t.id AS id,
            tm.id AS meeting,
            t.classroom AS classroom,
            t.observation AS observation,
            d.id AS discipline,
            cc.id AS category,
            tsc.id AS month
        FROM training AS t
                 INNER JOIN training_schedules_meeting AS tm ON t.meetingId = tm.id
                 INNER JOIN classroom_category AS cc ON t.categoryId = cc.id
                 INNER JOIN training_schedules_months_references AS tsc ON t.monthReferenceId = tsc.id
                 INNER JOIN year AS y ON t.yearId = y.id
                 INNER JOIN user AS u ON t.createdByUser = u.id
                 INNER JOIN person AS p ON u.personId = p.id
                 LEFT JOIN discipline AS d ON t.disciplineId = d.id
        WHERE t.id = ?
    `;

    const [queryResult] = await conn.query(query, [id]);
    const rows = queryResult as any[];

    if (rows.length === 0) {
      return null;
    }

    const firstRow = rows[0];
    const training: TrainingResult = {
      id: firstRow.id,
      meeting: firstRow.meeting,
      classroom: firstRow.classroom,
      observation: firstRow.observation,
      discipline: firstRow.discipline,
      category: firstRow.category,
      month: firstRow.month,
      trainingSchedules: []
    };

    for(let row of rows) {
      if (row.trainingScheduleId) {
        training.trainingSchedules.push({
          id: row.trainingScheduleId,
          trainingId: row.training,
          dateTime: row.dateTime,
          active: row.active === 1
        });
      }
    }

    return training;
  }

  async qClassroomCategories(conn: PoolConnection) {
    const query = `SELECT id, name FROM classroom_category`
    const [ queryResult ] = await conn.query(format(query))
    return  queryResult as Array<ClassroomCategory>
  }

  async qContracts(conn: PoolConnection) {
    const query = `SELECT id, name FROM contract ORDER BY id DESC`
    const [ queryResult ] = await conn.query(format(query))
    return  queryResult as Array<Contract>
  }

  async qTeacherTrainingStatus(conn: PoolConnection) {
    const query = `SELECT id, name FROM training_teacher_status WHERE active = 1`
    const [ queryResult ] = await conn.query(format(query))
    return  queryResult as Array<TrainingTeacherStatus>
  }

  async qDisciplines(conn: PoolConnection) {
    const query = `SELECT id, name FROM discipline`
    const [ queryResult ] = await conn.query(format(query))
    return  queryResult as Array<Discipline>
  }

  async qTrainingSchedulesMonthReference(conn: PoolConnection) {
    const query = `SELECT id, name FROM training_schedules_months_references ORDER BY id`
    const [ queryResult ] = await conn.query(format(query))
    return  queryResult as Array<{ id: number, name: string }>
  }

  async qTrainingSchedulesMeetings(conn: PoolConnection) {
    const query = `SELECT id, name FROM training_schedules_meeting ORDER BY id`
    const [ queryResult ] = await conn.query(format(query))
    return  queryResult as Array<{ id: number, name: string }>
  }

  async qNumberClassrooms(conn: PoolConnection) {
    const query =
      `
          SELECT DISTINCT CAST(LEFT(shortName, 1) AS UNSIGNED) AS classroom_number, cc.id AS categoryId, cc.name AS categoryName
          FROM classroom AS c
                   INNER JOIN classroom_category AS cc ON c.categoryId = cc.id
          WHERE c.active = 1
            AND CAST(LEFT(c.shortName, 1) AS UNSIGNED) BETWEEN 1 AND 9
          ORDER BY classroom_number
      `
    const [ queryResult ] = await conn.query(format(query))
    return  queryResult as Array<any>
  }

  async qPendingTransferStatusBySchool(conn: PoolConnection, year: number, transferStatus: number, schoolId: number) {
    const query =

      `
        SELECT p.name, s.ra, s.dv, c.shortName AS requestedClassroom, sh.shortName As requestedSchool, ts.name AS status, currentClassroom.shortName AS currentClassroom, currentSchool.shortName AS currentSchool
        FROM transfer AS t
         INNER JOIN student AS s ON t.studentId = s.id
         INNER JOIN person AS p ON s.personId = p.id
         INNER JOIN transfer_status AS ts ON t.statusId = ts.id
         INNER JOIN classroom AS c ON t.requestedClassroomId = c.id
         INNER JOIN classroom AS currentClassroom ON t.currentClassroomId = currentClassroom.id
         INNER JOIN school AS currentSchool ON currentClassroom.schoolId = currentSchool.id
         INNER JOIN school AS sh ON c.schoolId = sh.id
         INNER JOIN year AS y ON t.yearId = y.id
        WHERE y.id = ? AND ts.id = ? AND currentSchool.id = ?;
      `

    const [ queryResult ] = await conn.query(format(query), [year, transferStatus, schoolId])
    return  queryResult as Array<qPendingTransfers>
  }

  async qAllPendingTransferStatusBySchool(conn: PoolConnection, year: number, transferStatus: number) {
    const query =

      `
        SELECT p.name, s.ra, s.dv, c.shortName AS requestedClassroom, sh.shortName As requestedSchool, ts.name AS status, currentClassroom.shortName AS currentClassroom, currentSchool.shortName AS currentSchool
        FROM transfer AS t
         INNER JOIN student AS s ON t.studentId = s.id
         INNER JOIN person AS p ON s.personId = p.id
         INNER JOIN transfer_status AS ts ON t.statusId = ts.id
         INNER JOIN classroom AS c ON t.requestedClassroomId = c.id
         INNER JOIN classroom AS currentClassroom ON t.currentClassroomId = currentClassroom.id
         INNER JOIN school AS currentSchool ON currentClassroom.schoolId = currentSchool.id
         INNER JOIN school AS sh ON c.schoolId = sh.id
         INNER JOIN year AS y ON t.yearId = y.id
        WHERE y.id = ? AND ts.id = ?
      `

    const [ queryResult ] = await conn.query(format(query), [year, transferStatus])
    return  queryResult as Array<qPendingTransfers>
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

  formatTrainingsWithSchedules(queryResult: any[]): TrainingWithSchedulesResult[] {
    return queryResult.reduce((acc: any[], row) => {
      // Procura se o training já existe no acumulador
      let training = acc.find(t => t.id === row.id);

      if (!training) {
        // Se não existe, cria um novo training
        training = {
          id: row.id,
          classroom: row.classroom ?? null,
          category: {
            id: row.categoryId,
            name: row.categoryName
          },
          year: {
            id: row.yearId,
            name: row.yearName
          },
          meeting: {
            id: row.meetingId,
            name: row.meetingName
          },
          month: {
            id: row.monthId,
            name: row.monthName
          },
          discipline: row.disciplineId ? {
            id: row.disciplineId,
            name: row.disciplineName
          } : null,
          trainingSchedules: []
        };
        acc.push(training);
      }

      // Se existe um schedule, adiciona ao array
      if (row.scheduleId) {
        training.trainingSchedules.push({
          id: row.scheduleId,
          dateTime: row.scheduleDateTime,
          active: row.scheduleActive === 1 // Converte para boolean
        });
      }

      return acc;
    }, []);
  }

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
            },
            alphabeticFirst: { id: prev.alphaFirstLevelId, shortName: prev.alphaFirstLevelShortName, name: prev.alphaFirstLevelName }
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
    return arr.map(el => ({
      id: el.test_question_id,
      order: el.test_question_order,
      answer: el.test_question_answer,
      active: el.test_question_active,
      question: { id: el.question_id, images: el.question_images, title: el.question_title, skill: { reference: el.skill_reference, description: el.skill_description } },
      questionGroup: { id: el.question_group_id, name: el.question_group_name }
    }))
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
      school: {
        id: el.schoolId ?? null
      },
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
      active: qTest.active,
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