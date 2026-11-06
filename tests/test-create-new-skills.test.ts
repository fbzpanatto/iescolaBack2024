import test, { describe, mock, afterEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { connectionPool } from '../src/services/db'
import { teacherRepository } from '../src/repositories/teacher.repository'
import { testCreateController } from '../src/controller/testCreate'
import { planNewSkills } from '../src/utils/newSkills'
import { PER_CAT, TEST_CATEGORIES_IDS } from '../src/utils/enums'
import { TestBodySave } from '../src/interfaces/interfaces'

interface Call { sql: string, params: unknown[] }
interface FakeOptions { skillsInDb?: Record<string, number>, racedSkills?: Record<string, number>, failOn?: RegExp }

const authUser = { user: 9, category: PER_CAT.ADMN }

const fakeConnection = (calls: Call[], events: string[], options: FakeOptions = {}) => {
  const skills = new Map<string, number>(Object.entries(options.skillsInDb ?? {}))
  const raced = new Map<string, number>(Object.entries(options.racedSkills ?? {}))
  let nextSkillId = 900
  let nextQuestionId = 600
  return {
    beginTransaction: async (): Promise<void> => { events.push('begin') },
    commit: async (): Promise<void> => { events.push('commit') },
    rollback: async (): Promise<void> => { events.push('rollback') },
    release: (): void => { events.push('release') },
    query: async (sql: string, params: unknown[] = []): Promise<unknown[]> => {
      calls.push({ sql, params })
      if (options.failOn?.test(sql)) { throw new Error('boom') }
      if (/FROM year WHERE/.test(sql)) { return [[{ id: 1, active: 1 }]] }
      if (/FROM period AS p/.test(sql)) { return [[{ period_id: 1, year_id: 1, year_name: '2025', year_active: 1, year_createdAt: '2025-01-01 00:00:00', year_endedAt: '2025-12-31 00:00:00', bimester_id: 3, bimester_name: '3', bimester_testName: 'T3' }]] }
      if (/FROM classroom AS c/.test(sql)) { return [[{ id: 10, shortName: '7A' }]] }
      if (/SELECT id, reference FROM skill WHERE reference IN/.test(sql)) {
        const wanted = params[0] as string[]
        if (/FOR UPDATE/.test(sql)) { raced.forEach((id, reference) => skills.set(reference, id)); raced.clear() }
        return [wanted.filter(reference => skills.has(reference)).map(reference => ({ id: skills.get(reference), reference }))]
      }
      if (/INSERT INTO skill/.test(sql)) {
        if (raced.size > 0) { throw Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' }) }
        for (const row of params[0] as unknown[][]) { skills.set(row[0] as string, nextSkillId++) }
        return [{ insertId: 900 }]
      }
      if (/SELECT id, reference, description FROM skill WHERE id IN/.test(sql)) {
        const wanted = params[0] as number[]
        return [[...skills.entries()].filter(([, id]) => wanted.includes(id)).map(([reference, id]) => ({ id, reference, description: 'd' }))]
      }
      if (/INSERT INTO question \(/.test(sql)) { return [{ insertId: nextQuestionId++ }] }
      if (/INSERT INTO test \(/.test(sql)) { return [{ insertId: 500 }] }
      return [{}]
    }
  }
}

const setup = (options: FakeOptions = {}) => {
  const calls: Call[] = []
  const events: string[] = []
  mock.method(connectionPool, 'getConnection', async () => fakeConnection(calls, events, options) as never)
  mock.method(teacherRepository, 'qTeacherByUser', async () => ({ id: 1, person: { id: 7, category: { id: PER_CAT.ADMN }, user: { id: 9 } } }) as never)
  return { calls, events }
}

const question = (extra: Record<string, unknown> = {}) => ({
  title: 'Questão', images: [], person: { id: 7 }, discipline: { id: 3, name: 'HISTÓRIA' }, classroomCategory: { id: 2, name: 'EF' }, ...extra
})

const body = (testQuestions: unknown[], extra: Record<string, unknown> = {}, category = TEST_CATEGORIES_IDS.AVL_ITA): TestBodySave => ({
  bimester: { id: 3 }, category: { id: category }, classroom: [{ id: 10 }], discipline: { id: 3 }, name: 'Prova', endedAt: '', year: { id: 1 },
  testQuestions, ...extra
}) as unknown as TestBodySave

const testQuestion = (order: number, questionExtra: Record<string, unknown>) => ({ order, answer: 'B', questionGroup: { id: 1 }, active: true, question: question(questionExtra) })

const callsTo = (calls: Call[], pattern: RegExp): Call[] => calls.filter(call => pattern.test(call.sql))

afterEach(() => mock.restoreAll())
after(async () => { await connectionPool.end() })

describe('saveTest with new skills (AVL_ITA)', () => {
  test('inserts only the missing skill and links both in question_skill', async () => {
    const { calls, events } = setup({ skillsInDb: { EF07HI03: 50 } })
    const payload = body(
      [testQuestion(1, { skills: [50], newSkillReferences: ['F07HI13A'] }), testQuestion(2, { skills: [50] })],
      { newSkills: [{ reference: 'F07HI13A', description: ' Caracterizar ' }, { reference: 'EF07HI03', description: 'NÃO SOBRESCREVER' }] }
    )

    const result = await testCreateController.saveTest(payload, authUser)

    assert.equal(result.status, 201)
    assert.deepEqual(events, ['begin', 'commit', 'release'])
    const inserts = callsTo(calls, /INSERT INTO skill/)
    assert.equal(inserts.length, 1)
    assert.match(inserts[0].sql, /\(reference, description, createdAt, createdByUser, classroomCategoryId, disciplineId\)/)
    const [row] = inserts[0].params[0] as unknown[][]
    assert.deepEqual([row[0], row[1], row[3], row[4], row[5]], ['F07HI13A', 'Caracterizar', 9, 2, 3])
    assert.equal(callsTo(calls, /UPDATE skill/i).length, 0)
    const links = callsTo(calls, /INSERT INTO question_skill/).map(call => (call.params[0] as unknown[][]).map(value => value[1]))
    assert.deepEqual(links, [[50, 900], [50]])
    assert.ok(calls.findIndex(call => /INSERT INTO skill/.test(call.sql)) < calls.findIndex(call => /INSERT INTO question \(/.test(call.sql)))
  })

  test('a concurrent save of the same new skill is re-read with FOR UPDATE and linked, not failed', async () => {
    const { calls, events } = setup({ racedSkills: { F07HI13A: 77 } })
    const payload = body([testQuestion(1, { skills: [], newSkillReferences: ['F07HI13A'] })], { newSkills: [{ reference: 'F07HI13A', description: 'Caracterizar' }] })

    const result = await testCreateController.saveTest(payload, authUser)

    assert.equal(result.status, 201)
    assert.deepEqual(events, ['begin', 'commit', 'release'])
    assert.equal(callsTo(calls, /INSERT INTO skill/).length, 1)
    assert.equal(callsTo(calls, /FOR UPDATE/).length, 1)
    assert.deepEqual(callsTo(calls, /INSERT INTO question_skill/).map(call => (call.params[0] as unknown[][]).map(value => value[1])), [[77]])
  })

  test('an insert error other than a duplicate key is not swallowed', async () => {
    const { events } = setup({ failOn: /INSERT INTO skill/ })
    const result = await testCreateController.saveTest(body([testQuestion(1, { skills: [], newSkillReferences: ['X1'] })], { newSkills: [{ reference: 'X1', description: 'd' }] }), authUser)
    assert.equal(result.status, 500)
    assert.ok(events.includes('rollback'))
  })

  test('an existing reference is neither inserted nor updated and is still linked', async () => {
    const { calls } = setup({ skillsInDb: { F07HI13A: 77 } })
    const payload = body([testQuestion(1, { newSkillReferences: ['F07HI13A'] })], { newSkills: [{ reference: 'F07HI13A', description: 'outra descrição' }] })

    const result = await testCreateController.saveTest(payload, authUser)

    assert.equal(result.status, 201)
    assert.equal(callsTo(calls, /INSERT INTO skill/).length, 0)
    assert.equal(callsTo(calls, /UPDATE skill/i).length, 0)
    assert.deepEqual(callsTo(calls, /INSERT INTO question_skill/).map(call => (call.params[0] as unknown[][]).map(value => value[1])), [[77]])
  })

  test('a duplicated reference in the payload is a 400 with rollback and no skill write', async () => {
    const { calls, events } = setup()
    const payload = body([testQuestion(1, { newSkillReferences: ['X1'] })], { newSkills: [{ reference: 'X1', description: 'a' }, { reference: ' X1 ', description: 'b' }] })

    const result = await testCreateController.saveTest(payload, authUser)

    assert.equal(result.status, 400)
    assert.match(String(result.message), /duplicada/)
    assert.deepEqual(events, ['begin', 'rollback', 'release'])
    assert.equal(callsTo(calls, /INSERT INTO (skill|test|question)\b/).length, 0)
  })

  test('a question reference that is neither in newSkills nor in the database is a 400', async () => {
    const { calls, events } = setup()
    const result = await testCreateController.saveTest(body([testQuestion(1, { newSkillReferences: ['SEM1'] })]), authUser)

    assert.equal(result.status, 400)
    assert.match(String(result.message), /SEM1/)
    assert.deepEqual(events, ['begin', 'rollback', 'release'])
    assert.equal(callsTo(calls, /INSERT INTO (skill|test)\b/).length, 0)
  })

  test('rolls back everything when a later insert fails', async () => {
    const { events } = setup({ failOn: /INSERT INTO question_skill/ })
    const payload = body([testQuestion(1, { newSkillReferences: ['N1'] })], { newSkills: [{ reference: 'N1', description: 'd' }] })

    const result = await testCreateController.saveTest(payload, authUser)

    assert.equal(result.status, 500)
    assert.deepEqual(events, ['begin', 'rollback', 'release'])
  })

  test('SIM_ITA also creates and links new skills', async () => {
    const { calls } = setup()
    const payload = body([testQuestion(1, { skills: [], newSkillReferences: ['N1'] })], { newSkills: [{ reference: 'N1', description: 'd' }], has_token: false }, TEST_CATEGORIES_IDS.SIM_ITA)

    const result = await testCreateController.saveTest(payload, authUser)

    assert.equal(result.status, 201)
    assert.equal(callsTo(calls, /INSERT INTO skill/).length, 1)
    assert.equal(callsTo(calls, /INSERT INTO question_skill/).length, 1)
  })

  test('other categories ignore newSkills and newSkillReferences', async () => {
    const { calls } = setup()
    const payload = body([testQuestion(1, { newSkillReferences: ['N1'] })], { newSkills: [{ reference: 'N1', description: 'd' }] }, TEST_CATEGORIES_IDS.LITE_2)

    const result = await testCreateController.saveTest(payload, authUser)

    assert.equal(result.status, 201)
    assert.equal(callsTo(calls, /FROM skill|INTO skill/).length, 0)
    assert.equal(callsTo(calls, /INSERT INTO question_skill/).length, 0)
  })
})

describe('planNewSkills', () => {
  const tq = (references: unknown, categoryId: unknown = 2) => ({ question: { newSkillReferences: references, classroomCategory: { id: categoryId } } })

  test('uses the classroom category of the first question that references the skill', () => {
    const plan = planNewSkills([{ reference: 'A1', description: 'd' }], [tq(['A1'], 5), tq(['A1'], 6)])
    assert.deepEqual(plan, { toCreate: [{ reference: 'A1', description: 'd', classroomCategoryId: 5 }], referenced: ['A1'] })
  })

  test('rejects blank, oversized and malformed entries', () => {
    const invalid = [[{ reference: ' ', description: 'd' }], [{ reference: 'A'.repeat(256), description: 'd' }], [{ reference: 'A1', description: ' ' }], 'x', [null]]
    for (const newSkills of invalid) { assert.throws(() => planNewSkills(newSkills, []), /HttpError|./) }
  })

  test('canLink decides which questions may receive new skills', () => {
    const rows = [{ id: 1, question: { id: 4, newSkillReferences: ['A1'], classroomCategory: { id: 2 } } }]
    assert.deepEqual(planNewSkills([{ reference: 'A1', description: 'd' }], rows, () => true).toCreate, [{ reference: 'A1', description: 'd', classroomCategoryId: 2 }])
    assert.deepEqual(planNewSkills([{ reference: 'A1', description: 'd' }], rows, () => false), { toCreate: [], referenced: [] })
  })

  test('ignores reused questions and absent fields', () => {
    assert.deepEqual(planNewSkills(undefined, [{ question: { id: 4, newSkillReferences: ['A1'] } }, { question: {} }]), { toCreate: [], referenced: [] })
  })
})
