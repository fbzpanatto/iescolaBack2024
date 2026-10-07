// Fixtures sintéticas (em memória) para os testes de caracterização do percentual da sala.
// Nenhum acesso a banco: toda leitura do controller é substituída por stubs.

export const CLASSROOM_ID = 101
export const OTHER_CLASSROOM_ID = 202
export const SCHOOL_ID = 1
export const TEST_ID = 268

export type CellSpec = { answer: string, room: number | null }
export type StudentSpec = { name: string, endedAt?: string | null, cells: CellSpec[] }

// 4 questões ativas (gabaritos A,B,C,D) + 1 inativa (E) — a inativa nunca entra na conta.
export const TEST_QUESTIONS = [
  { id: 1, order: 1, answer: 'A', active: true },
  { id: 2, order: 2, answer: 'B', active: true },
  { id: 3, order: 3, answer: 'C', active: true },
  { id: 4, order: 4, answer: 'D', active: true },
  { id: 5, order: 5, answer: 'E', active: false },
]

const R = CLASSROOM_ID
const O = OTHER_CLASSROOM_ID
const cell = (answer: string, room: number | null = R): CellSpec => ({ answer, room })
const empty = (): CellSpec => ({ answer: '', room: null })

const allRight = (name: string): StudentSpec => ({ name, cells: [cell('A'), cell('B'), cell('C'), cell('D'), cell('E')] })
const mixed = (name: string): StudentSpec => ({ name, cells: [cell('A'), cell('C'), cell('C'), cell('A'), cell('E')] })

export const SCENARIOS: Record<string, StudentSpec[]> = {
  complete: [allRight('S1'), mixed('S2'), allRight('S3'), mixed('S4')],
  withEmptyCell: [allRight('S1'), mixed('S2'), { name: 'S3', cells: [cell('A'), empty(), cell('C'), cell('D'), cell('E')] }, allRight('S4')],
  withEmptyCellLastQuestion: [allRight('S1'), mixed('S2'), { name: 'S3', cells: [cell('A'), cell('B'), cell('C'), empty(), cell('E')] }, allRight('S4')],
  withNoAnswerStudent: [allRight('S1'), mixed('S2'), { name: 'S3', cells: [empty(), empty(), empty(), empty(), empty()] }, allRight('S4')],
  withOeAndTr: [
    allRight('S1'), mixed('S2'),
    { name: 'OE', endedAt: null, cells: [cell('A', O), cell('B', O), cell('C', O), cell('D', O), cell('E', O)] },
    { name: 'TR', endedAt: '2025-05-01', cells: [cell('A', O), cell('B', O), cell('C', O), cell('D', O), cell('E', O)] },
  ],
  withInactiveStudent: [allRight('S1'), mixed('S2'), { name: 'S3', endedAt: '2025-05-01', cells: [cell('A'), cell('B'), cell('X'), cell('D'), cell('E')] }, allRight('S4')],
  combined: [
    allRight('S1'), mixed('S2'),
    { name: 'S3', cells: [cell('A'), empty(), cell('C'), cell('D'), cell('E')] },
    { name: 'NOANS', cells: [empty(), empty(), empty(), empty(), empty()] },
    { name: 'OE', endedAt: null, cells: [cell('A', O), cell('B', O), cell('C', O), cell('D', O), cell('E', O)] },
    { name: 'TR', endedAt: '2025-05-01', cells: [cell('A', O), cell('B', O), cell('C', O), cell('D', O), cell('E', O)] },
    { name: 'INACT', endedAt: '2025-05-01', cells: [cell('A'), cell('B'), cell('X'), cell('D'), cell('E')] },
  ],
}

// Cenário do caso real: 16 alunos × 8 questões, 115 acertos de 128, questão 7 vazia em 1 aluno.
export const REAL_CASE = (() => {
  const questions = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, order: i + 1, answer: 'A', active: true }))
  // 13 erros em 127 respostas dadas + 1 vazia => 115 acertos.
  const wrongBudget = 12
  let wrong = 0
  const students: StudentSpec[] = Array.from({ length: 16 }, (_, s) => ({
    name: `S${s + 1}`,
    cells: questions.map(q => {
      if (s === 0 && q.order === 7) { return empty() }
      if (wrong < wrongBudget && q.order !== 7 && (s * 8 + q.order) % 10 === 0) { wrong += 1; return cell('B') }
      return cell('A')
    })
  }))
  return { questions, students }
})()

// ---------- construção das entradas das duas telas ----------

// Entrada da tela A (retorno de getStudentsQuestionsSql / Helper.studentQuestions).
export function buildStudentClassrooms(students: StudentSpec[], questions = TEST_QUESTIONS) {
  return students.map((s, si) => ({
    id: 1000 + si,
    startedAt: '2025-02-01',
    endedAt: s.endedAt ?? null,
    rosterNumber: si + 1,
    student: {
      id: 500 + si,
      person: { id: 900 + si, name: s.name },
      studentQuestions: questions.map((tq, qi) => ({
        id: 10000 + si * 100 + qi,
        answer: s.cells[qi]?.answer ?? '',
        rClassroom: s.cells[qi]?.room ? { id: s.cells[qi].room, name: 'x', shortName: 'x' } : null,
        testQuestion: { id: tq.id, order: tq.order, answer: tq.answer, active: tq.active }
      })),
      studentDisabilities: []
    },
    studentStatus: [{ id: 1, active: true }],
    classroom: { id: R }
  }))
}

// Entrada da tela B: linhas "planas" do SQL de qGraphTest, consumidas por Helper.testGraph.
export function buildGraphRows(students: StudentSpec[], questions = TEST_QUESTIONS) {
  const rows: Record<string, unknown>[] = []
  students.forEach((s, si) => {
    questions.forEach((tq, qi) => {
      rows.push({
        school_id: SCHOOL_ID, school_name: 'ESCOLA X', school_shortName: 'EX',
        classroom_id: R, classroom_name: '3º ANO A', classroom_shortName: '3A',
        studentClassroom_id: 1000 + si, rosterNumber: si + 1, startedAt: '2025-02-01', endedAt: s.endedAt ?? null,
        student_id: 500 + si,
        studentQuestion_id: 10000 + si * 100 + qi,
        studentQuestion_answer: s.cells[qi]?.answer ?? '',
        studentQuestion_rClassroomId: s.cells[qi]?.room ?? null,
        testQuestion_id: tq.id, testQuestion_order: tq.order, testQuestion_answer: tq.answer, testQuestion_active: tq.active,
        test_id: TEST_ID, questionGroup_id: 1
      })
    })
  })
  return rows
}

export const TEST_ROW = (categoryId: number) => ({
  id: TEST_ID, name: 'Prova', createdAt: '2025-01-01', active: true, hideAnswers: false,
  test_category_id: categoryId, test_category_name: 'cat',
  period_id: 1, bimester_id: 1, bimester_name: '1º', bimester_testName: '1º', year_id: 1, year_name: '2025',
  discipline_id: 1, discipline_name: 'Port'
})
