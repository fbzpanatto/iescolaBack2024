import { qTest, qTestClassroom, qTestByIdRow, qTestPreviewScope } from "../interfaces/interfaces";
import { Test } from "../model/Test";
import { TEST_CATEGORIES_IDS } from "../utils/enums";
import { connectionPool } from "../services/db";
import { Helper } from "../utils/helpers";

class TestRepository {

  async qTestById(testId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const [ queryResult ] = await conn.query(`SELECT * FROM test WHERE id = ?`, [testId])
      return (queryResult as Test[])[0]
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  // Equivalente ao antigo TestController#getById (TypeORM). LEFT JOIN em tudo (inclusive
  // period/discipline/category/person) para não sumir com a linha do teste caso alguma FK
  // esteja nula — mesmo comportamento do findOne com relations do TypeORM.
  // Índices esperados: test(id) [PK], period(id)/(yearId)/(bimesterId) [existem],
  // year(id) [PK], bimester(id) [PK], discipline(id) [PK], test_category(id) [PK],
  // person(id) [PK], test_classroom(testId) [existe], classroom(id) [PK], school(id) [PK]
  async qTestByIdWithClassrooms(testId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query =
        `
        SELECT
            t.id, t.name, t.active, t.hideAnswers, t.is_token_required, t.createdAt, t.updatedAt, t.createdByUser, t.updatedByUser, t.endedAt,
            p.id AS period_id,
            y.id AS year_id, y.name AS year_name, y.active AS year_active, y.createdAt AS year_createdAt, y.endedAt AS year_endedAt,
            bm.id AS bimester_id, bm.name AS bimester_name, bm.testName AS bimester_testName,
            d.id AS discipline_id, d.name AS discipline_name,
            tcat.id AS category_id, tcat.name AS category_name, tcat.startClassroomNumber AS category_startClassroomNumber, tcat.endClassroomNumber AS category_endClassroomNumber,
            pe.id AS person_id, pe.name AS person_name, pe.birth AS person_birth,
            c.id AS classroom_id, c.name AS classroom_name, c.nickname AS classroom_nickname, c.shortName AS classroom_shortName,
            s.id AS school_id, s.name AS school_name, s.shortName AS school_shortName, s.inep AS school_inep, s.active AS school_active
        FROM test AS t
            LEFT JOIN period AS p ON t.periodId = p.id
            LEFT JOIN year AS y ON p.yearId = y.id
            LEFT JOIN bimester AS bm ON p.bimesterId = bm.id
            LEFT JOIN discipline AS d ON t.disciplineId = d.id
            LEFT JOIN test_category AS tcat ON t.categoryId = tcat.id
            LEFT JOIN person AS pe ON t.personId = pe.id
            LEFT JOIN test_classroom AS tct ON tct.testId = t.id
            LEFT JOIN classroom AS c ON tct.classroomId = c.id
            LEFT JOIN school AS s ON c.schoolId = s.id
        WHERE t.id = ?
        ORDER BY c.id ASC
      `
      const [ queryResult ] = await conn.query(query, [testId])
      return Helper.testByIdFull(queryResult as qTestByIdRow[])
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qTestFormData() {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const [
        [ disciplines ],
        [ bimesters ],
        [ testCategories ],
        [ questionGroup ]
      ] = await Promise.all([
        conn.query(`SELECT id, name FROM discipline`),
        conn.query(`SELECT id, name, testName FROM bimester`),
        conn.query(`SELECT id, name, startClassroomNumber, endClassroomNumber FROM test_category`),
        conn.query(`SELECT id, name, createdAt, updatedAt, createdByUser, updatedByUser FROM question_group WHERE id = ?`, [1])
      ])
      return {
        disciplines: disciplines as { id: number, name: string }[],
        bimesters: bimesters as { id: number, name: string, testName: string }[],
        testCategories: testCategories as { id: number, name: string, startClassroomNumber: number | null, endClassroomNumber: number | null }[],
        questionGroup: (questionGroup as any[])[0] ?? null
      }
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qAggregateTest(yearName: string, classroom: number, bimesterId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const likeClassroom = `%${classroom}%`;

      // 1. Criamos um array com os valores do seu enum
      const categories = [TEST_CATEGORIES_IDS.SIM_ITA, TEST_CATEGORIES_IDS.AVL_ITA];

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
      WHERE 
        y.name = ? 
        AND c.shortName LIKE ? 
        AND p.bimesterId = ?
        AND t.categoryId IN (?) -- 2. Usamos o placeholder aqui
      ORDER BY t.createdAt ASC, d.name ASC;    
    `;

      // 3. Passamos o array 'categories' como o 4º parâmetro
      const [ queryResult ] = await conn.query(query, [yearName, likeClassroom, bimesterId, categories]);

      return queryResult as { id: number, categoryId: number, category: string, bimester: string, year: string, testName: string, disciplineName: string, createdAt: any }[];
    }
    catch (error) { console.error(error); throw error; }
    finally { if (conn) { conn.release(); } }
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

      const [ queryResult ] = await conn.query(query, [testId, classroomId])
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

      const [ queryResult ] = await conn.query(query, [testId, yearName])
      return (queryResult as qTest[])[0]
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qTestPreviewScope(testId: number): Promise<qTestPreviewScope | null> {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query =
        `
        SELECT yr.name AS year_name, c.id AS classroom_id, c.categoryId AS classroom_category_id
        FROM test AS t
          INNER JOIN period AS pr ON t.periodId = pr.id
          INNER JOIN year AS yr ON pr.yearId = yr.id
          LEFT JOIN test_classroom AS tct ON tct.testId = t.id
          LEFT JOIN classroom AS c ON tct.classroomId = c.id
        WHERE t.id = ?
      `

      const [ queryResult ] = await conn.query(query, [testId])
      const rows = queryResult as { year_name: string, classroom_id: number | null, classroom_category_id: number | null }[]
      if (!rows.length) { return null }

      const classrooms = rows
        .filter(row => row.classroom_id !== null)
        .map(row => ({ id: Number(row.classroom_id), categoryId: Number(row.classroom_category_id) }))

      return { yearName: String(rows[0].year_name), classrooms }
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qGraphTest(testId: number | string, testQuestionsIds: number[], year: any) {

    if (!testQuestionsIds || testQuestionsIds.length === 0) { return [] }

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
      
      -- ALTERAÇÃO AQUI: INNER JOIN obriga que o aluno tenha respondido/acessado a questão
      INNER JOIN student_question sq ON sq.studentId = st.id
      
      -- E, por consequência, obriga que a questão pertença a esta prova específica
      INNER JOIN test_question tq ON sq.testQuestionId = tq.id 
        AND tq.id IN (${testQuestionsPlaceholders})
      
      LEFT JOIN question_group qg ON tq.questionGroupId = qg.id
      
      -- Como a prova e o período já são filtrados no WHERE, usar INNER JOIN aqui também melhora a performance
      INNER JOIN test t ON tq.testId = t.id
      INNER JOIN period p ON t.periodId = p.id
      WHERE 
        t.id = ?
        AND s.id NOT IN (28, 29)
        AND c.id NOT IN (1216, 1217, 1218, 1509)
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
}

export const testRepository = new TestRepository()
