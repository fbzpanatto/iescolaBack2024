import { qFormatedYear, qYear } from "../../interfaces/interfaces";

export class AlphabeticFormatter {

  static alphaStuWQuestions(el: any[]) {
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

  static alphabeticYearHeader(el: qYear[]) {
    return el.reduce((acc: qFormatedYear, prev: qYear) => {
      if (!acc.id) { acc.id = prev.id; acc.name = prev.name; acc.periods = [] }
      acc.periods.push({id: prev.period_id, bimester: {id: prev.bimester_id, name: prev.bimester_name, testName: prev.bimester_testName}});
      return acc;
    }, {} as qFormatedYear)
  }

  static alphaQuestions(rows: any, hasQuestions: boolean) {

    const schoolsMap = new Map();

    for (const row of rows as any[]) {
      if (!row.school_id) continue;

      if (!schoolsMap.has(row.school_id)) {
        schoolsMap.set(row.school_id, {
          id: row.school_id,
          name: row.school_name,
          shortName: row.school_shortName,
          classrooms: []
        });
      }

      const school = schoolsMap.get(row.school_id);
      let classroom = school.classrooms.find((c: any) => c.id === row.classroom_id);

      if (!classroom) {
        classroom = {
          id: row.classroom_id,
          name: row.classroom_name,
          shortName: row.classroom_shortName,
          nickname: row.classroom_nickname,
          school: {
            id: row.school_id,
            name: row.school_name,
            shortName: row.school_shortName
          },
          studentClassrooms: []
        };
        school.classrooms.push(classroom);
      }

      let studentClassroom = classroom.studentClassrooms.find((sc: any) => sc.id === row.studentClassroom_id);

      if (!studentClassroom) {
        studentClassroom = {
          id: row.studentClassroom_id,
          rosterNumber: row.rosterNumber,
          endedAt: row.studentClassroom_endedAt,
          classroom: {
            id: row.classroom_id,
            name: row.classroom_name,
            shortName: row.classroom_shortName
          },
          student: {
            id: row.student_id,
            person: {
              id: row.person_id,
              name: row.person_name
            },
            alphabeticFirst: null,
            alphabetic: [],
            studentDisabilities: [],
            studentQuestions: hasQuestions ? [] : undefined
          }
        };

        if (row.alphabeticFirst_id) {
          studentClassroom.student.alphabeticFirst = {
            id: row.alphabeticFirst_level_id,
            name: row.alphabeticFirst_level_name,
            shortName: row.alphabeticFirst_level_shortName,
            color: row.alphabeticFirst_level_color
          };
        }

        classroom.studentClassrooms.push(studentClassroom);
      }

      // Adicionar Alphabetic
      if (row.alphabetic_id && !studentClassroom.student.alphabetic.find((a: any) => a.id === row.alphabetic_id)) {
        studentClassroom.student.alphabetic.push({
          id: row.alphabetic_id,
          observation: row.alphabetic_observation,
          alphabeticLevel: row.alphabetic_level_id ? {
            id: row.alphabetic_level_id,
            name: row.alphabetic_level_name,
            shortName: row.alphabetic_level_shortName,
            color: row.alphabetic_level_color
          } : null,
          rClassroom: row.alphabetic_rClassroom_id ? {
            id: row.alphabetic_rClassroom_id,
            name: row.alphabetic_rClassroom_name,
            shortName: row.alphabetic_rClassroom_shortName
          } : null,
          test: {
            id: row.alpha_test_id,
            name: row.alpha_test_name,
            period: {
              id: row.alpha_test_period_id,
              bimester: {
                id: row.alpha_test_bimester_id,
                name: row.alpha_test_bimester_name
              },
              year: {
                id: row.alpha_test_year_id,
                name: row.alpha_test_year_name
              }
            }
          }
        });
      }

      // Adicionar StudentDisability
      if (row.studentDisability_id && !studentClassroom.student.studentDisabilities.find((d: any) => d.id === row.studentDisability_id)) {
        studentClassroom.student.studentDisabilities.push({
          id: row.studentDisability_id,
          disability: {
            id: row.disability_id,
            name: row.disability_name,
            official: row.disability_official
          }
        });
      }

      // Adicionar StudentQuestion se houver
      if (hasQuestions && row.studentQuestion_id && !studentClassroom.student.studentQuestions.find((q: any) => q.id === row.studentQuestion_id)) {
        studentClassroom.student.studentQuestions.push({
          id: row.studentQuestion_id,
          answer: row.studentQuestion_answer || '',
          rClassroom: row.studentQuestion_rClassroom_id ? {
            id: row.studentQuestion_rClassroom_id
          } : null,
          testQuestion: row.testQuestion_id ? {
            id: row.testQuestion_id,
            order: row.testQuestion_order,
            answer: row.testQuestion_answer,
            active: row.testQuestion_active,
            test: {
              id: row.test_id,
              name: row.test_name,
              period: {
                id: row.period_id,
                bimester: {
                  id: row.bimester_id,
                  name: row.bimester_name
                },
                year: {
                  id: row.period_year_id,
                  name: row.period_year_name
                }
              }
            }
          } : null
        });
      }
    }

    return Array.from(schoolsMap.values());
  }
}
