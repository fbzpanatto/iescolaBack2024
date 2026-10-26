import { Test } from "../model/Test";
import { connectionPool } from "../services/db";
import { AlphabeticFormatter } from "../utils/formatters/alphabetic.formatter";

class AlphabeticReportRepository {

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

        const [ queryResult ] = await conn.query(query, [test.discipline.id, test.category.id, year, studentClassroomId, year, classroomId])

        return AlphabeticFormatter.alphaStuWQuestions(queryResult as {[key:string]:any}[])
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

      const [ queryResult ] = await conn.query(query, [test.discipline.id, test.category.id, year, year, classroomId])

      return AlphabeticFormatter.alphaStuWQuestions(queryResult as {[key:string]:any}[])

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
      c.nickname AS classroom_nickname,
      
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
      d.name AS disability_name,
      d.official AS disability_official`;

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
    AND c.id NOT IN (1216, 1217, 1218, 1509)
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

      return AlphabeticFormatter.alphaQuestions(rows, hasQuestions)
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }
}

export const alphabeticReportRepository = new AlphabeticReportRepository()
