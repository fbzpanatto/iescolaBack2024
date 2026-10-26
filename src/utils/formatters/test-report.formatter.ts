import { SCORED_TEST_CATEGORIES_IDS } from "../enums";

export class TestReportFormatter {

  static schoolDataStructure(pResult: any[], formatedTest: any, questionGroups: any, qTestQuestions: any, testSchools: any[] = []) {

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

    for (const tQ of qTestQuestions) {
      allResultsMap.set(tQ.id, { id: tQ.id, order: tQ.order, tNumber: 0, tPercent: 0, tRate: 0 })
    }

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

    const cityHall = { id: 999, name: 'PREFEITURA DO MUNICÍPIO DE ITATIBA', shortName: 'ITATIBA', totals: allResults, schoolAvg: 0, accessed: schools.length > 0 }

    const firstElement = cityHall.totals[0]?.tPercent ?? 0

    const answersLetters = Array.from(answersLettersMap.entries()).map(([letter, questions]) => ({
      letter,
      questions: Array.from(questions.values()).map(q => ({ ...q, percentage: firstElement > 0 ? Math.floor((q.occurrences / firstElement) * 10000) / 100 : 0 }))
    }))

    const mappedSchools = [...schools, cityHall].map((school: any) => {
      const tNumberTotal = school.totals.reduce((acc: any, item: any) => acc + item.tNumber, 0)
      const tPercentTotal = school.totals.reduce((acc: any, item: any) => acc + item.tPercent, 0)
      return { ...school, tNumberTotal, tPercentTotal, schoolAvg: tPercentTotal > 0 ? Math.floor((tNumberTotal / tPercentTotal) * 10000) / 100 : 0, accessed: school.accessed ?? true }
    })

    // Escolas da prova SEM nenhum lançamento — aparecem zeradas e brancas.
    // "Sem lançamento" = não está em mappedSchools (que só contém quem passou
    // no filtro de answer?.length > 0). Acesso é irrelevante aqui.
    const launchedSchoolIds = new Set(mappedSchools.map((s: any) => s.id))
    const emptySchoolsMap = new Map<number, { id: number, name: string, shortName: string }>()

    for (const row of testSchools) {
      if (!launchedSchoolIds.has(row.school_id) && !emptySchoolsMap.has(row.school_id)) {
        emptySchoolsMap.set(row.school_id, { id: row.school_id, name: row.school_name, shortName: row.school_shortName })
      }
    }

    const emptyTotals = qTestQuestions.map((tQ: any) => ({ id: tQ.id, order: tQ.order, tNumber: 0, tPercent: 0, tRate: 0 }))

    const emptySchools = Array.from(emptySchoolsMap.values())
      .map(s => ({ id: s.id, name: s.name, shortName: s.shortName, schoolId: s.id, schoolAvg: 0, tNumberTotal: 0, tPercentTotal: 0, accessed: false, totals: emptyTotals }))

    const allSchools = [...mappedSchools, ...emptySchools].sort((a: any, b: any) => {
      if (a.id === 999) return 1
      if (b.id === 999) return -1
      return a.shortName.localeCompare(b.shortName)
    })

    return { ...formatedTest, totalOfStudents: firstElement, schools: allSchools, testQuestions: qTestQuestions, questionGroups, answersLetters }
  }

  static isScoredTestCategory(categoryId: number): boolean { return SCORED_TEST_CATEGORIES_IDS.includes(categoryId) }

  // Percentual com 2 casas (floor). Fórmula única das telas de gabarito e comparativo de AVL/SIM.
  // Sem guarda de denominador de propósito: cada chamador mantém o seu tratamento de total = 0.
  static scoreRate(hits: number, total: number): number { return Math.floor((hits / total) * 10000) / 100 }

  // Célula sem resposta e ainda sem sala vinculada (linha criada pelo vínculo prova-aluno).
  // Para o aluno elegível ela conta como erro, ou seja, fica no denominador.
  static isUnassignedEmptyCell(cell: { answer?: string | null, rClassroom?: { id?: number | null } | null } | undefined): boolean {
    if (!cell) { return true }
    return !cell.rClassroom?.id && !(cell.answer ?? '').trim().length
  }

  static classroomDataStructure(pResult: any[], formatedTest: any, questionGroups: any, qTestQuestions: any, schoolId: number, classroomNumber: string) {

    const targetSchool = pResult.find(s => s.id === schoolId);

    if (!targetSchool) { return { status: 404, message: "Escola não encontrada" } }

    // 1. Processamento das Turmas
    const classroomResults = targetSchool.classrooms
      .filter((c: any) => c.shortName.replace(/\D/g, "") === classroomNumber && c.studentClassrooms.some((sc: any) => sc.student.studentQuestions.some((sq: any) => sq.answer?.length > 0)))
      .map((classroom: any) => {

        const { filtered, questionMap } = TestReportFormatter.processClassroomData(classroom);

        const totals = qTestQuestions.map((tQ: any) => {
          if (!tQ.active) return { id: tQ.id, order: tQ.order, tNumber: 0, tPercent: 0, tRate: 0 };
          const studentsQuestions = questionMap.get(tQ.id) || [];
          const matchedQuestions = studentsQuestions.filter((sq: any) => tQ.answer?.includes(sq.answer.toUpperCase())).length;
          const total = filtered.length;
          const tRate = matchedQuestions > 0 && total > 0 ? TestReportFormatter.scoreRate(matchedQuestions, total) : 0;
          return { id: tQ.id, order: tQ.order, tNumber: matchedQuestions, tPercent: total, tRate };
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

    // 2. Processamento da Escola
    const schoolTotalsMap = new Map<number, any>();

    for (const cr of classroomResults) {
      for (const t of cr.totals) {
        const existing = schoolTotalsMap.get(t.id);
        if (!existing) { schoolTotalsMap.set(t.id, { ...t }) }
        else { existing.tNumber += t.tNumber; existing.tPercent += t.tPercent }
      }
    }

    const schoolTotals = Array.from(schoolTotalsMap.values()).map(item => ({ ...item, tRate: item.tPercent > 0 ? TestReportFormatter.scoreRate(item.tNumber, item.tPercent) : 0 }));

    const schoolAggregate = {
      id: targetSchool.id,
      name: 'ESCOLA',
      shortName: 'ESCOLA',
      school: 'ESCOLA',
      schoolId: targetSchool.id,
      totals: schoolTotals
    };

    // 3. Processamento de ITATIBA (Rede)
    const allResultsMap = new Map<number, any>();

    // CORREÇÃO AQUI: Pré-popula o mapa garantindo que a estrutura base tenha todas as questões, ativas ou inativas.
    for (const tQ of qTestQuestions) {
      allResultsMap.set(tQ.id, { id: tQ.id, order: tQ.order, tNumber: 0, tPercent: 0, tRate: 0 });
    }

    for (const school of pResult) {

      const relevantClassrooms = school.classrooms.filter((c: any) => c.shortName.replace(/\D/g, "") === classroomNumber);

      for (const classroom of relevantClassrooms) {

        const { filtered, questionMap } = TestReportFormatter.processClassroomData(classroom);

        for (const tQ of qTestQuestions) {
          // Se for inativa, o 'continue' pula para a próxima, mas a questão já está garantida como '0' no allResultsMap
          if (!tQ.active) continue;

          const studentsQuestions = questionMap.get(tQ.id) || [];
          const matchedQuestions = studentsQuestions.filter((sq: any) => tQ.answer?.includes(sq.answer.toUpperCase())).length;
          const total = filtered.length;

          // Como pré-populamos o mapa, 'existing' sempre será encontrado
          const existing = allResultsMap.get(tQ.id);
          existing.tNumber += matchedQuestions;
          existing.tPercent += total;
        }
      }
    }

    // Mapeia os totais finais calculando a taxa (tRate) e garante a ordenação original das questões
    const allResults = Array.from(allResultsMap.values())
      .sort((a: any, b: any) => a.order - b.order)
      .map(item => ({ ...item, tRate: item.tPercent > 0 ? TestReportFormatter.scoreRate(item.tNumber, item.tPercent) : 0 }));

    const cityHall = { id: 999, name: 'ITATIBA', shortName: 'ITA', school: 'ITATIBA', totals: allResults };

    // 4. Montagem do Retorno
    const allClassrooms = [
      ...classroomResults.sort((a: any, b: any) => a.shortName.localeCompare(b.shortName)),
      schoolAggregate,
      cityHall
    ]
      .map(c => {
        const { tNumber, tPercent } = c.totals.reduce((acc: any, item: any) => {
          acc.tNumber += Number(item.tNumber);
          acc.tPercent += Number(item.tPercent);
          return acc;
        }, { tNumber: 0, tPercent: 0 });
        const tRateAvg = tPercent > 0 ? TestReportFormatter.scoreRate(tNumber, tPercent) : 0;

        return { ...c, tRateAvg };
      });

    return { ...formatedTest, testQuestions: qTestQuestions, questionGroups, classrooms: allClassrooms };
  }

  static processClassroomData(classroom: any) {
    const studentCountMap = new Map<number, number>();
    for (const sc of classroom.studentClassrooms) {
      const count = studentCountMap.get(sc.student.id) || 0;
      studentCountMap.set(sc.student.id, count + 1);
    }

    const filtered = classroom.studentClassrooms.filter((sc: any) => {
      const hasValidAnswers = sc.student.studentQuestions.some((sq: any) =>
        sq.answer?.length > 0 && sq.rClassroom?.id === classroom.id
      );

      if (!hasValidAnswers) return false;

      const studentCount = studentCountMap.get(sc.student.id);
      const isDuplicateInactive = studentCount! > 1 && sc.endedAt;

      return !isDuplicateInactive;
    });

    const questionMap = new Map<number, any[]>();
    for (const sc of filtered) {
      for (const sq of sc.student.studentQuestions) {
        if (sq.answer?.length > 0 && sq.rClassroom?.id === classroom.id) {
          if (!questionMap.has(sq.testQuestion.id)) {
            questionMap.set(sq.testQuestion.id, []);
          }
          questionMap.get(sq.testQuestion.id)!.push(sq);
        }
      }
    }

    return { filtered, questionMap };
  }

  static testGraph(rows: any[]) {
    const schoolsMap = new Map();

    for (const row of rows) {
      // Estrutura escola
      if (!schoolsMap.has(row.school_id)) {
        schoolsMap.set(row.school_id, {
          id: row.school_id,
          name: row.school_name,
          shortName: row.school_shortName,
          classrooms: new Map()
        });
      }

      const school = schoolsMap.get(row.school_id);

      // Estrutura classroom
      if (!school.classrooms.has(row.classroom_id)) {
        school.classrooms.set(row.classroom_id, {
          id: row.classroom_id,
          name: row.classroom_name,
          shortName: row.classroom_shortName,
          studentClassrooms: new Map()
        });
      }

      const classroom = school.classrooms.get(row.classroom_id);

      // Estrutura studentClassroom
      if (!classroom.studentClassrooms.has(row.studentClassroom_id)) {
        classroom.studentClassrooms.set(row.studentClassroom_id, {
          id: row.studentClassroom_id,
          rosterNumber: row.rosterNumber,
          startedAt: row.startedAt,
          endedAt: row.endedAt,
          classroom: {
            id: row.classroom_id,
            shortName: row.classroom_shortName
          },
          student: {
            id: row.student_id,
            studentQuestions: []
          }
        });
      }

      const studentClassroom = classroom.studentClassrooms.get(row.studentClassroom_id);

      // Adicionar studentQuestion se existir
      if (row.studentQuestion_id) {
        const questionExists = studentClassroom.student.studentQuestions.some(
          (sq: any) => sq.id === row.studentQuestion_id
        );

        if (!questionExists) {
          studentClassroom.student.studentQuestions.push({
            id: row.studentQuestion_id,
            answer: row.studentQuestion_answer || '',
            rClassroom: {
              id: row.studentQuestion_rClassroomId
            },
            testQuestion: {
              id: row.testQuestion_id,
              order: row.testQuestion_order,
              answer: row.testQuestion_answer,
              active: row.testQuestion_active,
              test: {
                id: row.test_id,
                period: {
                  bimester: {
                    id: row.questionGroup_id  // Assumindo relação
                  }
                }
              }
            }
          });
        }
      }
    }

    const result: any[] = [];
    for (const [, school] of schoolsMap) {
      const classroomsArray: any[] = [];
      for (const [, classroom] of school.classrooms) {
        const studentClassroomsArray: any[] = [];
        for (const [, sc] of classroom.studentClassrooms) { studentClassroomsArray.push(sc) }
        classroomsArray.push({ ...classroom, studentClassrooms: studentClassroomsArray });
      }
      result.push({ ...school, classrooms: classroomsArray });
    }

    return result;
  }
}
