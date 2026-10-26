import { Test } from "../../model/Test";
import { Helper } from "../helpers";

export class StudentFormatter {

  static duplicatedStudents(studentClassrooms: any[]): any {
    const count = studentClassrooms.reduce((acc, item) => {
      acc[item.student.id] = (acc[item.student.id] || 0) + 1;
      return acc
    }, {} as Record<number, number>);

    const duplicatedStudents = studentClassrooms
      .filter(item => count[item.student.id] > 1)
      .map(d => d.endedAt ? { ...d, ignore: true } : d);

    return studentClassrooms.map(item => {
      const duplicated = duplicatedStudents.find(d => d.id === item.id);
      return duplicated ? duplicated : item;
    });
  }

  static inactivesMappedResult(rows: any) {
    return rows.map((row: any) => ({
      id: row.student_id,
      ra: row.student_ra,
      dv: row.student_dv,
      observationOne: row.student_observationOne,
      observationTwo: row.student_observationTwo,
      active: row.student_active === 1 || row.student_active === true,
      person: row.person_id ? {
        id: row.person_id,
        name: row.person_name,
        birth: row.person_birth
      } : null,
      state: row.state_id ? {
        id: row.state_id,
        name: row.state_name,
        acronym: row.state_acronym
      } : null,
      studentClassrooms: row.sc_id ? [{
        id: row.sc_id,
        rosterNumber: row.sc_rosterNumber,
        startedAt: row.sc_startedAt,
        endedAt: row.sc_endedAt,
        classroom: row.classroom_id ? {
          id: row.classroom_id,
          name: row.classroom_name,
          shortName: row.classroom_shortName,
          school: row.school_id ? {
            id: row.school_id,
            name: row.school_name,
            shortName: row.school_shortName,
            inep: row.school_inep,
            active: row.school_active === 1 || row.school_active === true
          } : null
        } : null,
        year: row.year_id ? {
          id: row.year_id,
          name: row.year_name,
          active: row.year_active === 1 || row.year_active === true
        } : null
      }] : []
    }))
  }

  static studentQuestions(test: Test, rows: any[]) {
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
            studentQuestions: [],
            studentDisabilities: []
          },
          studentStatus: [],
          classroom: {
            id: row.classroom_id,
            name: row.classroom_name,
            shortName: row.classroom_shortName,
            school: {
              id: row.school_id,
              name: row.school_name,
              shortName: row.school_shortName,
              inep: row.school_inep,
              active: row.school_active
            }
          }
        });
      }

      const sc = studentClassroomsMap.get(scId);

      // Adicionar studentStatus (evitar duplicatas)
      if (row.studentStatus_id && !sc.studentStatus.find((ss:any) => ss.id === row.studentStatus_id)) {
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
              id: row.period_id
            }
          }
        });
      }

      // Adicionar studentQuestions (evitar duplicatas)
      if (row.sq_id && !sc.student.studentQuestions.find((sq:any) => sq.id === row.sq_id)) {
        sc.student.studentQuestions.push({
          id: row.sq_id,
          answer: row.sq_answer,
          score: row.sq_score,
          rClassroom: row.rClassroom_id ? {
            id: row.rClassroom_id,
            name: row.rClassroom_name,
            shortName: row.rClassroom_shortName
          } : null,
          testQuestion: row.tq_id ? {
            id: row.tq_id,
            order: row.tq_order,
            answer: row.tq_answer,
            active: row.tq_active,
            createdAt: row.tq_createdAt,
            updatedAt: row.tq_updatedAt,
            createdByUser: row.tq_createdByUser,
            updatedByUser: row.tq_updatedByUser
          } : null
        });
      }

      // Adicionar studentDisabilities (evitar duplicatas)
      if (row.sd_id && !sc.student.studentDisabilities.find((sd:any) => sd.id === row.sd_id)) {
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

  static studentDisabilities(rows: any[], arr: any[]) {
    const disabilitiesByStudent = new Map();

    for (const row of rows as any[]) {
      if (!disabilitiesByStudent.has(row.studentId)) {
        disabilitiesByStudent.set(row.studentId, []);
      }
      disabilitiesByStudent.get(row.studentId).push({
        id: row.id,
        startedAt: row.startedAt,
        endedAt: row.endedAt,
        disability: { id: row.disability_id, name: row.disability_name, official: row.disability_official }
      });
    }

    for (const item of arr) { item.student.studentDisabilities = disabilitiesByStudent.get(item.student.id) || [] }

    return arr;
  }

  // Usado por student.ts (findOneStudentById, updateIdWithAuth) pra formatar o resultado
  // "achatado" de qStudentFullDetail(). startedAt/endedAt/birth precisam da conversão UTC
  // porque a query roda no pool mysql2 (dateStrings: true) — o TypeORM original devolvia
  // Date nesses três campos (driver dele não usa dateStrings).
  static studentDetail(student: any) {
    return {
      id: student.studentClassroom_id,
      rosterNumber: student.studentClassroom_rosterNumber,
      startedAt: Helper.toUtcDate(student.studentClassroom_startedAt),
      endedAt: Helper.toUtcDate(student.studentClassroom_endedAt),
      student: {
        id: student.student_id,
        ra: student.student_ra,
        dv: student.student_dv,
        observationOne: student.student_observationOne,
        observationTwo: student.student_observationTwo,
        state: {
          id: student.state_id,
          acronym: student.state_acronym,
        },
        person: {
          id: student.person_id,
          name: student.person_name,
          birth: Helper.toUtcDate(student.person_birth),
        },
        disabilities:
          student.disabilities
            ?.split(",")
            .map((disabilityId: string) => Number(disabilityId)) ?? [],
      },
      classroom: {
        id: student.classroom_id,
        shortName: student.classroom_shortName,
        school: {
          id: student.school_id,
          shortName: student.school_shortName,
        },
      },
    };
  }

  static studentClassroom(arr: any[]) {
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

  static studentsClassrooms(arr: { id: number, name: string, shortName: string, nickname: string, shiftId: number, categoryId: number, school: string, rosterNumber: number, student: string, birth: string, studentId: number, ra: string, studentClassroomId: number }[]) {
    return arr.reduce((acc, prev) => {
      if(!acc.id) { acc.id = prev.id; acc.name = prev.name; acc.shortName = prev.shortName; acc.nickname = prev.nickname; acc.shiftId = prev.shiftId; acc.categoryId = prev.categoryId; acc.school = prev.school; acc.students = [] }
      acc.students.push({ rosterNumber: prev.rosterNumber, student: prev.student, birth: prev.birth, studentId: prev.studentId, ra: prev.ra, studentClassroomId: prev.studentClassroomId });
      return acc;
    }, {} as { id: number, name: string, shortName: string, nickname: string, shiftId: number, categoryId: number, school: string, students: { rosterNumber: number, student: string, birth: string, studentId: number, ra: string, studentClassroomId: number }[] })
  }

  static formatDuplicatedStudent(rows: any[]) {
    return rows.map((item) => ({
      aluno: item.aluno,
      dataNascimento: item.data_nascimento_ptbr, // Vai para a coluna visual da tabela
      justificativa: item.justificativa,
      certo: {
        id: item.studentIdCerto,
        ra: item.ra_certo,
        dv: item.dv_certo,
        salasAtivas: item.ativas_certo,
        questoes: item.questoes_certo
      },
      errado: {
        id: item.studentIdDeletar,
        ra: item.ra_errado,
        dv: item.dv_errado,
        salasAtivas: item.ativas_errado,
        questoes: item.questoes_errado
      },
      payloadAplicar: {
        studentIdCerto: item.studentIdCerto,
        studentIdDeletar: item.studentIdDeletar,
        novoRa: item.ra_certo,
        novoDv: item.dv_certo,
        novaDataNascimento: item.data_nascimento_db // Mantém o formato YYYY-MM-DD original para o SQL
      }
    }));
  }
}
