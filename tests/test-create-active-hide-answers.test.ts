import test, { describe, mock, afterEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { connectionPool } from '../src/services/db'
import { teacherRepository } from '../src/repositories/teacher.repository'
import { testCreateController } from '../src/controller/testCreate'
import { PER_CAT, TEST_CATEGORIES_IDS } from '../src/utils/enums'
import { TestBodySave } from '../src/interfaces/interfaces'

interface Call { sql: string, params: unknown[] }

const authUser = { user: 9, category: PER_CAT.ADMN }

const fakeConnection = (calls: Call[]) => ({
  beginTransaction: async (): Promise<void> => {},
  commit: async (): Promise<void> => {},
  rollback: async (): Promise<void> => {},
  release: (): void => {},
  query: async (sql: string, params: unknown[] = []): Promise<unknown[]> => {
    calls.push({ sql, params })
    if (/FROM year WHERE/.test(sql)) { return [[{ id: 1, active: 1 }]] }
    if (/FROM period AS p/.test(sql)) { return [[{ period_id: 1, year_id: 1, year_name: '2025', year_active: 1, year_createdAt: '2025-01-01 00:00:00', year_endedAt: '2025-12-31 00:00:00', bimester_id: 3, bimester_name: '3', bimester_testName: 'T3' }]] }
    if (/FROM classroom AS c/.test(sql)) { return [[{ id: 10, shortName: '7A' }]] }
    if (/INSERT INTO test \(/.test(sql)) { return [{ insertId: 500 }] }
    return [{}]
  }
})

const body = (category: number, extra: Record<string, unknown>): TestBodySave => ({
  bimester: { id: 3 }, category: { id: category }, classroom: [{ id: 10 }], discipline: { id: 3 }, name: 'Prova', endedAt: '', year: { id: 1 },
  testQuestions: [], has_token: false, ...extra
}) as unknown as TestBodySave

afterEach(() => mock.restoreAll())
after(async () => { await connectionPool.end() })

const cases: [string, Record<string, unknown>, boolean, boolean][] = [
  ['active=false, hideAnswers=true', { active: false, hideAnswers: true }, false, true],
  ['active=true, hideAnswers=false', { active: true, hideAnswers: false }, true, false],
  ['fields omitted', {}, true, false]
]

describe('saveTest persists active and hideAnswers', () => {
  for (const [categoryName, category] of [['AVL_ITA', TEST_CATEGORIES_IDS.AVL_ITA], ['SIM_ITA', TEST_CATEGORIES_IDS.SIM_ITA]] as const) {
    for (const [label, extra, active, hideAnswers] of cases) {
      test(`${categoryName}: ${label}`, async () => {
        const calls: Call[] = []
        mock.method(connectionPool, 'getConnection', async () => fakeConnection(calls) as never)
        mock.method(teacherRepository, 'qTeacherByUser', async () => ({ id: 1, person: { id: 7, category: { id: PER_CAT.ADMN }, user: { id: 9 } } }) as never)

        const result = await testCreateController.saveTest(body(category, extra), authUser)

        assert.equal(result.status, 201)
        const insert = calls.find(call => /INSERT INTO test \(/.test(call.sql))!
        const columns = /INSERT INTO test \(([^)]+)\)/.exec(insert.sql)![1].split(',').map(column => column.trim())
        assert.equal(insert.params[columns.indexOf('active')], active)
        assert.equal(insert.params[columns.indexOf('hideAnswers')], hideAnswers)
      })
    }
  }
})
