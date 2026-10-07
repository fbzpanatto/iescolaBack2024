import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'fs'
import { join } from 'path'
import { Helper } from '../src/utils/helpers'
import { TEST_CATEGORIES_IDS as tcids } from '../src/utils/enums'
import { CATEGORIES, SCORED, captureAll, runGraphEndpoint, runStudentsEndpoint } from './capture'
import { REAL_CASE, SCENARIOS, StudentSpec } from './fixtures'

type Obj = Record<string, any>
const baseline: Record<string, Obj> = JSON.parse(readFileSync(join(__dirname, '__snapshots__', 'baseline.json'), 'utf8'))

// Lista os caminhos folha que diferem entre dois JSONs, normalizando índices de array para [].
function diffPaths(a: unknown, b: unknown, path = ''): string[] {
  if (JSON.stringify(a) === JSON.stringify(b)) { return [] }
  const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null
  if (!isObj(a) || !isObj(b)) { return [path] }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  return [...keys].flatMap(k => diffPaths(a[k], b[k], Array.isArray(a) ? `${path}[]` : `${path}.${k}`))
}

const SCENARIOS_WITH_EMPTY_CELL = ['withEmptyCell', 'withEmptyCellLastQuestion', 'combined']
// Único diff permitido em AVL/SIM com célula vazia de aluno elegível (tela A): percentual da sala e denominador/% por questão.
const ALLOWED_STUDENTS_DIFF = new Set(['.data.classroomPercent', '.data.totals[].tRate', '.data.totals[].tTotal'])

describe('golden master: saída atual x baseline (pré-alteração)', async () => {
  const current = await captureAll()

  for (const key of Object.keys(baseline)) {
    const [endpoint, cat, scenario] = key.split('|')
    const expectsDiff = endpoint === 'students' && SCORED.includes(cat) && SCENARIOS_WITH_EMPTY_CELL.includes(scenario)

    test(`${key}: ${expectsDiff ? 'diff restrito a classroomPercent/% por questão' : 'idêntico'}`, () => {
      const paths = diffPaths(baseline[key], current[key])
      if (!expectsDiff) { assert.deepEqual(paths, [], `campos alterados: ${paths.join(', ')}`); return }
      assert.ok(paths.length > 0, 'esperava diff pela célula vazia')
      const forbidden = [...new Set(paths)].filter(p => !ALLOWED_STUDENTS_DIFF.has(p))
      assert.deepEqual(forbidden, [], `campos fora do permitido: ${forbidden.join(', ')}`)
    })
  }
})

describe('paridade entre tela A (students) e tela B (graphic) em AVL/SIM', () => {
  for (const cat of SCORED) {
    for (const [scenario, students] of Object.entries(SCENARIOS)) {
      test(`${cat} / ${scenario}`, async () => {
        const a = (await runStudentsEndpoint(CATEGORIES[cat], students) as Obj).data
        const b = (runGraphEndpoint(CATEGORIES[cat], students) as Obj).classrooms[0]
        assert.equal(a.classroomPercent, b.tRateAvg)
        a.totals.forEach((t: Obj, i: number) => assert.equal(t.tRate, b.totals[i].tRate, `questão ${i + 1}`))
      })
    }
  }
})

describe('Helper: funções puras', () => {
  test('isScoredTestCategory cobre só AVL_ITA e SIM_ITA', () => {
    const scored = Object.values(tcids).filter(id => Helper.isScoredTestCategory(id))
    assert.deepEqual(scored.sort(), [tcids.SIM_ITA, tcids.AVL_ITA].sort())
  })
  test('scoreRate usa floor com 2 casas', () => {
    assert.equal(Helper.scoreRate(115, 128), 89.84)
    assert.equal(Helper.scoreRate(15, 16), 93.75)
    assert.equal(Helper.scoreRate(99, 100), 99)
    assert.equal(Helper.scoreRate(1, 3), 33.33)
  })
  test('isUnassignedEmptyCell', () => {
    assert.equal(Helper.isUnassignedEmptyCell(undefined), true)
    assert.equal(Helper.isUnassignedEmptyCell({ answer: '', rClassroom: null }), true)
    assert.equal(Helper.isUnassignedEmptyCell({ answer: ' ', rClassroom: null }), true)
    assert.equal(Helper.isUnassignedEmptyCell({ answer: '', rClassroom: { id: 101 } }), false)
    assert.equal(Helper.isUnassignedEmptyCell({ answer: 'A', rClassroom: null }), false)
  })
})

describe('regra "vazio conta como erro" (AVL/SIM)', () => {
  const cell = (answer: string) => ({ answer, room: 101 as number | null })
  const empty = () => ({ answer: '', room: null as number | null })
  const grid = (n: number, q: number, emptyAt: [number, number][] = []): { students: StudentSpec[], questions: any[] } => ({
    questions: Array.from({ length: q }, (_, i) => ({ id: i + 1, order: i + 1, answer: 'A', active: true })),
    students: Array.from({ length: n }, (_, s) => ({ name: `S${s}`, cells: Array.from({ length: q }, (_, c) => emptyAt.some(([es, ec]) => es === s && ec === c) ? empty() : cell('A')) })),
  })

  for (const cat of SCORED) {
    test(`${cat}: sala sem vazios = 100`, async () => {
      const { students, questions } = grid(10, 10)
      const a = (await runStudentsEndpoint(CATEGORIES[cat], students, questions) as Obj).data
      assert.equal(a.classroomPercent, 100)
    })
    test(`${cat}: 10x10 toda certa com 1 vazia = 99/100`, async () => {
      const { students, questions } = grid(10, 10, [[3, 4]])
      const a = (await runStudentsEndpoint(CATEGORIES[cat], students, questions) as Obj).data
      assert.equal(a.classroomPoints, 99)
      assert.equal(a.classroomPercent, 99)
      assert.equal(a.totals[4].tRate, 90)
      assert.equal(a.totals[0].tRate, 100)
    })
    test(`${cat}: aluno sem nenhuma resposta fica fora`, async () => {
      const { students, questions } = grid(10, 10)
      students[9].cells = students[9].cells.map(() => empty())
      const a = (await runStudentsEndpoint(CATEGORIES[cat], students, questions) as Obj).data
      assert.equal(a.classroomPercent, 100)
      assert.equal(a.totals[0].tTotal, 9)
    })
    test(`${cat}: aluno OE e TR ficam fora`, async () => {
      const { students, questions } = grid(10, 10)
      students[8] = { name: 'OE', endedAt: null, cells: students[8].cells.map(() => ({ answer: 'A', room: 202 })) }
      students[9] = { name: 'TR', endedAt: '2025-05-01', cells: students[9].cells.map(() => ({ answer: 'A', room: 202 })) }
      const a = (await runStudentsEndpoint(CATEGORIES[cat], students, questions) as Obj).data
      assert.equal(a.classroomPercent, 100)
      assert.equal(a.totals[0].tTotal, 8)
    })
    test(`${cat}: caso real 115 acertos, 16 alunos x 8 questões = 89.84 e questão 7 = 93.75`, async () => {
      const { students, questions } = REAL_CASE
      const a = (await runStudentsEndpoint(CATEGORIES[cat], students, questions) as Obj).data
      const b = (runGraphEndpoint(CATEGORIES[cat], students, questions) as Obj).classrooms[0]
      assert.equal(a.classroomPoints, 115)
      assert.equal(a.classroomPercent, 89.84)
      assert.equal(a.totals[6].tRate, 93.75)
      assert.equal(b.tRateAvg, 89.84)
      assert.equal(b.totals[6].tRate, 93.75)
    })
  }
})
