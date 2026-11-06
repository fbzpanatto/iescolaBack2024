import test, { describe, mock, afterEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { connectionPool } from '../src/services/db'
import { teacherRepository } from '../src/repositories/teacher.repository'
import { testRepository } from '../src/repositories/test.repository'
import { testQuestionService } from '../src/services/test-question.service'
import { testUpdateController } from '../src/controller/testUpdate'
import { PER_CAT, TEST_CATEGORIES_IDS } from '../src/utils/enums'

interface Call { sql: string, params: unknown[] }

const authUser = { user: 9, category: PER_CAT.ADMN }

const fakeConnection = (calls: Call[], events: string[], categoryId: number) => {
  const skills = new Map<string, number>([['EF05MA01', 50]])
  let nextSkillId = 900
  return {
    beginTransaction: async (): Promise<void> => { events.push('begin') },
    commit: async (): Promise<void> => { events.push('commit') },
    rollback: async (): Promise<void> => { events.push('rollback') },
    release: (): void => { events.push('release') },
    query: async (sql: string, params: unknown[] = []): Promise<unknown[]> => {
      calls.push({ sql, params })
      if (/FROM test WHERE id = \?/.test(sql)) { return [[{ id: 1, personId: 7, disciplineId: 3, categoryId }]] }
      if (/SELECT id, reference FROM skill WHERE reference IN/.test(sql)) {
        const wanted = params[0] as string[]
        return [wanted.filter(reference => skills.has(reference)).map(reference => ({ id: skills.get(reference), reference }))]
      }
      if (/INSERT INTO skill/.test(sql)) {
        for (const row of params[0] as unknown[][]) { skills.set(row[0] as string, nextSkillId++) }
        return [{ insertId: 900 }]
      }
      if (/SELECT id, reference, description FROM skill WHERE id IN/.test(sql)) {
        const wanted = params[0] as number[]
        return [[...skills.entries()].filter(([, id]) => wanted.includes(id)).map(([reference, id]) => ({ id, reference, description: 'd' }))]
      }
      if (/SELECT skillId FROM question_skill/.test(sql)) { return [[{ skillId: 50 }]] }
      if (/INSERT INTO question \(/.test(sql)) { return [{ insertId: 600 }] }
      if (/^\s*SELECT/.test(sql)) { return [[]] }
      return [{}]
    }
  }
}

const question = (id: number | undefined, extra: Record<string, unknown> = {}) => ({
  ...(id ? { id } : {}), title: 'Questão', images: [], person: { id: 7 }, discipline: { id: 3 }, classroomCategory: { id: 2, name: 'PEB II' }, ...extra
})

const current = (inUse: number) => ({
  id: 70, order: 1, answer: 'B', active: true, questionGroup: { id: 1, name: 'Bloco 1' }, question: { ...question(40), inUse }
})

const setup = (inUse: number, categoryId = TEST_CATEGORIES_IDS.SIM_ITA) => {
  const calls: Call[] = []
  const events: string[] = []
  mock.method(connectionPool, 'getConnection', async () => fakeConnection(calls, events, categoryId) as never)
  mock.method(teacherRepository, 'qTeacherByUser', async () => ({ id: 1, person: { id: 7, category: { id: PER_CAT.ADMN }, user: { id: 9 } } }) as never)
  mock.method(testQuestionService, 'getTestQuestions', async () => [current(inUse)] as never)
  mock.method(testRepository, 'qTestById', async () => ({ id: 1 }) as never)
  return { calls, events }
}

const request = (testQuestions: unknown[], newSkills: unknown) => ({
  params: { id: 1 },
  body: { name: 'Prova', active: true, hideAnswers: false, has_token: false, testQuestions, newSkills }
}) as never

const existing = (questionExtra: Record<string, unknown>) => ({ id: 70, order: 1, answer: 'B', active: true, questionGroup: { id: 1, name: 'Bloco 1' }, question: question(40, questionExtra) })
const created = (questionExtra: Record<string, unknown>) => ({ order: 2, answer: 'A', active: true, questionGroup: { id: 1, name: 'Bloco 1' }, question: question(undefined, questionExtra) })

const callsTo = (calls: Call[], pattern: RegExp): Call[] => calls.filter(call => pattern.test(call.sql))
const NEW_SKILL = [{ reference: 'EF05MA99', description: 'nova' }]

afterEach(() => mock.restoreAll())
after(async () => { await connectionPool.end() })

describe('updateTest with new skills', () => {
  test('creates the skill and links it to an editable existing question', async () => {
    const { calls, events } = setup(0)

    const result = await testUpdateController.updateTest(1, request([existing({ skills: [50], newSkillReferences: ['EF05MA99'] })], NEW_SKILL), authUser as never)

    assert.equal(result.status, 200)
    assert.deepEqual(callsTo(calls, /INSERT INTO skill/)[0].params, [[['EF05MA99', 'nova', (callsTo(calls, /INSERT INTO skill/)[0].params[0] as unknown[][])[0][2], 9, 2, 3]]])
    assert.deepEqual(callsTo(calls, /INSERT INTO question_skill/)[0].params[0], [[40, 900, (callsTo(calls, /INSERT INTO question_skill/)[0].params[0] as unknown[][])[0][2], 9]])
    assert.equal(events.at(-2), 'commit')
  })

  test('links the new skill to a question created during the edit', async () => {
    const { calls } = setup(0)

    const result = await testUpdateController.updateTest(1, request([existing({ skills: [50] }), created({ skills: [], newSkillReferences: ['EF05MA99'] })], NEW_SKILL), authUser as never)

    assert.equal(result.status, 200)
    assert.equal(callsTo(calls, /INSERT INTO skill/).length, 1)
    const links = callsTo(calls, /INSERT INTO question_skill/).map(call => (call.params[0] as unknown[][]).map(row => [row[0], row[1]]))
    assert.deepEqual(links, [[[600, 900]]])
  })

  test('a question shared with another test gets no new skill and nothing is created', async () => {
    const { calls } = setup(1)

    const result = await testUpdateController.updateTest(1, request([existing({ skills: [50], newSkillReferences: ['EF05MA99'] })], NEW_SKILL), authUser as never)

    assert.equal(result.status, 200)
    assert.equal(callsTo(calls, /INSERT INTO skill/).length, 0)
    assert.equal(callsTo(calls, /INSERT INTO question_skill|DELETE FROM question_skill/).length, 0)
  })

  test('categories without scores ignore newSkills', async () => {
    const { calls } = setup(0, TEST_CATEGORIES_IDS.LITE_2)

    const result = await testUpdateController.updateTest(1, request([existing({ skills: [50], newSkillReferences: ['EF05MA99'] })], NEW_SKILL), authUser as never)

    assert.equal(result.status, 200)
    assert.equal(callsTo(calls, /INSERT INTO skill/).length, 0)
  })
})
