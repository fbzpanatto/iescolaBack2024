import { qAlphaTests, qFormatedYear, qReadingFluenciesHeaders, qTestQuestions, qUserTeacher, qYear, ReadingHeaders, TrainingWithSchedulesResult, qTest } from "../interfaces/interfaces";
import { Test } from "../model/Test";

export function formatReadingFluencyHeaders(preHeaders: qReadingFluenciesHeaders[]) {
  return preHeaders.reduce((acc: ReadingHeaders[], prev) => {
    let exam = acc.find(el => el.exam_id === prev.readingFluencyExamId);
    if (!exam) {
      exam = {
        exam_id: prev.readingFluencyExamId,
        exam_name: prev.readingFluencyExamName,
        exam_color: prev.readingFluencyExamColor,
        exam_levels: []
      };
      acc.push(exam);
    }
    exam.exam_levels.push({
      level_id: prev.readingFluencyLevelId,
      level_name: prev.readingFluencyLevelName,
      level_color: prev.readingFluencyLevelColor
    });
    return acc;
  }, []);
}

export function formatTrainingsWithSchedules(queryResult: any[]): TrainingWithSchedulesResult[] {
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

export function formatStudentClassroom(arr: any[]) {
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

export function formatAlphaStuWQuestions(el: any[]) {
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

export function formatTestQuestions(arr: qTestQuestions[]) {
  return arr.map(el => ({
    id: el.test_question_id,
    order: el.test_question_order,
    answer: el.test_question_answer ?? 'hidden',
    active: el.test_question_active,
    question: { id: el.question_id, images: el.question_images, title: el.question_title, skill: { reference: el.skill_reference, description: el.skill_description } },
    questionGroup: { id: el.question_group_id, name: el.question_group_name }
  }))
}

export function formatAlphabeticTests(arr: qAlphaTests[]) {
  return arr.map(el => {
    return {
      id: el.test_id,
      active: el.test_active,
      category: { id: el.test_category_id },
      discipline: { id: el.discipline_id, name: el.discipline_name },
      period: {
        id: el.period_id,
        bimester: { id: el.bimester_id, name: el.bimester_name, testName: el.bimester_testName },
        year: { id: el.year_id, name: el.year_name }
      }
    }
  })
}

export function formatUserTeacher(el: {[key: string]: any}) {

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

export function formatedTestHelper(qTest: qTest) {
  return {
    id: qTest.id,
    name: qTest.name,
    createdAt: qTest.createdAt,
    active: qTest.active,
    hideAnswers: qTest.hideAnswers,
    category: { id: qTest.test_category_id, name: qTest.test_category_name },
    period: {
      id: qTest.period_id,
      bimester: { id: qTest.bimester_id, name: qTest.bimester_name, testName: qTest.bimester_testName },
      year: { id: qTest.year_id, name: qTest.year_name }
    },
    discipline: { id: qTest.discipline_id, name: qTest.discipline_name },
  } as unknown as Test
}

export function formatAlphabeticYearHeader(el: qYear[]){
  return el.reduce((acc: qFormatedYear, prev: qYear) => {
    if (!acc.id) { acc.id = prev.id; acc.name = prev.name; acc.periods = [] }
    acc.periods.push({id: prev.period_id, bimester: {id: prev.bimester_id, name: prev.bimester_name, testName: prev.bimester_testName}});
    return acc;
  }, {} as qFormatedYear)
}