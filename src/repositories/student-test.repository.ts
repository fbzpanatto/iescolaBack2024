import { qStudentsClassroomsForTest } from "../interfaces/interfaces";
import { Test } from "../model/Test";
import { TestQuestion } from "../model/TestQuestion";
import { TEST_CATEGORIES_IDS } from "../utils/enums";
import { connectionPool } from "../services/db";
import { StudentFormatter } from "../utils/formatters/student.formatter";

class StudentTestRepository {

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
          (
          studentClassroom.startedAt <= ?
        AND NOT EXISTS (
          SELECT 1 FROM student_classroom sc_arch
          WHERE sc_arch.studentId = student.id
        AND sc_arch.endedAt IS NULL
        AND sc_arch.classroomId IN (1216, 1217, 1218, 1509)
          )
          )
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

      params.push(test.createdAt, test.id, classroomId, test.id, yearName, test.period.id);

      const [rows] = await conn.query(query, params);

      return StudentFormatter.studentQuestions(test, rows as Array<{[key:string]:any}>)
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
              UPPER(d.name) AS discipline,
              t.is_token_required
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
                  -- Teste não realizado: aluno na matrícula ativa, prova dentro do prazo,
                  -- e sem vínculo em nenhuma outra sala.
              (sts.id IS NULL
                  AND sc.endedAt IS NULL
                  AND t.active = 1
                  AND t.endedAt IS NOT NULL
                  AND NOW() <= t.endedAt
                  AND NOT EXISTS (
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

      const [ queryResult ] = await conn.query(query, [studentId, testId, studentId])

      return (queryResult as { studentTestStatusId: number, active: boolean, studentClassroomId: number, classroomId: number, classroomName: string, schoolName: string, testId: number, is_token_required: number | boolean | null }[])[0]
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
                  -- Teste não iniciado: aluno na matrícula ativa, prova dentro do prazo,
                  -- e sem vínculo em nenhuma outra sala.
              (sts.id IS NULL
                  AND sc.endedAt IS NULL
                  AND t.endedAt IS NOT NULL
                  AND NOW() <= t.endedAt
                  AND NOT EXISTS (
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

  async qStudentClassroomsForTest(test: Test, classroomId: number, yearName: string, studentClassroomId: number | null) {
    let conn;
    try {

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
              -- SITUAÇÃO 1: Matriculado antes/no dia do teste E não foi para o arquivo morto
              (
                sc.startedAt <= ?
                AND NOT EXISTS (
                  SELECT 1 FROM student_classroom sc_arch
                  WHERE sc_arch.studentId = s.id
                    AND sc_arch.endedAt IS NULL
                    AND sc_arch.classroomId IN (1216, 1217, 1218, 1509)
                )
              )
              OR
              -- Aluno ativo sem sts (entrou depois, ainda não vinculado)
              (sc.endedAt IS NULL AND sts.id IS NULL)
              OR
              -- SITUAÇÃO 2: Tem sts NESTA sala (transferido para cá ou já tem respostas salvas)
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

        const [queryResult] = await conn.query(query, [test.id, classroomId, yearName, studentClassroomId, test.createdAt, test.id, classroomId]);
        responseQuery = queryResult as qStudentsClassroomsForTest[];
        return responseQuery
      }

      const query = `
        SELECT 
          sc.id AS student_classroom_id, sc.startedAt, sc.endedAt,
          s.id AS student_id,
          sts.id AS student_classroom_test_status_id,
          person.name
        FROM student_classroom AS sc
          INNER JOIN year AS y ON sc.yearId = y.id
          INNER JOIN student AS s ON sc.studentId = s.id
          INNER JOIN person ON s.personId = person.id
          LEFT JOIN student_test_status AS sts ON sc.id = sts.studentClassroomId AND sts.testId = ?
        WHERE sc.classroomId = ?
          AND y.name = ?
          AND (
            -- SITUAÇÃO 1: Matriculado antes/no dia do teste E não foi para o arquivo morto
            (
              sc.startedAt <= ?
              AND NOT EXISTS (
                SELECT 1 FROM student_classroom sc_arch
                WHERE sc_arch.studentId = s.id
                  AND sc_arch.endedAt IS NULL
                  AND sc_arch.classroomId IN (1216, 1217, 1218, 1509)
              )
            )
            OR
            -- Aluno ativo sem sts (entrou depois, ainda não vinculado)
            (sc.endedAt IS NULL AND sts.id IS NULL)
            OR
            -- SITUAÇÃO 2: Tem sts NESTA sala (transferido para cá ou já tem respostas salvas)
            sts.id IS NOT NULL
          )
          AND NOT EXISTS (
            SELECT 1
            FROM student_test_status sts_other
            INNER JOIN student_classroom sc_other ON sts_other.studentClassroomId = sc_other.id
            WHERE sts_other.testId = ? AND sc_other.studentId = s.id AND sc_other.classroomId != ?
          )
        ORDER BY sc.rosterNumber
      `;

      const [queryResult] = await conn.query(query, [test.id, classroomId, yearName, test.createdAt, test.id, classroomId]);
      responseQuery = queryResult as qStudentsClassroomsForTest[];
      return responseQuery
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

      const [ queryResult ] = await conn.query(query, [studentId, testId])

      return queryResult as Array<{ id: number, answer: string, testQuestionId: string, studentId: number, rClassroomId: number }>
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }
}

export const studentTestRepository = new StudentTestRepository()
