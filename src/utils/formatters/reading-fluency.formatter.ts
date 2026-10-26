import { Test } from "../../model/Test";
import { qReadingFluenciesHeaders, ReadingHeaders } from "../../interfaces/interfaces";
import { StudentFormatter } from "./student.formatter";

export class ReadingFluencyFormatter {

  static readingFluencyStudents(rows: any[], test: Test) {

    const studentClassroomsMap = new Map();

    for (const row of rows) {
      const scId = row.sc_id;

      if (!studentClassroomsMap.has(scId)) {
        studentClassroomsMap.set(scId, {
          id: row.sc_id,
          rosterNumber: row.sc_rosterNumber,
          startedAt: row.sc_startedAt,
          endedAt: row.sc_endedAt,
          student: {
            id: row.student_id,
            ra: row.student_ra,
            dv: row.student_dv,
            observationOne: row.student_observationOne,
            observationTwo: row.student_observationTwo,
            active: row.student_active,
            person: {
              id: row.person_id,
              name: row.person_name,
              birth: row.person_birth
            },
            readingFluency: [],
            studentDisabilities: []
          },
          classroom: {
            id: row.classroom_id,
            name: row.classroom_name,
            shortName: row.classroom_shortName
          },
          year: {
            id: row.year_id,
            name: row.year_name
          },
          studentStatus: []
        });
      }

      const sc = studentClassroomsMap.get(scId);

      // Adicionar studentStatus (evitar duplicatas)
      if (row.studentStatus_id && !sc.studentStatus.find((ss: any) => ss.id === row.studentStatus_id)) {
        sc.studentStatus.push({
          id: row.studentStatus_id,
          active: row.studentStatus_active,
          observation: row.studentStatus_observation,
          test: {
            id: row.stStatusTest_id,
            name: row.stStatusTest_name,
            active: row.stStatusTest_active,
            hideAnswers: row.stStatusTest_hideAnswers,
            createdAt: row.stStatusTest_createdAt,
            updatedAt: row.stStatusTest_updatedAt,
            createdByUser: row.stStatusTest_createdByUser,
            updatedByUser: row.stStatusTest_updatedByUser,
            period: {
              id: row.stStatusTest_periodId
            }
          }
        });
      }

      // Adicionar readingFluency (evitar duplicatas)
      if (row.rf_id && !sc.student.readingFluency.find((rf: any) => rf.id === row.rf_id)) {
        sc.student.readingFluency.push({
          id: row.rf_id,
          readingFluencyExam: row.rfExam_id ? {
            id: row.rfExam_id,
            name: row.rfExam_name,
            color: row.rfExam_color
          } : null,
          readingFluencyLevel: row.rfLevel_id ? {
            id: row.rfLevel_id,
            name: row.rfLevel_name,
            color: row.rfLevel_color
          } : null,
          rClassroom: row.rClassroom_id ? {
            id: row.rClassroom_id,
            name: row.rClassroom_name,
            shortName: row.rClassroom_shortName
          } : null,
          test: {
            id: row.stReadFluenTest_id
          }
        });
      }

      // Adicionar studentDisabilities (evitar duplicatas)
      if (row.sd_id && !sc.student.studentDisabilities.find((sd: any) => sd.id === row.sd_id)) {
        sc.student.studentDisabilities.push({
          id: row.sd_id,
          startedAt: row.sd_startedAt,
          endedAt: row.sd_endedAt,
          disability: {
            id: row.disability_id,
            name: row.disability_name,
            official: row.disability_official
          }
        });
      }
    }

    const studentClassrooms = Array.from(studentClassroomsMap.values());

    return StudentFormatter.duplicatedStudents(studentClassrooms).map((sc: any) => ({
      ...sc,
      studentStatus: sc.studentStatus.find((studentStatus: any) => studentStatus.test.id === test.id)
    }));
  }

  static readingFluencyHeaders(preHeaders: qReadingFluenciesHeaders[]) {
    return preHeaders.reduce((acc: ReadingHeaders[], prev) => {
      let exam = acc.find(el => el.exam_id === prev.readingFluencyExamId);
      if (!exam) {
        exam = {
          exam_id: prev.readingFluencyExamId,
          exam_name: prev.readingFluencyExamName,
          exam_color: prev.readingFluencyExamColor,
          exam_description: prev.readingFluencyExamDescription,
          exam_levels: []
        };
        acc.push(exam);
      }
      exam.exam_levels.push({
        level_id: prev.readingFluencyLevelId,
        level_name: prev.readingFluencyLevelName,
        level_color: prev.readingFluencyLevelColor,
        level_description: prev.readingFluencyLevelDescription
      });
      return acc;
    }, []);
  }

  static readingFluency(rows: any[]) {
    const studentClassroomsMap = new Map();
    for (const row of rows) {
      const scId = row.sc_id;

      if (!studentClassroomsMap.has(scId)) {
        studentClassroomsMap.set(scId, {
          id: row.sc_id,
          rosterNumber: row.sc_rosterNumber,
          startedAt: row.sc_startedAt,
          endedAt: row.sc_endedAt,
          student: {
            id: row.student_id,
            ra: row.student_ra,
            dv: row.student_dv,
            observationOne: row.student_observationOne,
            observationTwo: row.student_observationTwo,
            active: row.student_active,
            person: {
              id: row.person_id,
              name: row.person_name,
              birth: row.person_birth
            },
            readingFluency: []
          }
        });
      }

      const sc = studentClassroomsMap.get(scId);

      if (row.rf_id && !sc.student.readingFluency.find((rf: any) => rf.id === row.rf_id)) {
        sc.student.readingFluency.push({
          id: row.rf_id,
          readingFluencyExam: row.rfExam_id ? {
            id: row.rfExam_id,
            name: row.rfExam_name,
            color: row.rfExam_color
          } : null,
          readingFluencyLevel: row.rfLevel_id ? {
            id: row.rfLevel_id,
            name: row.rfLevel_name,
            color: row.rfLevel_color
          } : null,
          rClassroom: row.rClassroom_id ? {
            id: row.rClassroom_id,
            name: row.rClassroom_name,
            shortName: row.rClassroom_shortName
          } : null
        });
      }
    }
    return Array.from(studentClassroomsMap.values());
  }
}
