import { ObjectLiteral } from "typeorm";
import { qReadingFluenciesHeaders } from "../interfaces/interfaces";
import { Test } from "../model/Test";
import { connectionPool } from "../services/db";
import { Helper } from "../utils/helpers";

class ReadingFluencyLinkRepository {

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
      
      INNER JOIN test tt ON tt.id = ?
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
          (studentClassroom.startedAt <= tt.createdAt
           AND (studentClassroom.endedAt IS NULL OR studentClassroom.endedAt >= tt.createdAt))
          OR
          ((tt.active = 1 OR NOW() <= tt.endedAt)
           AND studentClassroom.endedAt IS NULL)
          OR
          sts.id IS NOT NULL
        )
        AND NOT EXISTS (
          SELECT 1
          FROM student_test_status sts_other
          INNER JOIN student_classroom sc_other ON sts_other.studentClassroomId = sc_other.id
          WHERE sts_other.testId = ?
            AND sc_other.studentId = student.id
            AND sc_other.classroomId != ?
        )
        AND NOT EXISTS (
          SELECT 1
          FROM student_classroom sc_newer
          WHERE sc_newer.studentId = studentClassroom.studentId
            AND sc_newer.classroomId = studentClassroom.classroomId
            AND sc_newer.yearId = studentClassroom.yearId
            AND sc_newer.endedAt IS NULL
            AND sc_newer.id != studentClassroom.id
        )
    `;

      const params: any[] = [test.id, test.id, test.id, classroomId];

      if (studentClassroomId) { params.push(studentClassroomId); }

      params.push(
        yearName,
        test.id,
        classroomId
      );

      const [rows] = await conn.query(query, params);

      return Helper.readingFluency(rows as Array<{[key:string]:any}>);
    }
    catch (error) { console.error(error); throw error; }
    finally { if (conn) { conn.release(); } }
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
      
      INNER JOIN test tt ON tt.id = ?
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
          (studentClassroom.startedAt <= tt.createdAt
           AND (studentClassroom.endedAt IS NULL OR studentClassroom.endedAt >= tt.createdAt))
          OR
          ((tt.active = 1 OR NOW() <= tt.endedAt)
           AND studentClassroom.endedAt IS NULL)
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
        AND NOT EXISTS (
          SELECT 1
          FROM student_classroom sc_newer
          WHERE sc_newer.studentId = studentClassroom.studentId
            AND sc_newer.classroomId = studentClassroom.classroomId
            AND sc_newer.yearId = studentClassroom.yearId
            AND sc_newer.endedAt IS NULL
            AND sc_newer.id != studentClassroom.id
        )
      
      ORDER BY 
        studentClassroom.rosterNumber ASC,
        person.name ASC
    `;

      const params: any[] = [test.id, test.id, test.id, classroomId];

      if (studentClassroomId) { params.push(studentClassroomId); }

      params.push(yearName, test.id, classroomId);

      const [rows] = await conn.query(query, params);

      return Helper.readingFluencyStudents(rows as Array<{[key:string]:any}>, test);
    }
    catch (error) { console.error(error); throw error; }
    finally { if (conn) { conn.release(); } }
  }

  async linkReadingSql(headers: qReadingFluenciesHeaders[], studentClassrooms: ObjectLiteral[], test: Test, userId: number, classroomId: number, yearName: string) {
    let conn;

    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      if (studentClassrooms.length === 0) { await conn.commit(); return }

      const studentIds = studentClassrooms.map(row => row?.student?.id ?? row?.student_id);

      // ✅ Verificar se teste está ativo/aberto
      const [testRows]: [any[], any] = await conn.query(
        `SELECT id, active, endedAt FROM test WHERE id = ?`,
        [test.id]
      );
      const currentTest = testRows[0];
      const isTestActive = currentTest.active === 1 && (currentTest.endedAt && new Date() <= new Date(currentTest.endedAt));

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
      FOR UPDATE
    `;

      const [allExisting] = await conn.query(checkAllExistingQuery, [test.id, test.id, studentIds]) as any[];

      // 🔒 NOVA ADIÇÃO: Lock em reading_fluency existentes
      const [existingReadingFluency] = await conn.query(
        `SELECT studentId, readingFluencyExamId, testId 
       FROM reading_fluency 
       WHERE testId = ? AND studentId IN (?)
       FOR UPDATE`,
        [test.id, studentIds]
      ) as any[];

      // Criar Set para verificação rápida de duplicatas
      const existingRFKeys = new Set(existingReadingFluency.map((row: any) => `${row.studentId}-${row.readingFluencyExamId}`));

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

        // ✅ Verificar se deve criar registros
        const shouldCreateRecords = isTestActive || inCurrentRoom;

        if (inOtherRoom) {
          const hasReadingFluencyFilled = inOtherRoom.has_reading_fluency_filled > 0;

          if (hasReadingFluencyFilled) { continue }
          else if (inOtherRoom.endedAt !== null) {
            if (inCurrentRoom) { toDelete.push(inCurrentRoom.id) }
            toUpdate.push({ id: inOtherRoom.id, newStudentClassroomId: studentClassroomId });
            continue;
          }
        }

        // ✅ Só insere se teste ativo ou aluno já tem vínculo
        if (!inCurrentRoom && shouldCreateRecords) { toInsert.push({ testId: test.id, studentClassroomId }) }
      }

      if (toDelete.length > 0) {
        await conn.query(`DELETE FROM student_test_status WHERE id IN (?)`, [toDelete])
      }

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

      // ✅ Criar reading_fluency com verificação de duplicatas
      for (let row of studentClassrooms) {
        const studentId = row?.student?.id ?? row?.student_id;
        const studentClassroomId = row.id;

        const existingForStudent = existingByStudent[studentId] || [];
        const inCurrentRoom = existingForStudent.find((e: any) => e.classroomId === classroomId);

        const shouldCreateRecords = isTestActive || inCurrentRoom;

        if (shouldCreateRecords) {
          for (let exam of headers) {
            // 🔒 NOVA VERIFICAÇÃO: Evita duplicatas usando o Set
            const rfKey = `${studentId}-${exam.readingFluencyExamId}`;
            if (!existingRFKeys.has(rfKey)) {
              readingFluencyValues.push('(?, ?, ?, NOW(), ?)');
              readingFluencyParams.push(exam.readingFluencyExamId, test.id, studentId, userId);
              existingRFKeys.add(rfKey); // Adiciona ao Set para evitar duplicatas no batch
            }
          }
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
    catch (error) { if (conn) { await conn.rollback() } throw error }
    finally { if (conn) { conn.release() } }
  }
}

export const readingFluencyLinkRepository = new ReadingFluencyLinkRepository()
