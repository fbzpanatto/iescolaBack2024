import { testController } from '../src/controller/test'
import { Helper } from '../src/utils/helpers'
import { TEST_CATEGORIES_IDS as tcids } from '../src/utils/enums'
import { CLASSROOM_ID, SCHOOL_ID, SCENARIOS, TEST_QUESTIONS, TEST_ID, TEST_ROW, buildGraphRows, buildStudentClassrooms, StudentSpec } from './fixtures'

type Json = unknown
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v))
// Serializa como a API (res.json): NaN/undefined viram null/ausentes.
const asApi = (v: unknown): Json => JSON.parse(JSON.stringify(v))

const QUESTION_GROUPS = [{ id: 1, name: 'Bloco 1', questionsCount: 4 }]

type Questions = { id: number, order: number, answer: string, active: boolean }[]

// ---- Tela A: TestController.getStudents, com todas as leituras de banco substituídas por stubs ----
export async function runStudentsEndpoint(categoryId: number, students: StudentSpec[], questions: Questions = TEST_QUESTIONS): Promise<Json> {
  const c = testController as any
  const scs = buildStudentClassrooms(students, questions as typeof TEST_QUESTIONS)
  const stubs: Record<string, (...a: any[]) => any> = {
    qTestClassroom: async () => ({ id: 1 }),
    qUser: async () => ({ userId: 1, categoryId: 1 }),
    qTeacherClassrooms: async () => ({ classrooms: [CLASSROOM_ID] }),
    qTestByIdAndYear: async () => TEST_ROW(categoryId),
    qClassroom: async () => ({ id: CLASSROOM_ID, name: '3º ANO A', shortName: '3A', school: { id: SCHOOL_ID, name: 'ESCOLA X' } }),
    qAlphabeticHeaders: async () => [],
    alphabeticTest: async () => ({ stub: 'alphabeticTest' }),
    findAndDeleteStatusAndQuestions: async () => undefined,
    updateStudentTestStatus: async () => undefined,
    qTestQuestions: async () => clone(questions),
    qTestQuestionsGroupsOnReport: async () => clone(QUESTION_GROUPS),
    qStudentClassroomsForTest: async () => [],
    unifiedTestQuestLinkSql: async () => undefined,
    getStudentsQuestionsSql: async () => clone(scs),
    findAndDeleteStatusAndReadingFluency: async () => undefined,
    updateReadingFluencyStatus: async () => undefined,
    qReadingFluencyHeaders: async () => READING_HEADERS,
    stuClassReadFSql: async () => [],
    linkReadingSql: async () => undefined,
    getReadingFluencyStudentsSql: async () => clone(READING_STUDENTS(students)),
    qStudentDisabilities: async (x: unknown) => x,
  }
  const originals: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(stubs)) { originals[k] = c[k]; c[k] = v }
  try {
    const req = { params: { id: TEST_ID, classroom: CLASSROOM_ID, year: '2025' }, query: {} } as any
    const res = await c.getStudents(req, { user: 1 })
    return asApi(res)
  } finally { for (const [k, v] of Object.entries(originals)) { c[k] = v } }
}

const READING_HEADERS = [
  { readingFluencyExamId: 1, readingFluencyExamName: 'E1', readingFluencyExamColor: '#111', readingFluencyExamDescription: 'd', readingFluencyLevelId: 1, readingFluencyLevelName: 'L1', readingFluencyLevelColor: '#1', readingFluencyLevelDescription: 'x' },
  { readingFluencyExamId: 1, readingFluencyExamName: 'E1', readingFluencyExamColor: '#111', readingFluencyExamDescription: 'd', readingFluencyLevelId: 2, readingFluencyLevelName: 'L2', readingFluencyLevelColor: '#2', readingFluencyLevelDescription: 'y' },
]
const READING_STUDENTS = (students: StudentSpec[]) => students.map((s, i) => ({
  id: 1000 + i, ignore: false, endedAt: s.endedAt ?? null,
  student: {
    id: 500 + i,
    readingFluency: [
      { id: i * 10 + 1, readingFluencyExam: { id: 1 }, readingFluencyLevel: s.cells[0]?.answer ? { id: 1 } : null, rClassroom: s.cells[0]?.room ? { id: s.cells[0].room } : null },
      { id: i * 10 + 2, readingFluencyExam: { id: 1 }, readingFluencyLevel: s.cells[1]?.answer ? { id: 2 } : null, rClassroom: s.cells[1]?.room ? { id: s.cells[1].room } : null },
    ],
  },
}))

// ---- Tela B: Helper.testGraph -> Helper.classroomDataStructure (puro) ----
export function runGraphEndpoint(categoryId: number, students: StudentSpec[], questions: Questions = TEST_QUESTIONS): Json {
  const pResult = Helper.testGraph(buildGraphRows(students, questions as typeof TEST_QUESTIONS))
  const test = Helper.testFormater(TEST_ROW(categoryId) as any)
  return asApi(Helper.classroomDataStructure(pResult, test, clone(QUESTION_GROUPS), clone(questions), SCHOOL_ID, '3'))
}

export const CATEGORIES: Record<string, number> = {
  AVL_ITA: tcids.AVL_ITA,
  SIM_ITA: tcids.SIM_ITA,
  LITE_2: tcids.LITE_2,
  EDU_INF: tcids.EDU_INF,
  READ_2: tcids.READ_2,
  PRO_TXT: tcids.PRO_TXT,
}
export const SCORED = ['AVL_ITA', 'SIM_ITA']

export async function captureAll(): Promise<Record<string, Json>> {
  const out: Record<string, Json> = {}
  for (const [cat, id] of Object.entries(CATEGORIES)) {
    for (const [name, students] of Object.entries(SCENARIOS)) {
      out[`students|${cat}|${name}`] = await runStudentsEndpoint(id, students)
      if (SCORED.includes(cat)) { out[`graphic|${cat}|${name}`] = runGraphEndpoint(id, students) }
    }
  }
  return out
}
