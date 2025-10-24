import { Test } from "../model/Test";

export function helperDuplicatedStudents(studentClassrooms: any[]): any {
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

export function helperSchoolDataStructure(pResult: any[], formatedTest: any, questionGroups: any, qTestQuestions: any) {

  const answersLettersMap = new Map<string, Map<string, any>>()

  const schools = pResult
    .filter(s => s.classrooms.some((c: any) => c.studentClassrooms.some((sc: any) => sc.student.studentQuestions.some((sq: any) => sq.answer?.length > 0))))
    .map(s => {
      const studentCountMap = new Map<number, number>()
      const validStudentClassrooms: any[] = []

      for (const c of s.classrooms) {
        for (const sc of c.studentClassrooms) {
          const hasValidAnswers = sc.student.studentQuestions.some((sq: any) => sq.answer?.length > 0 && sq.rClassroom?.id === c.id)

          if (hasValidAnswers) {
            const count = studentCountMap.get(sc.student.id) || 0
            studentCountMap.set(sc.student.id, count + 1)
            validStudentClassrooms.push(sc)
          }
        }
      }

      // Filtrar duplicados
      const filtered = validStudentClassrooms.filter(sc => {
        const studentCount = studentCountMap.get(sc.student.id)
        if (!studentCount) return true // Se não está no map, não é duplicado

        const isDuplicate = studentCount > 1 && sc.endedAt
        return !isDuplicate
      })

      const totals = qTestQuestions.map((tQ: any) => {
        if (!tQ.active) { return { id: tQ.id, order: tQ.order, tNumber: 0, tPercent: 0, tRate: 0 } }

        let matchedCount = 0

        for (const sc of filtered) {
          for (const sq of sc.student.studentQuestions) {
            if (sq.testQuestion?.id === tQ.id &&
              sq.answer?.length > 0 &&
              sq.rClassroom?.id === sc.classroom.id) {

              const letter = sq.answer.trim().toUpperCase() || 'VAZIO'

              if (!answersLettersMap.has(letter)) { answersLettersMap.set(letter, new Map()) }

              const letterMap = answersLettersMap.get(letter)!
              const key = `${tQ.id}-${tQ.order}`

              if (!letterMap.has(key)) {
                letterMap.set(key, { id: tQ.id, order: tQ.order, occurrences: 0, percentage: 0 })
              }

              const occurrence = letterMap.get(key)!
              occurrence.occurrences++

              if (tQ.answer?.includes(letter)) { matchedCount++ }
            }
          }
        }

        const total = filtered.length
        const tRate = total > 0 ? Math.floor((matchedCount / total) * 10000) / 100 : 0

        return { id: tQ.id, order: tQ.order, tNumber: matchedCount, tPercent: total, tRate }
      })

      return { id: s.id, name: s.name, shortName: s.shortName, schoolId: s.id, schoolAvg: 0, totals }
    })

  const allResultsMap = new Map<number, any>()

  for (const school of schools) {
    for (const item of school.totals) {
      const existing = allResultsMap.get(item.id)
      if (!existing) { allResultsMap.set(item.id, { ...item }) }
      else {
        existing.tNumber += item.tNumber
        existing.tPercent += item.tPercent
        existing.tRate = existing.tPercent > 0 ? Math.floor((existing.tNumber / existing.tPercent) * 10000) / 100 : 0
      }
    }
  }

  const allResults = Array.from(allResultsMap.values())

  const cityHall = { id: 999, name: 'PREFEITURA DO MUNICÍPIO DE ITATIBA', shortName: 'ITATIBA', totals: allResults, schoolAvg: 0 }

  const firstElement = cityHall.totals[0]?.tPercent ?? 0

  const answersLetters = Array.from(answersLettersMap.entries()).map(([letter, questions]) => ({
    letter,
    questions: Array.from(questions.values()).map(q => ({ ...q, percentage: firstElement > 0 ? Math.floor((q.occurrences / firstElement) * 10000) / 100 : 0 }))
  }))

  const mappedSchools = [...schools, cityHall].map(school => {
    const tNumberTotal = school.totals.reduce((acc: any, item: any) => acc + item.tNumber, 0)
    const tPercentTotal = school.totals.reduce((acc: any, item: any) => acc + item.tPercent, 0)
    return {...school, tNumberTotal, tPercentTotal, schoolAvg: tPercentTotal > 0 ? Math.floor((tNumberTotal / tPercentTotal) * 10000) / 100 : 0 }
  })

  return { ...formatedTest, totalOfStudents: firstElement, schools: mappedSchools, testQuestions: qTestQuestions, questionGroups, answersLetters }
}

export function helperClassroomDataStructure(pResult: any[], formatedTest: any, questionGroups: any, qTestQuestions: any, schoolId: number, classroomNumber: string) {

  const targetSchool = pResult.find(s => s.id === schoolId);

  if (!targetSchool) { return { status: 404, message: "Escola não encontrada" } }

  const classroomResults = targetSchool.classrooms
    .filter((c: any) => c.shortName.replace(/\D/g, "") === classroomNumber && c.studentClassrooms.some((sc: any) => sc.student.studentQuestions.some((sq: any) => sq.answer?.length > 0)))
    .map((classroom: any) => {
      const studentCountMap = new Map<number, number>();

      for (const sc of classroom.studentClassrooms) { const count = studentCountMap.get(sc.student.id) || 0; studentCountMap.set(sc.student.id, count + 1) }

      const filtered = classroom.studentClassrooms.filter((sc: any) => {
        const hasValidAnswers = sc.student.studentQuestions.some((sq: any) => sq.answer?.length > 0 && sq.rClassroom?.id === classroom.id);

        if (!hasValidAnswers) return false;

        const studentCount = studentCountMap.get(sc.student.id);
        if (!studentCount) return true;

        const isDuplicate = studentCount > 1 && sc.endedAt;
        return !isDuplicate;
      });

      const questionMap = new Map<number, any[]>();

      for (const sc of filtered) {
        for (const sq of sc.student.studentQuestions) {
          if (sq.answer?.length > 0 && sq.rClassroom?.id === classroom.id) {
            if (!questionMap.has(sq.testQuestion.id)) { questionMap.set(sq.testQuestion.id, []) }
            questionMap.get(sq.testQuestion.id)!.push(sq);
          }
        }
      }

      // Calcular totais por questão
      const totals = qTestQuestions.map((tQ: any) => {
        if (!tQ.active) {
          return { id: tQ.id, order: tQ.order, tNumber: 0, tPercent: 0, tRate: 0 };
        }

        const studentsQuestions = questionMap.get(tQ.id) || [];
        const matchedQuestions = studentsQuestions.filter(sq =>
          tQ.answer?.includes(sq.answer.toUpperCase())
        ).length;

        const total = filtered.length;
        const tRate = matchedQuestions > 0 && total > 0
          ? Math.floor((matchedQuestions / total) * 10000) / 100
          : 0;

        return {
          id: tQ.id,
          order: tQ.order,
          tNumber: matchedQuestions,
          tPercent: total,
          tRate
        };
      });

      return {
        id: classroom.id,
        name: classroom.name,
        shortName: classroom.shortName,
        school: targetSchool.name,
        schoolId: targetSchool.id,
        clNumber: classroom.shortName.replace(/\D/g, ""),
        totals
      };
    });

  const allResultsMap = new Map<number, any>();

  for (const school of pResult) {
    for (const classroom of school.classrooms) {

      const studentCountMap = new Map<number, number>();

      for (const sc of classroom.studentClassrooms) { const count = studentCountMap.get(sc.student.id) || 0; studentCountMap.set(sc.student.id, count + 1) }

      const filtered = classroom.studentClassrooms.filter((sc: any) => {
        const hasValidAnswers = sc.student.studentQuestions.some((sq: any) => sq.answer?.length > 0 && sq.rClassroom?.id === classroom.id);

        if (!hasValidAnswers) return false;

        const studentCount = studentCountMap.get(sc.student.id);
        if (!studentCount) return true;

        const isDuplicate = studentCount > 1 && sc.endedAt;
        return !isDuplicate;
      });

      const questionMap = new Map<number, any[]>();

      for (const sc of filtered) {
        for (const sq of sc.student.studentQuestions) {
          if (sq.answer?.length > 0 && sq.rClassroom?.id === classroom.id) {
            if (!questionMap.has(sq.testQuestion.id)) { questionMap.set(sq.testQuestion.id, []) }
            questionMap.get(sq.testQuestion.id)!.push(sq);
          }
        }
      }

      for (const tQ of qTestQuestions) {
        if (!tQ.active) continue;

        const studentsQuestions = questionMap.get(tQ.id) || [];
        const matchedQuestions = studentsQuestions.filter(sq => tQ.answer?.includes(sq.answer.toUpperCase())).length;

        const total = filtered.length;

        const existing = allResultsMap.get(tQ.id);

        if (!existing) { allResultsMap.set(tQ.id, {id: tQ.id, order: tQ.order, tNumber: matchedQuestions, tPercent: total, tRate: 0 }) }
        else { existing.tNumber += matchedQuestions; existing.tPercent += total }
      }
    }
  }

  const allResults = Array.from(allResultsMap.values()).map(item => ({ ...item, tRate: item.tPercent > 0 ? Math.floor((item.tNumber / item.tPercent) * 10000) / 100 : 0 }));

  const cityHall = { id: 999, name: 'ITATIBA', shortName: 'ITA', school: 'ITATIBA', totals: allResults };

  const allClassrooms = [ ...classroomResults.sort((a: any, b: any) => a.shortName.localeCompare(b.shortName)), cityHall ]
    .map(c => {
      const { tNumber, tPercent } = c.totals.reduce((acc: any, item: any) => {
        acc.tNumber += Number(item.tNumber);
        acc.tPercent += Number(item.tPercent);
        return acc;
      }, { tNumber: 0, tPercent: 0 });

      const tRateAvg = tPercent > 0 ? Math.floor((tNumber / tPercent) * 10000) / 100 : 0;

      return { ...c, tRateAvg };
    });

  return { ...formatedTest, testQuestions: qTestQuestions, questionGroups, classrooms: allClassrooms };
}

export function helperStudentQuestions(test: Test, rows: any[]) {
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

  return helperDuplicatedStudents(studentClassrooms).map((sc: any) => ({
    ...sc,
    studentStatus: sc.studentStatus.find((studentStatus: any) => studentStatus.test.id === test.id)
  }));
}