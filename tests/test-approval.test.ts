import test, { describe, mock, afterEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { connectionPool } from '../src/services/db'
import { teacherRepository } from '../src/repositories/teacher.repository'
import { testRepository } from '../src/repositories/test.repository'
import { testCreateController } from '../src/controller/testCreate'
import { testUpdateController } from '../src/controller/testUpdate'
import { PER_CAT, TEST_CATEGORIES_IDS } from '../src/utils/enums'
import { TestBodySave } from '../src/interfaces/interfaces'

interface Call { sql: string, params: unknown[] }

const fakeConnection = (calls: Call[], pending: boolean) => ({
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
    if (/approved = 0 FOR UPDATE/.test(sql)) { return [pending ? [{ id: 500 }] : []] }
    return [{}]
  }
})

const body = (): TestBodySave => ({
  bimester: { id: 3 }, category: { id: TEST_CATEGORIES_IDS.AVL_ITA }, classroom: [{ id: 10 }], discipline: { id: 3 }, name: 'Prova', endedAt: '', year: { id: 1 },
  testQuestions: [], has_token: false
}) as unknown as TestBodySave

afterEach(() => mock.restoreAll())
after(async () => { await connectionPool.end() })

describe('saveTest sets approved by creator', () => {
  for (const [category, expected] of [[PER_CAT.ADMN, null], [PER_CAT.SUPE, false], [PER_CAT.FORM, false]] as const) {
    test(`category ${category} -> ${expected}`, async () => {
      const calls: Call[] = []
      mock.method(connectionPool, 'getConnection', async () => fakeConnection(calls, false) as never)
      mock.method(teacherRepository, 'qTeacherByUser', async () => ({ id: 1, person: { id: 7, category: { id: category }, user: { id: 9 } } }) as never)

      const result = await testCreateController.saveTest(body(), { user: 9, category })

      assert.equal(result.status, 201)
      const insert = calls.find(call => /INSERT INTO test \(/.test(call.sql))!
      const columns = /INSERT INTO test \(([^)]+)\)/.exec(insert.sql)![1].split(',').map(column => column.trim())
      assert.equal(insert.params[columns.indexOf('approved')], expected)
    })
  }
})

describe('setApproval', () => {
  test('only ADMN', async () => {
    const result = await testUpdateController.setApproval(500, { approved: true }, { user: 9, category: PER_CAT.SUPE })
    assert.equal(result.status, 403)
  })

  test('rejects a non-boolean approved', async () => {
    const result = await testUpdateController.setApproval(500, { approved: 'yes' }, { user: 9, category: PER_CAT.ADMN })
    assert.equal(result.status, 400)
  })

  test('409 when the test is not pending', async () => {
    mock.method(testRepository, 'qSetApproval', async () => false)
    const result = await testUpdateController.setApproval(500, { approved: true }, { user: 9, category: PER_CAT.ADMN })
    assert.equal(result.status, 409)
  })

  test('approve updates test only', async () => {
    const calls: Call[] = []
    mock.method(connectionPool, 'getConnection', async () => fakeConnection(calls, true) as never)
    assert.equal(await testRepository.qSetApproval(500, true, 9), true)
    assert.ok(calls.some(call => /UPDATE test SET approved = 1/.test(call.sql)))
    assert.ok(!calls.some(call => /DELETE FROM test_classroom/.test(call.sql)))
  })

  test('reject deletes test_classroom and keeps approved = 0', async () => {
    const calls: Call[] = []
    mock.method(connectionPool, 'getConnection', async () => fakeConnection(calls, true) as never)
    assert.equal(await testRepository.qSetApproval(500, false, 9), true)
    assert.ok(calls.some(call => /DELETE FROM test_classroom WHERE testId = \?/.test(call.sql)))
    assert.ok(!calls.some(call => /approved = 1/.test(call.sql)))
  })
})
