import { Request } from "express";
import { CLASSROOM_CATEGORIES, TEST_CATEGORIES_IDS } from "../utils/enums";
import { connectionPool } from "../services/db";
import { Helper } from "../utils/helpers";

class TestListingRepository {

  async listTestsSql(req: Request, isSupeEI: boolean, masterUser: boolean, teacherClasses: { classrooms: number[] }) {

    let conn;

    try {
      conn = await connectionPool.getConnection();

      const DIAGNOSTIC_CATEGORIES = [ TEST_CATEGORIES_IDS.LITE_1, TEST_CATEGORIES_IDS.LITE_2, TEST_CATEGORIES_IDS.LITE_3, TEST_CATEGORIES_IDS.EDU_INF, TEST_CATEGORIES_IDS.EDU_INF_PART ].join(', ');

      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;
      const yearName = req.params.year;

      const searchParam = req.query.search as string;
      const search = (searchParam && searchParam !== 'null' && searchParam !== 'undefined')
        ? `%${searchParam}%`
        : '%%';

      const bimesterId = Helper.parseQueryParam(req.query.bimester);
      const disciplineId = Helper.parseQueryParam(req.query.discipline);

      const whereConditions: string[] = [];
      const queryParams: any[] = [];

      whereConditions.push("y.name = ?");
      queryParams.push(yearName);

      whereConditions.push("t.name LIKE ?");
      queryParams.push(search);

      if (!masterUser) {
        if (teacherClasses?.classrooms?.length > 0) {
          whereConditions.push("c.id IN (?)");
          queryParams.push(teacherClasses.classrooms);
        } else { return [] }
      } else {
        if (isSupeEI) {
          whereConditions.push(`c.categoryId = ${CLASSROOM_CATEGORIES.EI}`);
        }
      }

      if (bimesterId) {
        whereConditions.push("b.id = ?");
        queryParams.push(bimesterId);
      }

      if (disciplineId) {
        whereConditions.push("d.id = ?");
        queryParams.push(disciplineId);
      }

      const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      const idsQuery = `
      WITH RankedTests AS (
        SELECT
          t.id AS test_id,
          t.name AS test_name,
          t.categoryId AS category_id,
          b.name AS bimester_name,
          ROW_NUMBER() OVER (
            PARTITION BY t.categoryId, t.disciplineId, c.id, y.name
            ORDER BY b.id DESC
            ) AS rn
        FROM test t
         LEFT JOIN period per ON t.periodId = per.id
         LEFT JOIN year y ON per.yearId = y.id
         LEFT JOIN bimester b ON per.bimesterId = b.id
         LEFT JOIN discipline d ON t.disciplineId = d.id
         LEFT JOIN test_classroom tc_join ON t.id = tc_join.testId
         LEFT JOIN classroom c ON tc_join.classroomId = c.id
        ${whereClause}
        )
        SELECT DISTINCT
          test_id,
          test_name,
          bimester_name
        FROM RankedTests
        WHERE (category_id IN (${DIAGNOSTIC_CATEGORIES}) AND rn = 1) OR (category_id NOT IN (${DIAGNOSTIC_CATEGORIES}) OR category_id IS NULL)
        ORDER BY test_name ASC, bimester_name ASC
        LIMIT ? OFFSET ?
    `;

      const idsParams = [...queryParams, limit, offset];

      const [idRows] = await conn.query(idsQuery, idsParams);

      const testIds = (idRows as any[]).map(row => row.test_id);

      if (testIds.length === 0) { return [] }

      const dataQuery = `
      SELECT
        t.id AS test_id, t.name AS test_name, t.active AS test_active, t.hideAnswers AS test_hideAnswers, t.createdAt AS test_createdAt,
        p.id AS person_id, p.name AS person_name,
        per.id AS period_id,
        y.id AS year_id, y.name AS year_name,
        b.id AS bimester_id, b.name AS bimester_name,
          
          CASE
              WHEN t.name LIKE '%DIAGNÓSTICA%' THEN 'TODOS'
              ELSE b.testName
              END AS bimester_testName,

          cat.id AS category_id, cat.name AS category_name,
          d.id AS discipline_id, d.name AS discipline_name,
          c.id AS classroom_id, c.name AS classroom_name, c.shortName AS classroom_shortName,
          s.id AS school_id, s.name AS school_name, s.shortName AS school_shortName, s.inep AS school_inep
      FROM test t
         LEFT JOIN person p ON t.personId = p.id
         LEFT JOIN period per ON t.periodId = per.id
         LEFT JOIN year y ON per.yearId = y.id
         LEFT JOIN bimester b ON per.bimesterId = b.id
         LEFT JOIN test_category cat ON t.categoryId = cat.id
         LEFT JOIN discipline d ON t.disciplineId = d.id
         LEFT JOIN test_classroom tc_join ON t.id = tc_join.testId
         LEFT JOIN classroom c ON tc_join.classroomId = c.id
         LEFT JOIN school s ON c.schoolId = s.id
      WHERE t.id IN (?)
      ORDER BY t.name ASC, b.name ASC
  `;

      const [dataRows] = await conn.query(dataQuery, [testIds]);
      return Helper.mapTestRowsToEntity(dataRows as any[]);

    }
    catch (error) { console.error("Error in listTestsSql:", error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async testByClassroomAndTeacher_backup(teacherId: number, yearName: number | string, masterUser: boolean = false) {
    let conn;
    try {
      conn = await connectionPool.getConnection();

      const query =
        `
          SELECT 
            DISTINCT(tc.classroomId) AS cId,
            cs.shortName AS cName,
            sh.id AS sId,
            sh.shortName AS sName,
            tt.id AS tId,
            tt.name AS tName,
            d.id AS dId,
            UPPER(d.name) AS dName
          FROM teacher_class_discipline tcd
            INNER JOIN test_classroom tc ON tcd.classroomId = tc.classroomId
            INNER JOIN test tt ON tc.testId = tt.id
            INNER JOIN discipline d ON tt.disciplineId = d.id
            INNER JOIN classroom cs ON tc.classroomId = cs.id
            INNER JOIN school sh ON cs.schoolId = sh.id
          WHERE tcd.teacherId = ?
            AND tcd.endedAt IS NULL
            AND tt.categoryId = 6
            AND tt.active = 1
            AND tt.hideAnswers = 0
            AND YEAR(tt.createdAt) = ?
            AND tcd.disciplineId = tt.disciplineId
            AND tt.disciplineId = d.id
          ORDER BY tc.classroomId;
        `

      const [result] = await conn.query(query, [teacherId, yearName]);
      return result as Array<{ cId: number, cName: string, sId: number, sName: string, tId: number, tName: string, dId: number, dName: string }>

    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async testByClassroomAndTeacher(teacherId: number, yearName: number | string, masterUser: boolean = false) {
    let conn;
    try {
      conn = await connectionPool.getConnection();

      let query = "";
      let queryParams: any[] = [];

      // 1. Se for super usuário, ignora a tabela de restrição do professor (tcd)
      if (masterUser) {
        query = `
        SELECT 
          DISTINCT(tc.classroomId) AS cId,
          cs.shortName AS name,
          sh.id AS sId,
          sh.shortName AS school,
          tt.id AS tId,
          tt.name AS tName,
          d.id AS dId,
          UPPER(d.name) AS dName
        FROM test_classroom tc
          INNER JOIN test tt ON tc.testId = tt.id
          INNER JOIN discipline d ON tt.disciplineId = d.id
          INNER JOIN classroom cs ON tc.classroomId = cs.id
          INNER JOIN school sh ON cs.schoolId = sh.id
        WHERE tt.categoryId = 6
          AND tt.active = 1
          AND tt.hideAnswers = 0
          AND (tt.is_token_required IS NULL OR tt.is_token_required = 1)
          AND YEAR(tt.createdAt) = ?
        ORDER BY tc.classroomId;
      `;
        // Passa apenas o ano como parâmetro
        queryParams = [yearName];
      }
      // 2. Se for um professor comum, utiliza a query original com a tabela tcd
      else {
        query = `
        SELECT 
          DISTINCT(tc.classroomId) AS cId,
          cs.shortName AS name,
          sh.id AS sId,
          sh.shortName AS school,
          tt.id AS tId,
          tt.name AS tName,
          d.id AS dId,
          UPPER(d.name) AS dName
        FROM teacher_class_discipline tcd
          INNER JOIN test_classroom tc ON tcd.classroomId = tc.classroomId
          INNER JOIN test tt ON tc.testId = tt.id
          INNER JOIN discipline d ON tt.disciplineId = d.id
          INNER JOIN classroom cs ON tc.classroomId = cs.id
          INNER JOIN school sh ON cs.schoolId = sh.id
        WHERE tcd.teacherId = ?
          AND tcd.endedAt IS NULL
          AND tt.categoryId = 6
          AND tt.active = 1
          AND tt.hideAnswers = 0
          AND (tt.is_token_required IS NULL OR tt.is_token_required = 1)
          AND YEAR(tt.createdAt) = ?
          AND tcd.disciplineId = tt.disciplineId
          AND tt.disciplineId = d.id
        ORDER BY tc.classroomId;
      `;
        // Passa o ID do professor e o ano
        queryParams = [teacherId, yearName];
      }

      const [result] = await conn.query(query, queryParams);

      return result as Array<{ cId: number, name: string, sId: number, school: string, tId: number, tName: string, dId: number, dName: string }>;

    }
    catch (error) {
      console.error(error);
      throw error;
    }
    finally {
      if (conn) { conn.release(); }
    }
  }

  async qfindAllByYearNewImplementation(isSuperEI: boolean, masterTeacher: boolean, yearName: string, classrooms: number[], disciplines: number[], bimesterId: number | null, disciplineId: number | null, search: string, limit: number, offset: number){
    let conn;
    try {
      conn = await connectionPool.getConnection()

      const DIAGNOSTIC_CATEGORIES = [
        TEST_CATEGORIES_IDS.LITE_1,
        TEST_CATEGORIES_IDS.LITE_2,
        TEST_CATEGORIES_IDS.LITE_3,
        TEST_CATEGORIES_IDS.EDU_INF,
        TEST_CATEGORIES_IDS.EDU_INF_PART
      ].join(', ');

      // --- LÓGICA DE DETECÇÃO DE SALA (REGEX) ---
      const searchOriginal = search || '';
      const classroomRegex = /\b(\d+[A-Za-z]+)\b/;
      const match = searchOriginal.match(classroomRegex);

      let specificClassroomFilter = "";
      let searchTermCleaned = searchOriginal;

      if (match) {
        const foundClassroom = match[0];
        searchTermCleaned = searchOriginal.replace(foundClassroom, '').trim();
        specificClassroomFilter = ` AND c.shortName COLLATE utf8mb4_unicode_ci LIKE ? `;
      }

      // -------------------------------------------

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
          c.nickname AS classroom_nickname,
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
    WHERE y.name = ?`;

      const params: any[] = [yearName];

      // Bloco If/Else para separação clara de papéis
      if (!masterTeacher) {
        // Regras de Professores
        if (classrooms.length > 0) {
          const classroomPlaceholders = classrooms.map(() => '?').join(',');
          query += ` AND c.id IN (${classroomPlaceholders})`;
          params.push(...classrooms);
        }

        if (disciplines.length > 0) {
          const disciplinePlaceholders = disciplines.map(() => '?').join(',');
          query += ` AND d.id IN (${disciplinePlaceholders})`;
          params.push(...disciplines);
        }
      } else {
        if (isSuperEI) {
          query += ` AND c.categoryId = ${CLASSROOM_CATEGORIES.EI}`;
        }
      }

      if (bimesterId) {
        query += ` AND b.id = ?`;
        params.push(bimesterId)
      }

      if (disciplineId) {
        query += ` AND d.id = ?`;
        params.push(disciplineId)
      }

      if (searchTermCleaned && searchTermCleaned.trim() !== '') {
        query += ` AND (
        t.name COLLATE utf8mb4_unicode_ci LIKE ? 
        OR c.shortName COLLATE utf8mb4_unicode_ci LIKE ? 
        OR s.name COLLATE utf8mb4_unicode_ci LIKE ? 
        OR s.shortName COLLATE utf8mb4_unicode_ci LIKE ?
      )`;
        const searchPattern = `%${searchTermCleaned}%`;
        params.push(searchPattern, searchPattern, searchPattern, searchPattern);
      }

      if (specificClassroomFilter) {
        query += specificClassroomFilter;
        params.push(`%${match![0]}%`);
      }

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
        classroom_nickname,
        classroom_shortName,
        school_id,
        school_name,
        school_shortName
      FROM RankedTests
      WHERE 
        (category_id IN (${DIAGNOSTIC_CATEGORIES}) AND rn = 1)
        OR category_id NOT IN (${DIAGNOSTIC_CATEGORIES})
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
}

export const testListingRepository = new TestListingRepository()
