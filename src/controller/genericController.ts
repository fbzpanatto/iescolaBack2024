import { DeepPartial, EntityManager, EntityTarget, FindManyOptions, FindOneOptions, ObjectLiteral, SaveOptions } from "typeorm";
import { AppDataSource } from "../data-source";
import { Person } from "../model/Person";
import { qAlphabeticLevels, qAlphaTests, qClassroom, qClassrooms, qPendingTransfers, qReadingFluenciesHeaders, qSchools, qState, qStudentClassroomFormated, qStudentsClassroomsForTest, qStudentTests, qTeacherClassrooms, qTeacherDisciplines, qTeacherRelationShip, qTest, qTestClassroom, qTestQuestions, qTransferStatus, qUser, qUserTeacher, qYear, SavePerson, TeacherParam, Training, TrainingResult } from "../interfaces/interfaces";
import { Classroom } from "../model/Classroom";
import { Request } from "express";
import { ResultSetHeader } from "mysql2/promise";
import { format } from "mysql2";
import { Test } from "../model/Test";
import { Transfer } from "../model/Transfer";
import { Discipline } from "../model/Discipline";
import { Teacher } from "../model/Teacher";
import { ClassroomCategory } from "../model/ClassroomCategory";
import { Contract } from "../model/Contract";
import { TrainingTeacherStatus } from "../model/TrainingTeacherStatus";
import { TestQuestion } from "../model/TestQuestion";
import { TEST_CATEGORIES_IDS } from "../utils/enums";
import { connectionPool } from "../services/db";
import { PersonCategory } from "../model/PersonCategory";
import { PERSON_CATEGORIES } from "../utils/enums";
import { StudentClassroom } from "../model/StudentClassroom";
import { Helper } from "../utils/helpers";

export class GenericController<T> {
  constructor(private entity: EntityTarget<ObjectLiteral>) {}

  get repository() { return AppDataSource.getRepository(this.entity) }

  async findAllWhere(options: FindManyOptions<ObjectLiteral> | undefined = {}, request?: Request, CONN?: EntityManager) {
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

  async save(body: DeepPartial<ObjectLiteral>, options: SaveOptions | undefined, CONN?: EntityManager) {
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

  async qLinkAlphabetics(stuClassrooms: any[], test: Test, testQuestions: TestQuestion[], userId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      if (!stuClassrooms || stuClassrooms.length === 0) { await conn.commit(); return }

      const studentIds = stuClassrooms.map(sC => sC.student?.id ?? sC.student_id).filter(id => id);
      const testQuestionIds = testQuestions.map(tq => tq.id);

      if (studentIds.length === 0 || testQuestionIds.length === 0) { await conn.commit(); return }

      const [existingAlphabeticRows] = await conn.query(
        `SELECT studentId FROM alphabetic WHERE testId = ? AND studentId IN (?)`,
        [test.id, studentIds]
      ) as any[];

      const existingAlphabeticStudentIds = new Set(existingAlphabeticRows.map((row: any) => row.studentId));

      const [questionsRows] = await conn.query(
        `SELECT studentId, testQuestionId FROM student_question WHERE studentId IN (?) AND testQuestionId IN (?)`,
        [studentIds, testQuestionIds]
      ) as any[];

      const questionKeys = new Set(questionsRows.map((row: any) => `${row.studentId}-${row.testQuestionId}`));

      const alphabeticLinksToSave: any[] = [];
      const questionsToSave: any[] = [];

      for (const sC of stuClassrooms) {
        const studentId = sC.student?.id ?? sC.student_id;

        if (!existingAlphabeticStudentIds.has(studentId)) {
          alphabeticLinksToSave.push([userId, studentId, test.id]);
          existingAlphabeticStudentIds.add(studentId);
        }

        for (const tQ of testQuestions) {
          const uniqueKey = `${studentId}-${tQ.id}`;
          if (!questionKeys.has(uniqueKey)) {
            questionsToSave.push(['', tQ.id, studentId, userId]);
            questionKeys.add(uniqueKey);
          }
        }
      }

      if (alphabeticLinksToSave.length > 0) {
        const alphabeticPlaceholders = alphabeticLinksToSave.map(() => '(NOW(), ?, ?, ?)').join(', ');
        const alphabeticFlatValues = alphabeticLinksToSave.flat();
        await conn.query(
          `INSERT IGNORE INTO alphabetic (createdAt, createdByUser, studentId, testId) VALUES ${alphabeticPlaceholders}`,
          alphabeticFlatValues
        );
      }

      if (questionsToSave.length > 0) {
        const questionPlaceholders = questionsToSave.map(() => '(?, ?, ?, NOW(), ?)').join(', ');
        const questionFlatValues = questionsToSave.flat();
        await conn.query(
          `INSERT INTO student_question (answer, testQuestionId, studentId, createdAt, createdByUser)
           VALUES ${questionPlaceholders}
           ON DUPLICATE KEY UPDATE updatedAt = NOW(), updatedByUser = VALUES(createdByUser)`,
          questionFlatValues
        );
      }

      await conn.commit();
    }
    catch (error) { if(conn){ await conn.rollback() } throw error }
    finally { if (conn) { conn.release() } }
  }

  async unifiedTestQuestLinkSql(createStatus: boolean, stuClassrooms: any[], test: Test, testQuestions: TestQuestion[], userId: number, addNames: boolean = false): Promise<string[] | void> {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      if (!stuClassrooms || stuClassrooms.length === 0) {
        await conn.commit();
        return addNames ? [] : undefined;
      }

      const studentIds = stuClassrooms.map(sC => sC.student?.id ?? sC.student_id).filter(id => id);
      const studentClassroomIds = stuClassrooms.map(sC => sC.student_classroom_id ?? sC.id).filter(id => id);
      const testQuestionIds = testQuestions.map(tq => tq.id);

      if (studentIds.length === 0 || testQuestionIds.length === 0) {
        await conn.commit();
        return addNames ? [] : undefined;
      }

      let existingStatusScIds = new Set<number>();
      let existingAlphabeticStudentIds = new Set<number>();
      let studentsWhoCompletedTest = new Set<number>();
      const alphabeticCategories = new Set([1, 2, 3]);

      if (test.category.id === TEST_CATEGORIES_IDS.SIM_ITA) {
        const [completedTestRows]: [any[], any] = await conn.query(
          `
        SELECT DISTINCT sc.studentId
        FROM student_test_status sts
        INNER JOIN student_classroom sc ON sts.studentClassroomId = sc.id
        WHERE sts.testId = ? 
          AND sc.studentId IN (?)
          AND sts.active = 0
        `,
          [test.id, studentIds]
        );
        studentsWhoCompletedTest = new Set(completedTestRows.map((row: any) => row.studentId));
      }

      if (alphabeticCategories.has(test.category.id)) {
        const [existingAlphabeticRows]: [any[], any] = await conn.query(
          `SELECT studentId FROM alphabetic WHERE testId = ? AND studentId IN (?)`,
          [test.id, studentIds]
        );
        existingAlphabeticStudentIds = new Set(existingAlphabeticRows.map((row: any) => row.studentId));
      }
      else {
        const [existingStatusesRows]: [any[], any] = await conn.query(
          `SELECT studentClassroomId FROM student_test_status WHERE testId = ? AND studentClassroomId IN (?)`,
          [test.id, studentClassroomIds]
        );
        existingStatusScIds = new Set(existingStatusesRows.map((row: any) => row.studentClassroomId));
      }

      const eQuery = `SELECT studentId, testQuestionId FROM student_question WHERE studentId IN (?) AND testQuestionId IN (?)`
      const [questionsRows]: [any[], any] = await conn.query(eQuery, [studentIds, testQuestionIds]);
      const questionKeys = new Set(questionsRows.map((row: any) => `${row.studentId}-${row.testQuestionId}`));

      let personNamesMap = new Map<number, string>();

      if (addNames) {
        const [personsRows]: [any[], any] = await conn.query(
          `SELECT p.name, s.id as student_id
         FROM person p
                  INNER JOIN student s ON s.personId = p.id
         WHERE s.id IN (?)`,
          [studentIds]
        );
        personsRows.forEach((row: any) => personNamesMap.set(row.student_id, row.name));
      }

      const addedNames: string[] = [];
      const statusesToSave: any[] = [];
      const alphabeticLinksToSave: any[] = [];
      const questionsToSave: any[] = [];

      for (const sC of stuClassrooms) {
        const studentId = sC.student?.id ?? sC.student_id;
        const studentClassroomId = sC.student_classroom_id ?? sC.id;

        if (test.category.id === TEST_CATEGORIES_IDS.SIM_ITA && studentsWhoCompletedTest.has(studentId)) {
          if (addNames) addedNames.push(personNamesMap.get(studentId) || '');
          continue;
        }

        if (alphabeticCategories.has(test.category.id)) {
          if (!existingAlphabeticStudentIds.has(studentId)) {
            alphabeticLinksToSave.push([userId, studentId, test.id]);
            existingAlphabeticStudentIds.add(studentId);
          }
        }
        else {
          if (test.category.id === TEST_CATEGORIES_IDS.SIM_ITA) {
            if (sC.endedAt != null || existingStatusScIds.has(studentClassroomId)) {
              if (addNames) addedNames.push(personNamesMap.get(studentId) || '');
              continue;
            }
          }
          if (createStatus && !existingStatusScIds.has(studentClassroomId)) {
            statusesToSave.push([true, test.id, studentClassroomId, '', userId]);
            existingStatusScIds.add(studentClassroomId);
          }
        }

        for (const tQ of testQuestions) {
          const uniqueKey = `${studentId}-${tQ.id}`;
          if (!questionKeys.has(uniqueKey)) {
            questionsToSave.push(['', tQ.id, studentId, userId]);
            questionKeys.add(uniqueKey);
          }
        }
      }

      if (alphabeticLinksToSave.length > 0) {
        const alphabeticPlaceholders = alphabeticLinksToSave.map(() => '(NOW(), ?, ?, ?)').join(', ');
        const alphabeticQuery = `INSERT IGNORE INTO alphabetic (createdAt, createdByUser, studentId, testId) VALUES ${alphabeticPlaceholders}`;
        const alphabeticFlatValues = alphabeticLinksToSave.flat();
        await conn.query(alphabeticQuery, alphabeticFlatValues);
      }

      if (statusesToSave.length > 0) {

        const statusPlaceholders = statusesToSave.map(() => '(?, ?, ?, ?, NOW(), ?)').join(', ');
        const statusQuery = `
          INSERT INTO student_test_status
          (active, testId, studentClassroomId, observation, createdAt, createdByUser)
          VALUES ${statusPlaceholders}
          ON DUPLICATE KEY UPDATE
                               updatedAt = NOW(),
                               updatedByUser = VALUES(createdByUser)
      `;
        const statusFlatValues = statusesToSave.flat();
        await conn.query(statusQuery, statusFlatValues);
      }

      if (questionsToSave.length > 0) {

        const questionPlaceholders = questionsToSave.map(() => '(?, ?, ?, NOW(), ?)').join(', ');
        const questionQuery =
          `
          INSERT INTO student_question 
          (answer, testQuestionId, studentId, createdAt, createdByUser)
          VALUES ${questionPlaceholders}
          ON DUPLICATE KEY UPDATE
                               updatedAt = NOW(),
                               updatedByUser = VALUES(createdByUser)
        `;
        const questionFlatValues = questionsToSave.flat();
        await conn.query(questionQuery, questionFlatValues);
      }

      await conn.commit();

      return addNames ? addedNames.filter(name => name) : undefined;
    }
    catch (error) { if(conn){ await conn.rollback() } console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async getStudentsQuestionsSql(test: Test, testQuestions: TestQuestion[], classroomId: number, yearName: string, studentClassroomId: number | null) {
    let conn;

    try {
      conn = await connectionPool.getConnection();

      const testQuestionsIds = testQuestions.map(testQuestion => testQuestion.id);

      const query = `
      SELECT 
        studentClassroom.id as sc_id,
        studentClassroom.startedAt as sc_startedAt,
        studentClassroom.endedAt as sc_endedAt,
        studentClassroom.rosterNumber as sc_rosterNumber,
        
        student.id as student_id,
        student.ra as student_ra,
        student.dv as student_dv,
        student.observationOne as student_observationOne,
        student.observationTwo as student_observationTwo,
        student.active as student_active,
        
        person.id as person_id,
        person.name as person_name,
        person.birth as person_birth,
        
        classroom.id as classroom_id,
        classroom.name as classroom_name,
        classroom.shortName as classroom_shortName,
        
        school.id as school_id,
        school.name as school_name,
        school.shortName as school_shortName,
        school.inep as school_inep,
        school.active as school_active,
        
        studentStatus.id as studentStatus_id,
        studentStatus.active as studentStatus_active,
        studentStatus.observation as studentStatus_observation,
        
        stStatusTest.id as stStatusTest_id,
        stStatusTest.name as stStatusTest_name,
        stStatusTest.active as stStatusTest_active,
        stStatusTest.hideAnswers as stStatusTest_hideAnswers,
        stStatusTest.createdAt as stStatusTest_createdAt,
        stStatusTest.updatedAt as stStatusTest_updatedAt,
        stStatusTest.createdByUser as stStatusTest_createdByUser,
        stStatusTest.updatedByUser as stStatusTest_updatedByUser,
        
        period.id as period_id,
        
        studentQuestions.id as sq_id,
        studentQuestions.answer as sq_answer,
        studentQuestions.score as sq_score,
        
        rClassroom.id as rClassroom_id,
        rClassroom.name as rClassroom_name,
        rClassroom.shortName as rClassroom_shortName,
        
        testQuestion.id as tq_id,
        testQuestion.order as tq_order,
        testQuestion.answer as tq_answer,
        testQuestion.active as tq_active,
        testQuestion.createdAt as tq_createdAt,
        testQuestion.updatedAt as tq_updatedAt,
        testQuestion.createdByUser as tq_createdByUser,
        testQuestion.updatedByUser as tq_updatedByUser,
        
        questionGroup.id as qg_id,
        
        studentDisabilities.id as sd_id,
        studentDisabilities.startedAt as sd_startedAt,
        studentDisabilities.endedAt as sd_endedAt,
        
        disability.id as disability_id,
        disability.name as disability_name,
        disability.official as disability_official
        
      FROM student_classroom as studentClassroom
      
      LEFT JOIN student ON student.id = studentClassroom.studentId
      
      LEFT JOIN student_test_status as studentStatus 
        ON studentStatus.studentClassroomId = studentClassroom.id
        AND studentStatus.testId = ?
      
      LEFT JOIN test as stStatusTest 
        ON stStatusTest.id = studentStatus.testId
      
      LEFT JOIN period ON period.id = stStatusTest.periodId
      
      INNER JOIN year ON year.id = studentClassroom.yearId
      
      INNER JOIN person ON person.id = student.personId
      
      INNER JOIN classroom ON classroom.id = studentClassroom.classroomId
      
      INNER JOIN school ON school.id = classroom.schoolId
      
      LEFT JOIN student_question as studentQuestions 
        ON studentQuestions.studentId = student.id
      
      LEFT JOIN classroom as rClassroom 
        ON rClassroom.id = studentQuestions.rClassroomId
      
      LEFT JOIN test_question as testQuestion 
        ON testQuestion.id = studentQuestions.testQuestionId
        AND testQuestion.id IN (${testQuestionsIds.join(',')})
      
      LEFT JOIN question_group as questionGroup 
        ON questionGroup.id = testQuestion.questionGroupId
      
      LEFT JOIN test ON test.id = testQuestion.testId
      
      LEFT JOIN student_disability as studentDisabilities 
        ON studentDisabilities.studentId = student.id
        AND studentDisabilities.endedAt IS NULL
      
      LEFT JOIN disability 
        ON disability.id = studentDisabilities.disabilityId
      
      WHERE studentClassroom.classroomId = ?
        ${studentClassroomId ? 'AND studentClassroom.id = ?' : ''}
        ${test.category.id === TEST_CATEGORIES_IDS.AVL_ITA ? 'AND studentStatus.active = ?' : ''}
        AND (
          studentClassroom.startedAt <= ?
          OR
          (studentClassroom.endedAt IS NULL AND studentStatus.id IS NULL)
          OR
          studentStatus.id IS NOT NULL
        )
        AND NOT EXISTS (
          SELECT 1
          FROM student_test_status sts_other
          INNER JOIN student_classroom sc_other ON sts_other.studentClassroomId = sc_other.id
          WHERE sts_other.testId = ?
            AND sc_other.studentId = student.id
            AND sc_other.classroomId != ?
        )
        AND testQuestion.testId = ?
        AND year.name = ?
        AND period.id = ?
      
      ORDER BY 
        questionGroup.id ASC,
        testQuestion.order ASC,
        studentClassroom.rosterNumber ASC,
        person.name ASC
    `;

      const params: any[] = [test.id, classroomId];

      if (studentClassroomId) { params.push(studentClassroomId) }

      if (test.category.id === TEST_CATEGORIES_IDS.AVL_ITA) { params.push(true) }

      params.push(
        test.createdAt,
        test.id,
        classroomId,
        test.id,
        yearName,
        test.period.id
      );

      const [rows] = await conn.query(query, params);

      return Helper.studentQuestions(test, rows as Array<{[key:string]:any}>)
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async stuClassReadFSql(test: Test, classroomId: number, yearName: string, studentClassroomId: number | null) {
    let conn;

    try {
      conn = await connectionPool.getConnection();

      const query = `
    SELECT 
      studentClassroom.id as sc_id,
      studentClassroom.startedAt as sc_startedAt,
      studentClassroom.endedAt as sc_endedAt,
      studentClassroom.rosterNumber as sc_rosterNumber,
      studentClassroom.studentId as sc_studentId,
      
      student.id as student_id,
      student.ra as student_ra,
      student.dv as student_dv,
      student.observationOne as student_observationOne,
      student.observationTwo as student_observationTwo,
      student.active as student_active,
      
      person.id as person_id,
      person.name as person_name,
      person.birth as person_birth,
      
      readingFluency.id as rf_id,
      readingFluency.testId as rf_testId,
      
      readingFluencyExam.id as rfExam_id,
      readingFluencyExam.name as rfExam_name,
      readingFluencyExam.color as rfExam_color,
      
      readingFluencyLevel.id as rfLevel_id,
      readingFluencyLevel.name as rfLevel_name,
      readingFluencyLevel.color as rfLevel_color,
      
      rClassroom.id as rClassroom_id,
      rClassroom.name as rClassroom_name,
      rClassroom.shortName as rClassroom_shortName
      
    FROM student_classroom as studentClassroom
    
    LEFT JOIN year ON year.id = studentClassroom.yearId
    LEFT JOIN student ON student.id = studentClassroom.studentId
    LEFT JOIN person ON person.id = student.personId
    
    LEFT JOIN student_test_status as sts
      ON sts.studentClassroomId = studentClassroom.id
      AND sts.testId = ?
    
    LEFT JOIN reading_fluency as readingFluency 
      ON readingFluency.studentId = student.id
     AND readingFluency.testId = ?
    
    LEFT JOIN reading_fluency_exam as readingFluencyExam 
      ON readingFluencyExam.id = readingFluency.readingFluencyExamId
    
    LEFT JOIN reading_fluency_level as readingFluencyLevel 
      ON readingFluencyLevel.id = readingFluency.readingFluencyLevelId
    
    LEFT JOIN classroom as rClassroom 
      ON rClassroom.id = readingFluency.rClassroomId
    
    WHERE studentClassroom.classroomId = ?
      ${studentClassroomId ? 'AND studentClassroom.id = ?' : ''}
      AND year.name = ?
      AND (
        -- Matrícula ativa: sempre exibe
        studentClassroom.endedAt IS NULL
        OR 
        -- Matrícula encerrada: só exibe se tem student_test_status NESTA sala
        (studentClassroom.endedAt IS NOT NULL AND sts.id IS NOT NULL)
      )
      -- Exclui alunos que fizeram prova em outra sala
      AND NOT EXISTS (
        SELECT 1
        FROM reading_fluency rf_other
        WHERE rf_other.studentId = student.id
          AND rf_other.testId = ?
          AND rf_other.rClassroomId IS NOT NULL
          AND rf_other.rClassroomId != ?
          AND (rf_other.readingFluencyExamId IS NOT NULL OR rf_other.readingFluencyLevelId IS NOT NULL)
      )
  `;

      const params: any[] = [test.id, test.id, classroomId];

      if (studentClassroomId) { params.push(studentClassroomId) }

      params.push(yearName);
      params.push(test.id);      // Para o NOT EXISTS
      params.push(classroomId);  // Para o NOT EXISTS

      const [rows] = await conn.query(query, params);

      return Helper.readingFluency(rows as Array<{[key:string]:any}>)
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async updateStudentTestStatus(testId: number, classroomId: number, yearName: string, userId: number): Promise<void> {
    let conn;

    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      const query = `
      SELECT
          sts.id AS sts_id,
          sts.studentClassroomId AS current_sc_id,
          sc_current.studentId,
          sc_current.classroomId AS current_classroom_id,
          sc_active.id AS active_sc_id,
          sc_active.classroomId AS active_classroom_id,
          (SELECT COUNT(*) 
           FROM student_question sq
           INNER JOIN test_question tq ON sq.testQuestionId = tq.id
           WHERE sq.studentId = sc_current.studentId
             AND tq.testId = ?
             AND sq.answer IS NOT NULL
             AND sq.answer != ''
          ) AS has_any_answers
      FROM student_test_status sts
      INNER JOIN student_classroom sc_current 
        ON sts.studentClassroomId = sc_current.id
      INNER JOIN year y_current 
        ON sc_current.yearId = y_current.id
      INNER JOIN student_classroom sc_active 
        ON sc_current.studentId = sc_active.studentId
        AND sc_active.endedAt IS NULL
      INNER JOIN year y_active 
        ON sc_active.yearId = y_active.id
      WHERE sts.testId = ?
        AND y_current.name = ?
        AND y_active.name = ?
        AND (
          sc_active.classroomId = ?
          OR sc_current.classroomId = ?
        )
        AND sts.studentClassroomId != sc_active.id
    `;

      const [results] = await conn.query(query, [
        testId,
        testId,
        yearName,
        yearName,
        classroomId,
        classroomId
      ]) as [any[], any];

      for (const row of results) {
        const hasAnyAnswers = row.has_any_answers > 0;

        if (!hasAnyAnswers) {
          await conn.query(
            `UPDATE student_test_status
           SET studentClassroomId = ?, updatedAt = NOW(), updatedByUser = ?
           WHERE id = ?`,
            [row.active_sc_id, userId, row.sts_id]
          );
        }
      }

      await conn.commit();
    }
    catch (error) { if (conn) await conn.rollback(); throw error }
    finally { if (conn) conn.release() }
  }

  async cleanupOrphanedReadingFluencyRecords(testId: number, classroomId: number, yearName: string): Promise<void> {
    let conn;

    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      const findOrphansQuery = `
      SELECT 
        sts.id AS student_test_status_id,
        sc.studentId,
        sc.id AS student_classroom_id
      FROM student_test_status sts
      INNER JOIN student_classroom sc ON sts.studentClassroomId = sc.id
      INNER JOIN year y ON sc.yearId = y.id
      WHERE sts.testId = ?
        AND sc.classroomId = ?
        AND y.name = ?
        AND sc.endedAt IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM reading_fluency rf
          WHERE rf.studentId = sc.studentId
            AND rf.testId = ?
            AND rf.rClassroomId = ?
            AND (rf.readingFluencyExamId IS NOT NULL OR rf.readingFluencyLevelId IS NOT NULL)
        )
    `;

      const [orphans] = await conn.query(findOrphansQuery, [testId, classroomId, yearName, testId, classroomId]) as any[];

      if (orphans.length === 0) { await conn.commit(); return }

      const studentTestStatusIds = orphans.map((o: any) => o.student_test_status_id);
      const studentIds = orphans.map((o: any) => o.studentId);

      if (studentTestStatusIds.length > 0) {
        await conn.query(
          `DELETE FROM student_test_status WHERE id IN (?)`,
          [studentTestStatusIds]
        );
      }

      if (studentIds.length > 0) {
        await conn.query(
          `DELETE FROM reading_fluency 
         WHERE studentId IN (?) 
           AND testId = ?
           AND (rClassroomId IS NULL OR rClassroomId = ?)
           AND (readingFluencyExamId IS NULL OR readingFluencyLevelId IS NULL)`,
          [studentIds, testId, classroomId]
        );
      }

      await conn.commit();
    }
    catch (error) { if (conn) await conn.rollback(); console.error('Erro em cleanupOrphanedReadingFluencyRecords:', error); throw error }
    finally { if (conn) conn.release() }
  }

  async getReadingFluencyStudentsSql(test: Test, classroomId: number, yearName: string, studentClassroomId: number | null) {
    let conn;

    try {
      conn = await connectionPool.getConnection();

      const query = `
      SELECT 
        studentClassroom.id as sc_id,
        studentClassroom.startedAt as sc_startedAt,
        studentClassroom.endedAt as sc_endedAt,
        studentClassroom.rosterNumber as sc_rosterNumber,
        
        student.id as student_id,
        student.ra as student_ra,
        student.dv as student_dv,
        student.observationOne as student_observationOne,
        student.observationTwo as student_observationTwo,
        student.active as student_active,
        
        person.id as person_id,
        person.name as person_name,
        person.birth as person_birth,
        
        classroom.id as classroom_id,
        classroom.name as classroom_name,
        classroom.shortName as classroom_shortName,
        
        year.id as year_id,
        year.name as year_name,
        
        studentStatus.id as studentStatus_id,
        studentStatus.active as studentStatus_active,
        studentStatus.observation as studentStatus_observation,
        
        stStatusTest.id as stStatusTest_id,
        stStatusTest.name as stStatusTest_name,
        stStatusTest.active as stStatusTest_active,
        stStatusTest.hideAnswers as stStatusTest_hideAnswers,
        stStatusTest.createdAt as stStatusTest_createdAt,
        stStatusTest.updatedAt as stStatusTest_updatedAt,
        stStatusTest.createdByUser as stStatusTest_createdByUser,
        stStatusTest.updatedByUser as stStatusTest_updatedByUser,
        stStatusTest.periodId as stStatusTest_periodId,
        
        readingFluency.id as rf_id,
        
        readingFluencyExam.id as rfExam_id,
        readingFluencyExam.name as rfExam_name,
        readingFluencyExam.color as rfExam_color,
        
        readingFluencyLevel.id as rfLevel_id,
        readingFluencyLevel.name as rfLevel_name,
        readingFluencyLevel.color as rfLevel_color,
        
        rClassroom.id as rClassroom_id,
        rClassroom.name as rClassroom_name,
        rClassroom.shortName as rClassroom_shortName,
        
        stReadFluenTest.id as stReadFluenTest_id,
        
        studentDisabilities.id as sd_id,
        studentDisabilities.startedAt as sd_startedAt,
        studentDisabilities.endedAt as sd_endedAt,
        
        disability.id as disability_id,
        disability.name as disability_name,
        disability.official as disability_official
        
      FROM student_classroom as studentClassroom
      
      LEFT JOIN student ON student.id = studentClassroom.studentId
      LEFT JOIN year ON year.id = studentClassroom.yearId
      LEFT JOIN person ON person.id = student.personId
      LEFT JOIN classroom ON classroom.id = studentClassroom.classroomId
      
      LEFT JOIN student_test_status as studentStatus 
        ON studentStatus.studentClassroomId = studentClassroom.id
        AND studentStatus.testId = ?
      
      LEFT JOIN reading_fluency as readingFluency 
        ON readingFluency.studentId = student.id
        AND readingFluency.testId = ?
      
      LEFT JOIN classroom as rClassroom 
        ON rClassroom.id = readingFluency.rClassroomId
      
      LEFT JOIN reading_fluency_exam as readingFluencyExam 
        ON readingFluencyExam.id = readingFluency.readingFluencyExamId
      
      LEFT JOIN reading_fluency_level as readingFluencyLevel 
        ON readingFluencyLevel.id = readingFluency.readingFluencyLevelId
      
      LEFT JOIN test as stStatusTest 
        ON stStatusTest.id = studentStatus.testId
      
      LEFT JOIN test as stReadFluenTest 
        ON stReadFluenTest.id = readingFluency.testId
      
      LEFT JOIN student_disability as studentDisabilities 
        ON studentDisabilities.studentId = student.id
        AND studentDisabilities.endedAt IS NULL
      
      LEFT JOIN disability 
        ON disability.id = studentDisabilities.disabilityId
      
      WHERE studentClassroom.classroomId = ?
        ${studentClassroomId ? 'AND studentClassroom.id = ?' : ''}
        AND year.name = ?
        AND (
          studentClassroom.endedAt IS NULL
          OR 
          (studentClassroom.endedAt IS NOT NULL 
           AND studentStatus.id IS NOT NULL
           AND EXISTS (
             SELECT 1
             FROM reading_fluency rf_check
             WHERE rf_check.studentId = student.id
               AND rf_check.testId = ?
               AND rf_check.rClassroomId = ?
               AND (rf_check.readingFluencyExamId IS NOT NULL OR rf_check.readingFluencyLevelId IS NOT NULL)
           ))
        )
        AND NOT EXISTS (
          SELECT 1
          FROM reading_fluency rf_other
          WHERE rf_other.studentId = student.id
            AND rf_other.testId = ?
            AND rf_other.rClassroomId IS NOT NULL
            AND rf_other.rClassroomId != ?
            AND (rf_other.readingFluencyExamId IS NOT NULL OR rf_other.readingFluencyLevelId IS NOT NULL)
        )
      
      ORDER BY 
        studentClassroom.rosterNumber ASC,
        person.name ASC
    `;

      const params: any[] = [test.id, test.id, classroomId];

      if (studentClassroomId) { params.push(studentClassroomId) }

      params.push(yearName);
      params.push(test.id);       // Para o EXISTS (verifica se tem dados nesta sala)
      params.push(classroomId);   // Para o EXISTS (verifica se tem dados nesta sala)
      params.push(test.id);       // Para o NOT EXISTS
      params.push(classroomId);   // Para o NOT EXISTS

      const [rows] = await conn.query(query, params);

      return Helper.readingFluencyStudents(rows as Array<{[key:string]:any}>, test)
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async linkReadingSql(headers: qReadingFluenciesHeaders[], studentClassrooms: ObjectLiteral[], test: Test, userId: number, classroomId: number, yearName: string) {
    let conn;

    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      if (studentClassrooms.length === 0) { await conn.commit(); return }

      const studentIds = studentClassrooms.map(row => row?.student?.id ?? row?.student_id);

      const checkAllExistingQuery = `
      SELECT 
        sts.id, 
        sts.studentClassroomId, 
        sc_sts.classroomId, 
        sc_sts.endedAt,
        sc_sts.studentId,
        (SELECT COUNT(*)
         FROM reading_fluency rf
         WHERE rf.studentId = sc_sts.studentId
           AND rf.testId = ?
           AND rf.rClassroomId IS NOT NULL
           AND (rf.readingFluencyExamId IS NOT NULL OR rf.readingFluencyLevelId IS NOT NULL)
        ) AS has_reading_fluency_filled
      FROM student_test_status sts
      INNER JOIN student_classroom sc_sts ON sts.studentClassroomId = sc_sts.id
      WHERE sts.testId = ?
        AND sc_sts.studentId IN (?)
    `;

      const [allExisting] = await conn.query(checkAllExistingQuery, [test.id, test.id, studentIds]) as any[];

      const existingByStudent = allExisting.reduce((acc: any, item: any) => {
        if (!acc[item.studentId]) acc[item.studentId] = [];
        acc[item.studentId].push(item);
        return acc;
      }, {});

      const toDelete: number[] = [];
      const toUpdate: Array<{id: number, newStudentClassroomId: number}> = [];
      const toInsert: Array<{testId: number, studentClassroomId: number}> = [];

      for (let row of studentClassrooms) {
        const studentClassroomId = row.id;
        const studentId = row?.student?.id ?? row?.student_id;

        const existingForStudent = existingByStudent[studentId] || [];
        const inOtherRoom = existingForStudent.find((e: any) => e.classroomId !== classroomId);
        const inCurrentRoom = existingForStudent.find((e: any) => e.classroomId === classroomId);

        if (inOtherRoom) {
          const hasReadingFluencyFilled = inOtherRoom.has_reading_fluency_filled > 0;

          if (hasReadingFluencyFilled) { continue }
          else if (inOtherRoom.endedAt !== null) {
            if (inCurrentRoom) { toDelete.push(inCurrentRoom.id) }
            toUpdate.push({ id: inOtherRoom.id, newStudentClassroomId: studentClassroomId });
            continue;
          }
        }

        if (!inCurrentRoom) { toInsert.push({ testId: test.id, studentClassroomId }) }
      }

      if (toDelete.length > 0) { await conn.query(`DELETE FROM student_test_status WHERE id IN (?)`, [toDelete]) }

      if (toUpdate.length > 0) {
        const updateCases = toUpdate.map(u => `WHEN id = ${u.id} THEN ${u.newStudentClassroomId}`).join(' ');

        const updateIds = toUpdate.map(u => u.id);

        const query = `UPDATE student_test_status SET studentClassroomId = CASE ${updateCases} END, updatedAt = NOW(), updatedByUser = ? WHERE id IN (?)`
        await conn.query(query, [userId, updateIds]);
      }

      if (toInsert.length > 0) {
        const insertValues = toInsert.map(() => '(?, ?, ?, ?, NOW(), ?)').join(', ');
        const insertParams = toInsert.flatMap(item =>
          [item.testId, item.studentClassroomId, true, '', userId]
        );

        await conn.query(`
        INSERT INTO student_test_status
        (testId, studentClassroomId, active, observation, createdAt, createdByUser)
        VALUES ${insertValues}
      `, insertParams);
      }

      const readingFluencyValues: any[] = [];
      const readingFluencyParams: any[] = [];

      for (let row of studentClassrooms) {
        const studentId = row?.student?.id ?? row?.student_id;

        for (let exam of headers) {
          readingFluencyValues.push('(?, ?, ?, NOW(), ?)');
          readingFluencyParams.push(exam.readingFluencyExamId, test.id, studentId, userId);
        }
      }

      if (readingFluencyValues.length > 0) {
        await conn.query(
          `INSERT INTO reading_fluency
             (readingFluencyExamId, testId, studentId, createdAt, createdByUser)
         VALUES ${readingFluencyValues.join(', ')}
         ON DUPLICATE KEY UPDATE
                              updatedAt = NOW(),
                              updatedByUser = VALUES(createdByUser)`,
          readingFluencyParams
        );
      }

      await conn.commit();
    }
    catch (error) { if (conn) { await conn.rollback() }throw error }
    finally { if (conn) { conn.release() } }
  }

  async qNewTraining(yearId: number, category: number, month: number, meeting: number, createdByUser: number, classroom?: number, discipline?: number, observation?: string) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();
      const insertQuery = `
          INSERT INTO training (yearId, categoryId, monthReferenceId, meetingId, classroom, createdByUser, updatedByUser, disciplineId, observation)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE observation = VALUES(observation), updatedByUser = VALUES(updatedByUser)
      `;
      const [queryResult] = await conn.query<ResultSetHeader>(format(insertQuery), [yearId, category, month, meeting, classroom, createdByUser, createdByUser, discipline || null, observation || null])
      await conn.commit();
      return queryResult;
    }
    catch (error) { if(conn){ await conn.rollback() } console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qAlphabeticHeaders(yearName: string) {
    let conn;
    try {
      conn = await connectionPool.getConnection();

      const qYear = `
        SELECT year.id, year.name, period.id AS period_id, bimester.id AS bimester_id, bimester.name AS bimester_name, bimester.testName AS bimester_testName
        FROM year
            INNER JOIN period ON period.yearId = year.id
            INNER JOIN bimester ON period.bimesterId = bimester.id
        WHERE year.name = ?
      `;
      const qAlphabeticLevels = `
        SELECT al.id, al.shortName, al.color
        FROM alphabetic_level AS al
      `;

      const [[qYearResult], [qAlphaLevelsResult]] = await Promise.all([conn.query(format(qYear), [yearName]), conn.query(format(qAlphabeticLevels), [])]);

      let year = Helper.alphabeticYearHeader(qYearResult as qYear[]);
      const alphabeticLevels = qAlphaLevelsResult as qAlphabeticLevels[];

      return year.periods.flatMap(period => ({ ...period.bimester, levels: alphabeticLevels }));
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qLastRegister(studentId: number, yearId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
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
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qStudentDisabilities(arr: { [key: string]: any }[]) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const studentIds = arr.map(item => item.student.id).filter(id => id);

      if (studentIds.length === 0) { return arr }

      const placeholders = studentIds.map(() => '?').join(',');
      const query = `
      SELECT 
        sd.id, sd.studentId, sd.startedAt, sd.endedAt, 
        d.id as disability_id, d.name as disability_name, d.official as disability_official
      FROM student_disability AS sd
      INNER JOIN disability AS d ON sd.disabilityId = d.id
      WHERE sd.studentId IN (${placeholders}) AND sd.endedAt IS NULL
    `;

      const [queryResult] = await conn.query(query, studentIds);

      return Helper.studentDisabilities(queryResult as Array<any>, arr);
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qCurrentYear() {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query =

        `
        SELECT *
        FROM year
        WHERE year.endedAt IS NULL AND year.active = 1
      `

      const [ queryResult ] = await conn.query(format(query))
      return (queryResult as qYear[])[0]
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qNotTestIncluded(yearName: string, classroomId: number, testId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
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
            AND NOT EXISTS (
              SELECT 1
              FROM student_question AS sq
                       INNER JOIN test_question AS tq ON sq.testQuestionId = tq.id
              WHERE sq.studentId = sc.studentId
                AND tq.testId = ?
                AND sq.rClassroomId IS NOT NULL
          )
      `;

      const [queryResult] = await conn.query(format(query), [
        yearName,
        classroomId,
        testId,
        testId
      ]);
      return queryResult as { id: number, student_id: number, name: string, ra: string, dv: string }[];
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qActiveSc(studentId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
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
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qNewStudentClassroom(studentId: number, classroomId: number, yearId: number, createdByUser: number, rosterNumber: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();
      const insertQuery = `INSERT INTO student_classroom (studentId, classroomId, yearId, rosterNumber, startedAt, createdByUser) VALUES (?, ?, ?, ?, NOW(), ?)`
      const [ queryResult ] = await conn.query(format(insertQuery), [studentId, classroomId, yearId, rosterNumber, createdByUser])
      await conn.commit()
      return queryResult as { fieldCount: number, affectedRows: number, insertId: number, info: string, serverStatus: number, warningStatus: number, changedRows: number }
    }
    catch (error) { if(conn){ await conn.rollback() } console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qNewTransfer(requesterId: number, requestedClassroomId: number, currentClassroomId: number, receiverId: number, studentId: number, yearId: number, createdByUser: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();
      const insertQuery = `
          INSERT INTO transfer (startedAt, endedAt, requesterId, requestedClassroomId, currentClassroomId, receiverId, studentId, statusId, yearId, createdByUser)
          VALUES (NOW(), NOW(), ?, ?, ?, ?, ?, ?, ?, ?)
      `
      const [ queryResult ] = await conn.query(format(insertQuery), [requesterId, requestedClassroomId, currentClassroomId, receiverId, studentId, 1, yearId, createdByUser])
      await conn.commit()
      return queryResult as { fieldCount: number, affectedRows: number, insertId: number, info: string, serverStatus: number, warningStatus: number, changedRows: number }
    }
    catch (error) { if(conn){ await conn.rollback() } console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qCurrentStudentClassroom(studentId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query = `
        SELECT *
        FROM student_classroom sc
        WHERE sc.studentId = ? 
        AND sc.endedAt IS NULL 
        LIMIT 1;
      `
      const [ queryResult ] = await conn.query(query, [ studentId ])
      return (queryResult as StudentClassroom[])[0]
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qTestByStudentId<T>(studentId: number, yearName: number | string, search: string, limit: number, offset: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const testSearch = `%${search.toString().toUpperCase()}%`

      const query =
        `
            SELECT DISTINCT
                sts.id AS studentTestStatusId,
                sts.active AS active,
                sc.id AS studentClassroomId,
                t.id AS testId,
                sc.studentId,
                sc.startedAt,
                sc.endedAt,
                t.name AS testName,
                t.createdAt AS testCreatedAt,
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
              AND t.active = 1
              AND t.name LIKE ?
              AND (
                -- Teste em andamento (ainda pode ser realizado)
                (sts.id IS NOT NULL AND sts.active = 1)
                    OR
                    -- Teste não iniciado E aluno está atualmente na turma E não fez em nenhuma outra sala
                (sts.id IS NULL AND sc.endedAt IS NULL AND sc.startedAt <= t.createdAt AND NOT EXISTS (
                    SELECT 1
                    FROM student_test_status sts_check
                    WHERE sts_check.testId = t.id
                      AND sts_check.studentClassroomId IN (
                        SELECT sc_check.id
                        FROM student_classroom sc_check
                        WHERE sc_check.studentId = ?
                    )
                ))
                )
            ORDER BY
                CASE WHEN sts.id IS NULL THEN 0 ELSE 1 END,
                testCreatedAt DESC
            LIMIT ?
                OFFSET ?
        `

      const [ queryResult ] = await conn.query(query, [ studentId, yearName, testSearch, studentId, limit, offset ])

      return queryResult as T[]
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qFilteredTestByStudentId<T>(studentId: number, testId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query =
        `
            SELECT
                sts.id AS studentTestStatusId,
                sts.active,
                sc.id AS studentClassroomId,
                sc.studentId,
                t.id AS testId,
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
              AND (
                -- Teste já foi iniciado/realizado nesta turma
                sts.id IS NOT NULL
                    OR
                    -- Teste não realizado E aluno está atualmente na turma E não fez em nenhuma outra sala
                (sts.id IS NULL AND sc.endedAt IS NULL AND sc.startedAt <= t.createdAt AND NOT EXISTS (
                    SELECT 1
                    FROM student_test_status sts_check
                             INNER JOIN student_classroom sc_check ON sts_check.studentClassroomId = sc_check.id
                    WHERE sts_check.testId = t.id
                      AND sc_check.studentId = ?
                ))
                )
            ORDER BY
                CASE WHEN sts.id IS NOT NULL THEN 0 ELSE 1 END,
                CASE WHEN sc.endedAt IS NULL THEN 0 ELSE 1 END,
                sc.endedAt DESC
            LIMIT 1
        `

      const [ queryResult ] = await conn.query(format(query), [studentId, testId, studentId])

      return (queryResult as { studentTestStatusId: number, active: boolean, studentClassroomId: number, classroomId: number, classroomName: string, schoolName: string }[])[0]
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qTeacherDisciplines(userId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
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
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qTeacherClassrooms(userId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
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
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qTransferStatus(statusId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
      const query =

        `
          SELECT *
          FROM transfer_status AS ts
          WHERE ts.id = ?
      `

      const [ queryResult ] = await conn.query(format(query), [statusId])
      return (queryResult as qTransferStatus[])[0]
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qEndAllTeacherRelations(teacherId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      const updateQuery = `UPDATE teacher_class_discipline SET endedAt = NOW() where teacherId = ?;`

      const [ queryResult ] = await conn.query(format(updateQuery), [teacherId])

      await conn.commit()

      return queryResult
    }
    catch (error) { if(conn) await conn.rollback(); console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qStudentByRa(ra: string, dv: string) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
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
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qTestById(testId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const [ queryResult ] = await conn.query(format(`SELECT * FROM test WHERE id = ?`), [testId])
      return (queryResult as Test[])[0]
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qTeacherByUser(userId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
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

      return Helper.userTeacher(data)
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qUpsertTrainingTeacher(teacherId: number, trainingId: number, statusId: number, userId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
      await conn.beginTransaction();
      const query = `
        INSERT INTO training_teacher (teacherId, trainingId, statusId, createdAt, createdByUser, updatedAt, updatedByUser)
        VALUES (?, ?, ?, NOW(), ?, NOW(), ?)
        ON DUPLICATE KEY UPDATE
                             statusId = VALUES(statusId),
                             updatedAt = NOW(),
                             updatedByUser = VALUES(updatedByUser)
    `;

      const [result] = await conn.query<ResultSetHeader>(query, [teacherId, trainingId, statusId, userId, userId]);

      await conn.commit()

      return result;
    }
    catch (error) { if(conn) await conn.rollback(); console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qUpsertTrainingTeacherObs(teacherId: number, trainingId: number, observation: string, userId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
      await conn.beginTransaction();
      const query = `
        INSERT INTO training_teacher (teacherId, trainingId, observation, createdAt, createdByUser, updatedAt, updatedByUser)
        VALUES (?, ?, ?, NOW(), ?, NOW(), ?)
        ON DUPLICATE KEY UPDATE
                             observation = VALUES(observation),
                             updatedAt = NOW(),
                             updatedByUser = VALUES(updatedByUser)
    `;

      const [result] = await conn.query<ResultSetHeader>(query, [teacherId, trainingId, observation, userId, userId]);
      await conn.commit();
      return result;
    }
    catch (error) { if(conn) await conn.rollback(); console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qUpdateTraining(id: number, meeting: number, category: number, month: number, updatedByUser: number, classroom?: number, discipline?: number, observation?: string) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
      await conn.beginTransaction();
      const updateQuery = `
      UPDATE training 
      SET meetingId = ?, categoryId = ?, monthReferenceId = ?, classroom = ?, disciplineId = ?, observation = ?, updatedByUser = ?
      WHERE id = ?
    `;

      const [queryResult] = await conn.query<ResultSetHeader>(updateQuery, [meeting, category, month, classroom, discipline || null, observation || null, updatedByUser, id]);
      await conn.commit();
      return queryResult;
    }
    catch (error) { if(conn) await conn.rollback(); console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qAggregateTest(yearName: string, classroom: number, bimesterId: number, categoryId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
      const likeClassroom = `%${classroom}%`

      const query = `
        SELECT DISTINCT(t.id), tcat.id AS categoryId, tcat.name AS category, b.name AS bimester, y.name AS year, t.name AS testName, d.name AS disciplineName, t.createdAt
        FROM test_classroom AS tc
        INNER JOIN classroom AS c ON tc.classroomId = c.id
        INNER JOIN test AS t ON tc.testId = t.id
        INNER JOIN discipline AS d ON t.disciplineId = d.id
        INNER JOIN test_category AS tcat ON tcat.id = t.categoryId
        INNER JOIN period AS p ON t.periodId = p.id
        INNER JOIN bimester AS b ON p.bimesterId = b.id
        INNER JOIN year AS y ON p.yearId = y.id
        WHERE y.name = ? AND c.shortName like ? AND p.bimesterId = ?
        ORDER BY t.createdAt ASC, d.name ASC;    
      `

      const [ queryResult ] = await conn.query(format(query), [yearName, likeClassroom, bimesterId])
      return queryResult as { id: number, categoryId: number, category: string, bimester: string, year: string, testName: string, disciplineName: string }[];
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qSetInactiveStudentTest(studentClassroomId: number, testId: number, classroomId: number, userId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
      await conn.beginTransaction();
      const updateQuery = `
        UPDATE student_test_status sts
            INNER JOIN student_classroom sc ON sts.studentClassroomId = sc.id
            SET sts.active = 0,
                sts.updatedByUser = ?,
                sts.updatedAt = NOW()
        WHERE sts.studentClassroomId = ?
          AND sts.testId = ?
          AND sc.classroomId = ?
    `;

      const [queryResult] = await conn.query(format(updateQuery), [userId, studentClassroomId, testId, classroomId]);
      await conn.commit();
      return queryResult;
    }
    catch (error) { if(conn) await conn.rollback(); console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qAllTeachersForSuperUser(search: string) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
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

      return Helper.superUsers(queryResult as { [key: string]: any }[])
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qTeacherThatBelongs(classroomsIds: number[], search: string) {
    if (!classroomsIds || classroomsIds.length === 0) { return [] }
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const personSearch = `%${search.toString().toUpperCase()}%`;

      const query = `
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
            AND tcd.classroomId IN (?)
            AND tcd.endedAt IS NULL
      )
        AND p.name LIKE ?
      ORDER BY p.name
    `;

      const [queryResult] = await conn.query(query, [classroomsIds, personSearch]);

      return Helper.teacher(queryResult as { [key: string]: any }[])
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qTeacherThatNotBelongs(classroomsIds: number[], categoryId: number, search: string) {
    if (!classroomsIds || classroomsIds.length === 0) { return [] }
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const personSearch = `%${search.toString().toUpperCase()}%`;

      const query = `
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
            AND tcd.endedAt IS NULL
      )
        AND pc.id = ?
        AND p.name LIKE ?
      ORDER BY p.name
    `;

      const [queryResult] = await conn.query(query, [classroomsIds, categoryId, personSearch]);

      return Helper.teacher(queryResult as { [key: string]: any }[])
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qState(stateId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
      const query =

        `
        SELECT *
        FROM state
        WHERE state.id = ?
      `

      const [ queryResult ] = await conn.query(format(query), [stateId])
      return (queryResult as qState[])[0]
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qUser(userId: number) {
    let conn
    try {
      conn = await connectionPool.getConnection()
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
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qTestClassroom(testId: number, classroomId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
      const query =

        `
        SELECT *
        FROM test_classroom AS tc
        WHERE tc.testId = ? AND tc.classroomId = ?
      `

      const [ queryResult ] = await conn.query(format(query), [testId, classroomId])
      return (queryResult as qTestClassroom[])[0]
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qTestByIdAndYear(testId: number, yearName: string) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query =

        `
        SELECT t.id, t.name, t.active, t.hideAnswers, t.createdAt,
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
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qYearByName(yearName: string) {
    let conn;

    try {
      if (!yearName || yearName.trim() === '') { throw new Error('Nome do ano é obrigatório') }

      let year;

      conn = await connectionPool.getConnection();

      const query = `SELECT y.id, y.name FROM year AS y WHERE y.name = ?`;

      const [queryResult] = await conn.query(query, [yearName]);

      if(!(queryResult as qYear[])[0]) { year = await this.qCurrentYear() }
      else { year = (queryResult as qYear[])[0] }

      return year;
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qYearById(yearId: number | string) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query =

        `
        SELECT y.id, y.name
        FROM year AS y
        WHERE y.id = ?
      `

      const [ queryResult ] = await conn.query(query, [yearId])
      return (queryResult as qYear[])[0]
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qSingleRel(teacherId: number, classroomId: number, disciplineId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
      await conn.beginTransaction();

      const insertQuery = `INSERT INTO teacher_class_discipline (startedAt, teacherId, classroomId, disciplineId) VALUES (NOW(), ?, ?, ?)`
      const [ queryResult ] = await conn.query(insertQuery, [teacherId, classroomId, disciplineId])

      await conn.commit()

      return queryResult
    }
    catch (error) { if(conn) await conn.rollback(); console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qClassroom(classroomId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query =

        `
        SELECT c.id, c.name, c.shortName, s.id AS school_id, s.name AS school_name, s.shortName AS school_shortName
        FROM classroom AS c
          INNER JOIN school AS s ON c.schoolId = s.id
        WHERE c.id = ?
      `

      const [ queryResult ] = await conn.query(format(query), [classroomId])

      return Helper.classroom((queryResult as qClassroom[])[0])
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qDiscipline(disciplineId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query =

        `
        SELECT *
        FROM discipline AS d
        WHERE d.id = ?
      `

      const [ queryResult ] = await conn.query(format(query), [disciplineId])

      return (queryResult as Discipline[])[0]
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qTeacher(teacherId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query =

        `
        SELECT *
        FROM teacher AS t
        WHERE t.id = ?
      `

      const [ queryResult ] = await conn.query(format(query), [teacherId])

      return (queryResult as Teacher[])[0]
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qSchools(testId: number) {
    let conn;
    try{

      conn = await connectionPool.getConnection();

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
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qClassroomsByTestId(schoolId: number, testId: number) {
    let conn;
    try {

      conn = await connectionPool.getConnection();

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
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qStudentClassroomsForTest(test: Test, classroomId: number, yearName: string, studentClassroomId: number | null) {
    let conn;
    try{
      conn = await connectionPool.getConnection();
      let responseQuery;

      if(studentClassroomId) {
        const query = `
        SELECT sc.id AS student_classroom_id, sc.startedAt, sc.endedAt,
               s.id AS student_id,
               sts.id AS student_classroom_test_status_id,
               person.name
        FROM student_classroom AS sc
        INNER JOIN year AS y ON sc.yearId = y.id
        INNER JOIN student AS s ON sc.studentId = s.id
        INNER JOIN person ON s.personId = person.id
        LEFT JOIN student_test_status AS sts
          ON sc.id = sts.studentClassroomId
          AND sts.testId = ?
        WHERE sc.classroomId = ?
          AND y.name = ?
          AND sc.id = ?
          AND (
            -- SITUAÇÃO 1: Matriculado antes/no dia do teste
            sc.startedAt <= ?
            OR
            -- Aluno ativo sem sts (entrou depois, ainda não vinculado)
            (sc.endedAt IS NULL AND sts.id IS NULL)
            OR
            -- SITUAÇÃO 2: Tem sts NESTA sala (transferido para cá)
            sts.id IS NOT NULL
          )
          AND NOT EXISTS (
            SELECT 1
            FROM student_test_status sts_other
            INNER JOIN student_classroom sc_other ON sts_other.studentClassroomId = sc_other.id
            WHERE sts_other.testId = ?
              AND sc_other.studentId = s.id
              AND sc_other.classroomId != ?
          )
        ORDER BY sc.rosterNumber
      `;

        const [queryResult] = await conn.query(query, [
          test.id,
          classroomId,
          yearName,
          studentClassroomId,
          test.createdAt,
          test.id,
          classroomId
        ]);
        responseQuery = queryResult as qStudentsClassroomsForTest[];
        return responseQuery
      }

      const query = `
      SELECT sc.id AS student_classroom_id, sc.startedAt, sc.endedAt,
             s.id AS student_id,
             sts.id AS student_classroom_test_status_id,
             person.name
      FROM student_classroom AS sc
      INNER JOIN year AS y ON sc.yearId = y.id
      INNER JOIN student AS s ON sc.studentId = s.id
      INNER JOIN person ON s.personId = person.id
      LEFT JOIN student_test_status AS sts
        ON sc.id = sts.studentClassroomId
        AND sts.testId = ?
      WHERE sc.classroomId = ?
        AND y.name = ?
        AND (
          -- SITUAÇÃO 1: Matriculado antes/no dia do teste
          sc.startedAt <= ?
          OR
          -- Aluno ativo sem sts (entrou depois, ainda não vinculado)
          (sc.endedAt IS NULL AND sts.id IS NULL)
          OR
          -- SITUAÇÃO 2: Tem sts NESTA sala (transferido para cá)
          sts.id IS NOT NULL
        )
        AND NOT EXISTS (
          SELECT 1
          FROM student_test_status sts_other
          INNER JOIN student_classroom sc_other ON sts_other.studentClassroomId = sc_other.id
          WHERE sts_other.testId = ?
            AND sc_other.studentId = s.id
            AND sc_other.classroomId != ?
        )
      ORDER BY sc.rosterNumber
    `;

      const [queryResult] = await conn.query(query, [
        test.id,
        classroomId,
        yearName,
        test.createdAt,
        test.id,
        classroomId
      ]);
      responseQuery = queryResult as qStudentsClassroomsForTest[];
      return responseQuery
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qReadingFluency(testId: number, studentId: number) {
    let conn;
    try {

      conn = await connectionPool.getConnection();

      const query =

        `
        SELECT rf.id, rf.readingFluencyExamId, rf.readingFluencyLevelId, rf.rClassroomId
        FROM reading_fluency AS rf 
        WHERE rf.testId = ? AND rf.studentId = ?
      `

      const [ queryResult ] = await conn.query(format(query), [testId, studentId])
      return queryResult as any[]

    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qReadingFluencyHeaders() {
    let conn;
    try{
      conn = await connectionPool.getConnection();

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
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qAlphabeticTests(categoryId: number, disciplineId: number, yearName: string) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query = `
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
    `;

      const [ queryResult ] = await conn.query(format(query), [categoryId, disciplineId, yearName]);
      return Helper.alphabeticTests(queryResult as qAlphaTests[]);
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qTestQuestionsForMultipleTests(testIds: number[]) {
    if (!testIds || testIds.length === 0) { return new Map() }
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query =
        `
            SELECT
                tq.id AS test_question_id,
                tq.testId AS test_id,
                tq.order AS test_question_order,
                tq.answer AS test_question_answer,
                tq.active AS test_question_active,
                qt.id AS question_id,
                qg.id AS question_group_id,
                qg.name AS question_group_name,
                sk.id AS skill_id,
                sk.reference AS skill_reference,
                sk.description AS skill_description
            FROM test_question AS tq
                     INNER JOIN question AS qt ON tq.questionId = qt.id
                     LEFT JOIN skill AS sk ON qt.skillId = sk.id
                     INNER JOIN question_group AS qg ON tq.questionGroupId = qg.id
            WHERE tq.testId IN (?)
            ORDER BY tq.testId, qg.id, tq.order
        `;

      const [ queryResult ] = await conn.query(format(query), [testIds]);

      return Helper.testQuestionsFormMultipleTests(queryResult as Array<any>)
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qTestQuestions(testId: number | string) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query =
        `
        SELECT 
            tq.id AS test_question_id,
            tq.order AS test_question_order,
            tq.answer AS test_question_answer,
            tq.active AS test_question_active,
            qt.id AS question_id,
            qg.id AS question_group_id,
            qg.name AS question_group_name,
            sk.id AS skill_id,
            sk.reference AS skill_reference,
            sk.description AS skill_description
        FROM test_question AS tq
        INNER JOIN question AS qt ON tq.questionId = qt.id
            LEFT JOIN skill AS sk ON qt.skillId = sk.id
        INNER JOIN question_group AS qg ON tq.questionGroupId = qg.id
        INNER JOIN test AS tt ON tq.testId = tt.id
        WHERE tt.id = ?
        ORDER BY qg.id, tq.order
      `

      const [ queryResult ] = await conn.query(format(query), [testId])
      return Helper.testQuestions(queryResult as qTestQuestions[])
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qTestQuestionsWithTitle(testId: number | string) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query =
        `
        SELECT 
            tq.id AS test_question_id, tq.order AS test_question_order, tq.active AS test_question_active,
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
      return Helper.testQuestions(queryResult as qTestQuestions[])
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qStudentTestQuestions(testId: number, studentId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
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
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qStudentClassrooms(classroomId: number, yearId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();

      const query =

        `
        SELECT sc.id, sc.rosterNumber, sc.classroomId, sc.startedAt, sc.endedAt, s.id AS student_id, p.id AS person_id, p.name AS person_name
        FROM student_classroom AS sc
          INNER JOIN student AS s ON sc.studentId = s.id
          INNER JOIN person AS p ON s.personId = p.id
        WHERE sc.classroomId = ? AND sc.yearId = ?
      `

      const [ queryResult ] = await conn.query(format(query), [classroomId, yearId])
      return  Helper.studentClassroom(queryResult as Array<qStudentClassroomFormated>)

    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qSetFirstLevel(studentId: number, levelId: number, userId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
      await conn.beginTransaction();
      const query = `
          INSERT INTO alphabetic_first (studentId, alphabeticFirstId, createdByUser, updatedByUser, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, NOW(), NOW())
          ON DUPLICATE KEY UPDATE alphabeticFirstId = VALUES(alphabeticFirstId), updatedByUser = VALUES(updatedByUser), updatedAt = VALUES(updatedAt)
      `

      const [ queryResult ] = await conn.query(format(query), [studentId, levelId, userId, userId])
      await conn.commit()
      return queryResult as any
    }
    catch (error) { if(conn) await conn.rollback(); console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qTeacherRelationship(teacherId: number | string) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
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
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qAlphaStudents(test: Test, classroomId: number, year: number, studentClassroomId: number | null) {

    let conn;

    try {

      conn = await connectionPool.getConnection();

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
                 INNER JOIN person ON student.personId = person.id
                 INNER JOIN classroom ON student_classroom.classroomId = classroom.id
                 LEFT JOIN alphabetic_first AS af ON student.id = af.studentId
                 LEFT JOIN alphabetic_level AS al ON af.alphabeticFirstId = al.id
                 LEFT JOIN alphabetic ON student.id = alphabetic.studentId 
                     AND alphabetic.testId IN (
                         SELECT t.id 
                         FROM test t
                         INNER JOIN discipline d ON t.disciplineId = d.id
                         INNER JOIN test_category tc ON t.categoryId = tc.id
                         INNER JOIN period p ON t.periodId = p.id
                         WHERE d.id = ? 
                           AND tc.id = ?
                           AND p.yearId = ?
                     )
                 LEFT JOIN classroom AS rClassroom ON alphabetic.rClassroomId = rClassroom.id
                 LEFT JOIN alphabetic_level AS alphaLevel ON alphabetic.alphabeticLevelId = alphaLevel.id
                 LEFT JOIN test ON alphabetic.testId = test.id
                 LEFT JOIN discipline ON test.disciplineId = discipline.id
                 LEFT JOIN test_category ON test.categoryId = test_category.id
                 LEFT JOIN period ON test.periodId = period.id
                 LEFT JOIN bimester AS bim ON period.bimesterId = bim.id
                 LEFT JOIN year ON period.yearId = year.id
        WHERE student_classroom.id = ?
          AND student_classroom.yearId = ?
          AND classroom.id = ?
        ORDER BY student_classroom.rosterNumber, person.name
    `

        const [ queryResult ] = await conn.query(format(query), [test.discipline.id, test.category.id, year, studentClassroomId, year, classroomId])

        return Helper.alphaStuWQuestions(queryResult as {[key:string]:any}[])
      }

      let query = `
      SELECT
        student_classroom.id, 
        student_classroom.rosterNumber, 
        student_classroom.startedAt, 
        student_classroom.endedAt,
        student.id AS studentId, 
        student.active,
        person.id AS personId, 
        person.name AS name,
        alphabetic.id AS alphabeticId, 
        alphabetic.alphabeticLevelId, 
        alphabetic.rClassroomId, 
        alphaLevel.color AS alphabeticLevelColor, 
        alphabetic.observation,
        test.id AS testId, 
        test.name AS testName,
        period.id AS periodId,
        bim.id AS bimesterId,
        year.id AS yearId,
        al.id AS alphaFirstLevelId,
        al.shortName AS alphaFirstLevelShortName,
        al.name AS alphaFirstLevelName
      FROM student_classroom
        INNER JOIN student ON student_classroom.studentId = student.id
        INNER JOIN person ON student.personId = person.id
        INNER JOIN classroom ON student_classroom.classroomId = classroom.id
        LEFT JOIN alphabetic_first AS af ON student.id = af.studentId
        LEFT JOIN alphabetic_level AS al ON af.alphabeticFirstId = al.id
        LEFT JOIN alphabetic ON student.id = alphabetic.studentId 
            AND alphabetic.testId IN (
                SELECT t.id 
                FROM test t
                INNER JOIN discipline d ON t.disciplineId = d.id
                INNER JOIN test_category tc ON t.categoryId = tc.id
                INNER JOIN period p ON t.periodId = p.id
                WHERE d.id = ? 
                  AND tc.id = ?
                  AND p.yearId = ?
            )
        LEFT JOIN classroom AS rClassroom ON alphabetic.rClassroomId = rClassroom.id
        LEFT JOIN alphabetic_level AS alphaLevel ON alphabetic.alphabeticLevelId = alphaLevel.id
        LEFT JOIN test ON alphabetic.testId = test.id
        LEFT JOIN discipline ON test.disciplineId = discipline.id
        LEFT JOIN test_category ON test.categoryId = test_category.id
        LEFT JOIN period ON test.periodId = period.id
        LEFT JOIN bimester AS bim ON period.bimesterId = bim.id
        LEFT JOIN year ON period.yearId = year.id
      WHERE student_classroom.yearId = ?
        AND classroom.id = ?
      ORDER BY student_classroom.rosterNumber, person.name
    `

      const [ queryResult ] = await conn.query(format(query), [test.discipline.id, test.category.id, year, year, classroomId])

      return Helper.alphaStuWQuestions(queryResult as {[key:string]:any}[])

    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qPendingTransferStatus(year: number, status: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
      const query =

        `
        SELECT *
        FROM transfer
        WHERE transfer.yearId = ? AND transfer.statusId = ?
      `

      const [ queryResult ] = await conn.query(format(query), [year, status])
      return  queryResult as Array<Transfer>
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qPresence(trainingId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
      const query = `
        SELECT *
        FROM training AS t
        WHERE t.id = ?
    `;

      const [queryResult] = await conn.query(format(query), [trainingId]);
      return (queryResult as Array<Training>)[0]
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qAllReferencedTrainings(referencedTraining: Training) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
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

        return Helper.trainingsWithSchedules(queryResult as any[]);
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

      return Helper.trainingsWithSchedules(queryResult as any[]);
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async updateTeacherContractCurrentYear(body: { teacherId: number, schoolId: number, contractId: number, categoryId: number, yearId: number, yearName: string, classroom: number }) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
      await conn.beginTransaction()
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
      await conn.commit()
      return queryResult
    }
    catch (error) { if(conn) await conn.rollback(); console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async updateTeacherContractOtherYear(body: { teacherId: number, schoolId: number, contractId: number, categoryId: number, yearId: number, yearName: string, classroom: number }) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
      await conn.beginTransaction()
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
      await conn.commit()
      return queryResult
    }
    catch (error) { if(conn) await conn.rollback(); console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qSpecificDisciplinesInPEBI(referencedTraining: Training, isCurrentYear: boolean, referencedTrainingYear: string, teacher: qUserTeacher) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
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
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qTeachersByCategory(referencedTraining: Training, isCurrentYear: boolean, referencedTrainingYear: string, teacher: qUserTeacher) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
      const shouldFilterBySchool = teacher.school?.id !== null && ![1, 2, 10].includes(teacher.person.category.id);
      const shouldFilterByClassroom = referencedTraining.categoryId === 1 && referencedTraining.classroom !== null && referencedTraining.classroom !== undefined;
      const shouldFilterByDiscipline = referencedTraining.categoryId === 2 && referencedTraining.disciplineId !== null && referencedTraining.disciplineId !== undefined;
      const shouldFilterByTeacher = [7, 8].includes(teacher.person.category.id);

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

      const [mainResult] = await conn.query(mainQuery, mainQueryParams);
      let allTeachers = mainResult as Array<{ id: number, name: string, discipline: string, classroom: number | string, schoolId: number, shortName: string, disciplineId?: number | null, isHeadquarterSchool: number }>;

      if (referencedTraining.categoryId === 2) {
        const specificTeachers = await this.qSpecificDisciplinesInPEBI(referencedTraining, isCurrentYear, referencedTrainingYear, teacher);

        const existingIds = new Set(allTeachers.map(t => `${t.id}-${t.schoolId}-${t.disciplineId}`));
        const newTeachers = specificTeachers.filter(t =>
          !existingIds.has(`${t.id}-${t.schoolId}-${t.disciplineId}`)
        );

        allTeachers = [...allTeachers, ...newTeachers];

        allTeachers.sort((a, b) => a.shortName.localeCompare(b.shortName));
      }

      return allTeachers;
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qTeacherTrainings(teachers: TeacherParam[], trainingIds: number[], categoryId: number, isCurrentYear: boolean, referencedTrainingYear: string ) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
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
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qTrainings(yearId: number, search: string, peb: number, limit: number, offset: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
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
      return Helper.formatTrainings(queryResult as Array<any>)
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qOneTraining(id: number): Promise<TrainingResult | null> {
    let conn;
    try {
      conn = await connectionPool.getConnection()
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

      if (rows.length === 0) { return null }

      return Helper.oneTraining(rows as Array<any>)
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qClassroomCategories() {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query = `SELECT id, name FROM classroom_category`
      const [ queryResult ] = await conn.query(format(query))
      return  queryResult as Array<ClassroomCategory>
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }

  }

  async qContracts() {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query = `SELECT id, name FROM contract ORDER BY id DESC`
      const [ queryResult ] = await conn.query(format(query))
      return  queryResult as Array<Contract>

    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }

  }

  async qTeacherTrainingStatus() {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query = `SELECT id, name FROM training_teacher_status WHERE active = 1`
      const [ queryResult ] = await conn.query(format(query))
      return  queryResult as Array<TrainingTeacherStatus>
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }

  }

  async qDisciplines() {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query = `SELECT id, name FROM discipline`
      const [ queryResult ] = await conn.query(format(query))
      return  queryResult as Array<Discipline>
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qTrainingSchedulesMonthReference() {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query = `SELECT id, name FROM training_schedules_months_references ORDER BY id`
      const [ queryResult ] = await conn.query(format(query))
      return  queryResult as Array<{ id: number, name: string }>
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qTrainingSchedulesMeetings() {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query = `SELECT id, name FROM training_schedules_meeting ORDER BY id`
      const [ queryResult ] = await conn.query(format(query))
      return  queryResult as Array<{ id: number, name: string }>
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qNumberClassrooms() {
    let conn;
    try {
      conn = await connectionPool.getConnection();
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
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qPendingTransferStatusBySchool(year: number, transferStatus: number, schoolId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
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
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qAllPendingTransferStatusBySchool(year: number, transferStatus: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
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
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qCurrentTeacherStudents(yearId: number, classrooms: number[], student: string | number, masterTeacher: boolean, limit: number, offset: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const studentSearch = `%${student.toString().toUpperCase()}%`

      let responseData

      if(masterTeacher) {

        let query = `
        SELECT sc.id AS studentClassroomId, stu.id AS studentId, per.name
        FROM student_classroom AS sc
        INNER JOIN student AS stu ON sc.studentId = stu.id
        INNER JOIN person AS per ON stu.personId = per.id
        WHERE (per.name LIKE ? OR stu.ra LIKE ?) AND sc.yearId = ?
        LIMIT ?
        OFFSET ?
        `

        const [ queryResult ] = await conn.query(format(query), [studentSearch, studentSearch, yearId, limit, offset])
        responseData = queryResult

        return responseData as { studentClassroomId: number, studentId: number, name: string }[]
      }

      let query = `
        SELECT sc.id, stu.id AS studentId, per.name
        FROM student_classroom AS sc
        INNER JOIN student AS stu ON sc.studentId = stu.id
        INNER JOIN person AS per ON stu.personId = per.id
        WHERE (per.name LIKE ? OR stu.ra LIKE ?) AND sc.classroomId IN (?) AND sc.endedAt IS NULL AND sc.yearId = ?
        `

      const [ queryResult ] = await conn.query(format(query), [studentSearch, studentSearch, classrooms, yearId])
      responseData = queryResult

      return responseData as { id: number, studentId: number, name: string }[]
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qStudentTestsByYear(studentIds: number[], yearId: number, limit: number, offset: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query = `
          SELECT
              sc.id AS studentClassroomId, stu.id AS studentId, per.name AS studentName,
              cls.id AS classroomId, cls.shortName AS classroomName, sch.shortName AS schoolName,
              tt.id AS testId, tt.name AS testName, br.name AS bimesterName,
              br.testName AS bimesterTestName, yr.name AS yearName, ttc.id AS testCategoryId,
              stu.ra, stu.dv
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
          WHERE
              stu.id IN (?)
            AND yr.id = ?
            AND sc.yearId = yr.id
              LIMIT ?
          OFFSET ?
      `;

      const [ queryResult ] = await conn.query(format(query), [studentIds, yearId, limit, offset]);

      return queryResult as qStudentTests[];
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qStudentAlphabeticByYear(studentIds: number[], yearId: number, limit: number, offset: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query = `
          SELECT
              sc.id AS studentClassroomId, stu.id AS studentId, per.name AS studentName,
              cls.id AS classroomId, cls.shortName AS classroomName, sch.shortName AS schoolName,
              tt.id AS testId, tt.name AS testName, br.name AS bimesterName,
              br.testName AS bimesterTestName, yr.name AS yearName, ttc.id AS testCategoryId,
              stu.ra, stu.dv
          FROM alphabetic AS alpha
                   INNER JOIN student AS stu ON alpha.studentId = stu.id
                   INNER JOIN student_classroom AS sc ON stu.id = sc.studentId
                   INNER JOIN classroom AS cls ON sc.classroomId = cls.id
                   INNER JOIN school AS sch ON cls.schoolId = sch.id
                   INNER JOIN person AS per ON stu.personId = per.id
                   LEFT JOIN test AS tt ON alpha.testId = tt.id
                   LEFT JOIN test_category AS ttc ON tt.categoryId = ttc.id
                   LEFT JOIN period AS pr ON tt.periodId = pr.id
                   LEFT JOIN year AS yr ON pr.yearId = yr.id
                   LEFT JOIN bimester AS br ON pr.bimesterId = br.id
          WHERE
              stu.id IN (?)
            AND yr.id = ?
            AND sc.yearId = yr.id
              LIMIT ?
          OFFSET ?
      `;

      const [ queryResult ] = await conn.query(format(query), [studentIds, yearId, limit, offset]);

      return queryResult as qStudentTests[];
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qTestQuestionsGroupsOnReport(testId: number) {
    let conn;
    try{
      conn = await connectionPool.getConnection();
      const query =
        `
        SELECT 
          qg.id,
          qg.name,
          COUNT(tq.id) AS questionsCount
        FROM question_group qg
        INNER JOIN test_question tq ON tq.questionGroupId = qg.id
        WHERE tq.testId = ?
        GROUP BY qg.id, qg.name
        ORDER BY qg.id
      `

      const [result] = await conn.query(query, [testId])

      return result as Array<{ id: number, name: string, questionsCount: number }>
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async bactchQueryAlphaQuestions(testIds: number[]){
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const batchQuery = `
        SELECT 
          tq.id AS test_question_id, 
          tq.order AS test_question_order, 
          tq.answer AS test_question_answer, 
          tq.active AS test_question_active,
          tq.testId AS test_id,
          qt.id AS question_id,
          qg.id AS question_group_id, 
          qg.name AS question_group_name,
          sk.id AS skill_id, 
          sk.reference AS skill_reference, 
          sk.description AS skill_description
        FROM test_question AS tq
        INNER JOIN question AS qt ON tq.questionId = qt.id
        LEFT JOIN skill AS sk ON qt.skillId = sk.id
        INNER JOIN question_group AS qg ON tq.questionGroupId = qg.id
        INNER JOIN test AS tt ON tq.testId = tt.id
        WHERE tt.id IN (${testIds.map(() => '?').join(',')})
        ORDER BY tt.id, qg.id, tq.order
      `;

      const [batchResult] = await conn.query(batchQuery, testIds);
      return batchResult

    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async alphaQuestions(serieFilter: number | string, yearName: string, test: any, testQuestionsIds: number[], classroomId?: number, studentClassroomId?: number | null) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const hasQuestions = !!testQuestionsIds.length;
      const testQuestionsPlaceholders = hasQuestions && testQuestionsIds.length > 0
        ? testQuestionsIds.map(() => '?').join(',')
        : '';

      let query = `
    SELECT 
      -- School
      s.id AS school_id,
      s.name AS school_name,
      s.shortName AS school_shortName,
      
      -- Classroom
      c.id AS classroom_id,
      c.name AS classroom_name,
      c.shortName AS classroom_shortName,
      
      -- StudentClassroom
      sc.id AS studentClassroom_id,
      sc.rosterNumber,
      sc.endedAt AS studentClassroom_endedAt,
      
      -- Student
      st.id AS student_id,
      
      -- Person
      p.id AS person_id,
      p.name AS person_name,
      
      -- AlphabeticFirst
      af.id AS alphabeticFirst_id,
      afl.id AS alphabeticFirst_level_id,
      afl.name AS alphabeticFirst_level_name,
      afl.shortName AS alphabeticFirst_level_shortName,
      afl.color AS alphabeticFirst_level_color,
      
      -- Alphabetic
      a.id AS alphabetic_id,
      a.observation AS alphabetic_observation,
      al.id AS alphabetic_level_id,
      al.name AS alphabetic_level_name,
      al.shortName AS alphabetic_level_shortName,
      al.color AS alphabetic_level_color,
      arc.id AS alphabetic_rClassroom_id,
      arc.name AS alphabetic_rClassroom_name,
      arc.shortName AS alphabetic_rClassroom_shortName,
      at.id AS alpha_test_id,
      at.name AS alpha_test_name,
      atp.id AS alpha_test_period_id,
      atb.id AS alpha_test_bimester_id,
      atb.name AS alpha_test_bimester_name,
      aty.id AS alpha_test_year_id,
      aty.name AS alpha_test_year_name,
      
      -- StudentDisability
      sd.id AS studentDisability_id,
      sd.disabilityId AS disability_id,
      d.name AS disability_name`;

      if (hasQuestions) {
        query += `,
      -- StudentQuestion
      sq.id AS studentQuestion_id,
      sq.answer AS studentQuestion_answer,
      sqrc.id AS studentQuestion_rClassroom_id,
      tq.id AS testQuestion_id,
      tq.order AS testQuestion_order,
      tq.answer AS testQuestion_answer,
      tq.active AS testQuestion_active,
      t.id AS test_id,
      t.name AS test_name,
      per.id AS period_id,
      bim.id AS bimester_id,
      bim.name AS bimester_name,
      py.id AS period_year_id,
      py.name AS period_year_name`;
      }

      query += `
    FROM school s
    LEFT JOIN classroom c ON c.schoolId = s.id
    LEFT JOIN student_classroom sc ON sc.classroomId = c.id
    LEFT JOIN year scy ON sc.yearId = scy.id
    LEFT JOIN student st ON sc.studentId = st.id
    LEFT JOIN person p ON st.personId = p.id
    LEFT JOIN alphabetic_first af ON af.studentId = st.id
    LEFT JOIN alphabetic_level afl ON af.alphabeticFirstId = afl.id
    LEFT JOIN alphabetic a ON a.studentId = st.id
    LEFT JOIN alphabetic_level al ON a.alphabeticLevelId = al.id
    LEFT JOIN classroom arc ON a.rClassroomId = arc.id
    LEFT JOIN test at ON a.testId = at.id
    LEFT JOIN test_category atc ON at.categoryId = atc.id
    LEFT JOIN discipline atd ON at.disciplineId = atd.id
    LEFT JOIN period atp ON at.periodId = atp.id
    LEFT JOIN bimester atb ON atp.bimesterId = atb.id
    LEFT JOIN year aty ON atp.yearId = aty.id
    LEFT JOIN student_disability sd ON sd.studentId = st.id AND sd.endedAt IS NULL
    LEFT JOIN disability d ON sd.disabilityId = d.id`;

      if (hasQuestions) {
        query += `
    LEFT JOIN student_question sq ON sq.studentId = st.id
    LEFT JOIN classroom sqrc ON sq.rClassroomId = sqrc.id
    LEFT JOIN test_question tq ON sq.testQuestionId = tq.id ${testQuestionsPlaceholders ? `AND tq.id IN (${testQuestionsPlaceholders})` : ''}
    LEFT JOIN test t ON tq.testId = t.id
    LEFT JOIN test_category tc ON t.categoryId = tc.id
    LEFT JOIN discipline td ON t.disciplineId = td.id
    LEFT JOIN period per ON t.periodId = per.id
    LEFT JOIN bimester bim ON per.bimesterId = bim.id
    LEFT JOIN year py ON per.yearId = py.id`;
      }

      query += `
    WHERE s.id NOT IN (28, 29)
    AND c.id NOT IN (1216, 1217, 1218)
    ${serieFilter ? 'AND c.shortName LIKE ?' : ''}
    AND atd.id = ?
    AND atc.id = ?
    AND aty.name = ?
    AND scy.name = ?`;

      if (hasQuestions) {
        query += `
    AND (sc.startedAt < ? OR a.id IS NOT NULL OR sq.id IS NOT NULL)
    AND tc.id = ?
    AND td.id = ?
    AND py.name = ?`;
      } else {
        query += `
    AND (sc.startedAt < ? OR a.id IS NOT NULL)`;
      }

      if (classroomId) query += ` AND sc.classroomId = ?`;
      if (studentClassroomId) query += ` AND sc.id = ?`;

      query += `
    ORDER BY sc.rosterNumber ASC, c.shortName ASC, s.shortName ASC`;

      if (hasQuestions) {
        query += `, bim.id ASC, tq.order ASC`;
      }

      const params: any[] = [];
      if (hasQuestions && testQuestionsIds.length > 0) {
        params.push(...testQuestionsIds);
      }

      if (serieFilter) { params.push(serieFilter) }

      params.push(
        test.discipline?.id ?? test.discipline_id,
        test.category?.id ?? test.test_category_id,
        yearName,
        yearName,
        test.createdAt
      );

      if (hasQuestions) {
        params.push(
          test.category?.id ?? test.test_category_id,
          test.discipline?.id ?? test.discipline_id,
          yearName
        );
      }

      if (classroomId) params.push(classroomId);
      if (studentClassroomId) params.push(studentClassroomId);

      const [rows] = await conn.query(query, params);

      return Helper.alphaQuestions(rows, hasQuestions)
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async getTeacherClassrooms(masterUser: boolean, allClassrooms: number[]){
    let conn;
    try {
      conn = await connectionPool.getConnection()
      let query = `
        SELECT
          classroom.id AS id,
          classroom.shortName AS name,
          school.shortName AS school
        FROM classroom
        LEFT JOIN school ON classroom.schoolId = school.id
      `;
      const params: any[] = [];

      if (!masterUser) {
        if (allClassrooms.length === 0) { return { status: 200, data: [] } }
        query += ` WHERE classroom.id IN (?)`;
        params.push(allClassrooms);
      }
      else { query += ` WHERE classroom.id > 0` }

      const [queryResult] = await conn.query(query, params);

      return queryResult as Array<Classroom>
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async findPersonCategories(excludeIds: number[]){
    let conn;
    try {
      conn = await connectionPool.getConnection()
      const query = `SELECT * FROM person_category WHERE id NOT IN (?)`;
      const [result] = await conn.query(query, [excludeIds]);
      return result as Array<PersonCategory>
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qGetAllDisciplines(qUserTeacher: qUserTeacher, teacherDisciplines: { id: number, disciplines: number[] }){
    let conn;
    try {
      conn = await connectionPool.getConnection()

      let query = `
        SELECT
          discipline.id AS id,
          discipline.name AS name,
          discipline.shortName AS shortName
        FROM discipline
      `;
      const params: any[] = [];
      const isProfessor = qUserTeacher.person.category.id === PERSON_CATEGORIES.PROF;

      if (isProfessor) {
        if (!teacherDisciplines.disciplines || teacherDisciplines.disciplines.length === 0) {
          return [];
        }
        query += ` WHERE discipline.id IN (?)`;
        params.push(teacherDisciplines.disciplines);
      }

      const [result] = await conn.query(query, params);
      return result as Array<Discipline>
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qGraphTest(testId: string, testQuestionsIds: number[], year: any) {
    let conn;
    try {
      conn = await connectionPool.getConnection();

      const testQuestionsPlaceholders = testQuestionsIds.map(() => '?').join(',');

      const query = `
        SELECT 
          s.id AS school_id,
          s.name AS school_name,
          s.shortName AS school_shortName,
          c.id AS classroom_id,
          c.name AS classroom_name,
          c.shortName AS classroom_shortName,
          sc.id AS studentClassroom_id,
          sc.studentId AS student_id,
          sc.rosterNumber,
          sc.startedAt,
          sc.endedAt,
          st.id AS student_id_check,
          sq.id AS studentQuestion_id,
          sq.answer AS studentQuestion_answer,
          sq.rClassroomId AS studentQuestion_rClassroomId,
          tq.id AS testQuestion_id,
          tq.order AS testQuestion_order,
          tq.answer AS testQuestion_answer,
          tq.active AS testQuestion_active,
          qg.id AS questionGroup_id,
          qg.name AS questionGroup_name,
          t.id AS test_id,
          t.name AS test_name
        FROM school s
        LEFT JOIN classroom c ON c.schoolId = s.id
        LEFT JOIN student_classroom sc ON sc.classroomId = c.id
        LEFT JOIN student st ON sc.studentId = st.id
        LEFT JOIN student_question sq ON sq.studentId = st.id
        LEFT JOIN test_question tq ON sq.testQuestionId = tq.id 
          AND tq.id IN (${testQuestionsPlaceholders})
        LEFT JOIN question_group qg ON tq.questionGroupId = qg.id
        LEFT JOIN test t ON tq.testId = t.id
        LEFT JOIN period p ON t.periodId = p.id
        WHERE 
          t.id = ?
          AND s.id NOT IN (28, 29)
          AND c.id NOT IN (1216, 1217, 1218)
          AND sc.yearId = ?
          AND p.yearId = ?
        ORDER BY 
          s.shortName ASC,
          c.id ASC,
          qg.id ASC,
          tq.order ASC
      `;

      const params = [...testQuestionsIds, testId, year.id, year.id];
      const [rows] = await conn.query(query, params);
      return rows;
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qfindAllByYear(masterTeacher: boolean, yearName: string, classrooms: number[], disciplines: number[], bimesterId: number | null, disciplineId: number | null, search: string, limit: number, offset: number){
    let conn;
    try {
      conn = await connectionPool.getConnection()

      let query = `
      WITH RankedTests AS (
        SELECT
            t.id AS test_id,
            t.name AS test_name,
            p.id AS period_id,
            tc.id AS category_id,
            tc.name AS category_name,
            y.id AS year_id,
            y.name AS year_name,
            y.active AS year_active,
            b.id AS bimester_id,
            b.name AS bimester_name,
            b.testName AS bimester_test_name,
            d.id AS discipline_id,
            d.name AS discipline_name,
            c.id AS classroom_id,
            c.name AS classroom_name,
            c.shortName AS classroom_shortName,
            s.id AS school_id,
            s.name AS school_name,
            s.shortName AS school_shortName,
            ROW_NUMBER() OVER (
                PARTITION BY tc.id, d.id, c.id, y.name
                ORDER BY b.id DESC
            ) AS rn
        FROM test t
            INNER JOIN period p ON t.periodId = p.id
            INNER JOIN test_category tc ON t.categoryId = tc.id
            INNER JOIN year y ON p.yearId = y.id
            INNER JOIN bimester b ON p.bimesterId = b.id
            INNER JOIN discipline d ON t.disciplineId = d.id
            INNER JOIN test_classroom test_c ON t.id = test_c.testId
            INNER JOIN classroom c ON test_c.classroomId = c.id
            INNER JOIN school s ON c.schoolId = s.id
        WHERE y.name = ?
    `;

      const params: any[] = [yearName];

      if (!masterTeacher && classrooms.length > 0) {
        const classroomPlaceholders = classrooms.map(() => '?').join(',');
        query += ` AND c.id IN (${classroomPlaceholders})`;
        params.push(...classrooms);
      }

      if (!masterTeacher && disciplines.length > 0) {
        const disciplinePlaceholders = disciplines.map(() => '?').join(',');
        query += ` AND d.id IN (${disciplinePlaceholders})`;
        params.push(...disciplines);
      }

      if (bimesterId) {
        query += ` AND b.id = ?`;
        params.push(bimesterId)
      }

      if (disciplineId) {
        query += ` AND d.id = ?`;
        params.push(disciplineId)
      }

      if (search && search.trim() !== '') {
        query += ` AND (t.name LIKE ? OR c.shortName LIKE ? OR s.name LIKE ? OR s.shortName LIKE ?)`;
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern, searchPattern);
      }

      // ✅ Fecha o CTE e adiciona a query principal
      query += `
      )
      SELECT DISTINCT
        test_id,
        test_name,
        period_id,
        category_id,
        category_name,
        year_id,
        year_name,
        year_active,
        bimester_id,
        bimester_name,
        bimester_test_name,
        discipline_id,
        discipline_name,
        classroom_id,
        classroom_name,
        classroom_shortName,
        school_id,
        school_name,
        school_shortName
      FROM RankedTests
      WHERE 
        (category_id IN (1, 2, 3) AND rn = 1)
        OR category_id NOT IN (1, 2, 3)
      ORDER BY 
        test_name ASC,
        school_shortName ASC,
        classroom_shortName ASC,
        bimester_name DESC
      LIMIT ? OFFSET ?
    `;

      params.push(limit, offset);

      const [results] = await conn.query(query, params);
      return results as any[];
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qUpdateAndValidateAnswer(studentQuestionId: number, newAnswer: string, classroomId: number, studentClassroomId: number, userId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      const updateQuery = `
          UPDATE
              student_question AS sq
                  INNER JOIN test_question AS tq ON sq.testQuestionId = tq.id
                  INNER JOIN test AS tt ON tq.testId = tt.id
                  INNER JOIN student AS s ON sq.studentId = s.id
                  INNER JOIN student_classroom AS sc ON sc.id = ?
          SET
              sq.answer = ?,
              sq.rClassroomId = ?,
              sq.updatedAt = NOW(),
              sq.updatedByUser = ?
          WHERE
              sq.id = ?
            AND tt.active = 1
            AND sc.endedAt IS NULL
            AND (sq.rClassroomId IS NULL OR sq.rClassroomId = ?)
      `;

      const isAnswerEmpty = !newAnswer || newAnswer.trim().length === 0;
      const params = [studentClassroomId, newAnswer, isAnswerEmpty ? null : classroomId, userId, studentQuestionId, classroomId];

      const [updateResult] = await conn.query(updateQuery, params) as any[];

      if (updateResult.affectedRows === 0) { await conn.rollback(); return null }

      const selectQuery = `
          SELECT sq.*, tq.answer AS correctAnswer
          FROM student_question sq
                   INNER JOIN test_question tq ON sq.testQuestionId = tq.id
          WHERE sq.id = ?
      `;

      const [selectResult] = await conn.query(selectQuery, [studentQuestionId]) as any[];

      await conn.commit();

      return selectResult[0];
    }
    catch (error) { if(conn){ await conn.rollback() } console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qBulkUpdateStudentTestStatus(studentTestStatusIds: number[], newStudentClassroomId: number, userId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      if (!studentTestStatusIds || studentTestStatusIds.length === 0) { await conn.commit(); return }

      const placeholders = studentTestStatusIds.map(() => '?').join(',');

      const query = `
          UPDATE student_test_status
          SET
              studentClassroomId = ?,
              updatedAt = NOW(),
              updatedByUser = ?
          WHERE id IN (${placeholders})
            AND active = 1
            AND studentClassroomId != ?
      `;

      const params = [newStudentClassroomId, userId, ...studentTestStatusIds, newStudentClassroomId];

      await conn.query(query, params);
      await conn.commit();
    }
    catch (error) { if (conn) await conn.rollback(); console.error(error); throw error }
    finally { if (conn) conn.release() }
  }
}