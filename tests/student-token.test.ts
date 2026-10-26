process.env.SECRET = 'test-secret'

import test, { describe, mock, afterEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { decode } from 'jsonwebtoken'
import type { Request } from 'express'
import { resolveStudentId } from '../src/utils/studentToken'
import { PER_CAT } from '../src/utils/enums'
import { JwtPayload } from '../src/interfaces/interfaces'
import { connectionPool } from '../src/services/db'
import { loginCtrl } from '../src/controller/login'
import { stController } from '../src/controller/student'
import { testController } from '../src/controller/test'
import { classroomController } from '../src/controller/classroom'
import { lessonController } from '../src/controller/lesson'
import { studentTestController } from '../src/controller/studentTest'
import { checkSchema, validationResult } from 'express-validator'
import { SUBMIT_TEST_SCHEMA } from '../src/schemas/studentTestQuestions'
import { yearRepository } from '../src/repositories/year.repository'

type Payload = Partial<JwtPayload> & { category: number }
type Result = { status?: number | string, data?: unknown, message?: string }
type Executed = { sql: string, params: unknown[] }

const asAuth = (payload: Payload): JwtPayload => payload as JwtPayload
const asReq = (value: object): Request => value as unknown as Request

const ADMIN_TEACHER_ID = 2
const staffToken = asAuth({ user: ADMIN_TEACHER_ID, category: PER_CAT.PROF })
const collidingToken = asAuth({ student: ADMIN_TEACHER_ID, category: PER_CAT.ALUN })
const legacyCollidingToken = asAuth({ user: ADMIN_TEACHER_ID, category: PER_CAT.ALUN })

const teacherRow = { id: ADMIN_TEACHER_ID, userId: ADMIN_TEACHER_ID, categoryId: PER_CAT.ADMN, person: { category: { id: PER_CAT.ADMN } } }

const stubTeacherLookups = () => ({
  qTeacherByUser: mock.method(stController, 'qTeacherByUser', async () => teacherRow as never),
  qTeacherClassrooms: mock.method(stController, 'qTeacherClassrooms', async () => { throw new Error('stop') }),
  qUser: mock.method(lessonController, 'qUser', async () => teacherRow as never),
  qCurrentYear: mock.method(yearRepository, 'qCurrentYear', async () => null as never)
})

const fakeConnection = (executed: Executed[]) => ({
  beginTransaction: async (): Promise<void> => undefined,
  commit: async (): Promise<void> => undefined,
  rollback: async (): Promise<void> => undefined,
  release: (): void => undefined,
  query: async (): Promise<unknown[]> => [[{ id: 1, active: 1 }]],
  execute: async (sql: string, params: unknown[]): Promise<unknown[]> => {
    executed.push({ sql, params })
    return [{ affectedRows: 1 }]
  }
})

const stubPool = (executed: Executed[]) =>
  mock.method(connectionPool, 'getConnection', async () => fakeConnection(executed) as never)

afterEach(() => mock.restoreAll())
after(async () => { await connectionPool.end() })

describe('resolveStudentId', () => {
  test('returns student for ALUN', () => {
    assert.equal(resolveStudentId(asAuth({ student: 7, category: PER_CAT.ALUN })), 7)
  })

  test('returns null for legacy ALUN tokens with only user', () => {
    assert.equal(resolveStudentId(asAuth({ user: 5, category: PER_CAT.ALUN })), null)
  })

  test('prefers student over user', () => {
    assert.equal(resolveStudentId(asAuth({ user: 5, student: 7, category: PER_CAT.ALUN })), 7)
  })

  test('returns null for staff even with student', () => {
    for (const category of [PER_CAT.ADMN, PER_CAT.PROF]) {
      assert.equal(resolveStudentId(asAuth({ user: 5, category })), null)
      assert.equal(resolveStudentId(asAuth({ user: 5, student: 7, category })), null)
    }
  })

  test('returns null for undefined payload and invalid ids', () => {
    assert.equal(resolveStudentId(undefined), null)
    for (const id of [0, -1, 1.5, NaN, '7']) {
      assert.equal(resolveStudentId({ student: id, category: PER_CAT.ALUN } as unknown as JwtPayload), null)
    }
  })
})

describe('studentLogin', () => {
  test('signs token with student and no user', async () => {
    mock.method(loginCtrl, 'qStudentByRa', async () => ({ id: 7, ra: '123456', dv: '7', name: 'ALUNO', categoryId: PER_CAT.ALUN }) as never)
    const req = asReq({ body: { ra: '1234567', birthDate: '2010-01-01' } })
    const response = await loginCtrl.studentLogin(req) as { status: number, data: { token: string, expiresIn: number, role: number, person: string, studentId: number } }
    assert.equal(response.status, 200)
    const decoded = decode(response.data.token) as Record<string, unknown>
    assert.equal(decoded.student, 7)
    assert.equal('user' in decoded, false)
    assert.equal(decoded.ra, '1234567')
    assert.equal(decoded.category, PER_CAT.ALUN)
    assert.ok(response.data.token)
    assert.equal(typeof response.data.expiresIn, 'number')
    assert.equal(response.data.role, PER_CAT.ALUN)
    assert.equal(response.data.person, 'ALUNO')
    assert.equal(response.data.studentId, 7)
  })
})

type Handler = { name: string, call: (auth: JwtPayload) => Promise<Result>, reachesLookup: (spies: ReturnType<typeof stubTeacherLookups>, classroomSpy: { mock: { callCount: () => number } }, updateSpy: { mock: { callCount: () => number } }) => number }

const handlers: Handler[] = [
  {
    name: 'studentForm',
    call: auth => stController.studentForm(asReq({ query: {}, params: {} }), auth) as Promise<Result>,
    reachesLookup: spies => spies.qTeacherByUser.mock.callCount()
  },
  {
    name: 'allStudents',
    call: auth => stController.allStudents(asReq({ query: {}, params: { year: '2025' } }) as Request<{ year: string }>, auth) as Promise<Result>,
    reachesLookup: spies => spies.qTeacherByUser.mock.callCount() + spies.qTeacherClassrooms.mock.callCount()
  },
  {
    name: 'findOneStudentById',
    call: auth => stController.findOneStudentById(asReq({ query: {}, params: { id: '1' } }), auth) as Promise<Result>,
    reachesLookup: spies => spies.qTeacherByUser.mock.callCount() + spies.qTeacherClassrooms.mock.callCount()
  },
  {
    name: 'getAllInactivates',
    call: auth => stController.getAllInactivates(asReq({ query: {}, params: { year: '2025' } }), auth) as Promise<Result>,
    reachesLookup: spies => spies.qCurrentYear.mock.callCount()
  },
  {
    name: 'getFormDataByTestCategory',
    call: auth => testController.getFormDataByTestCategory(asReq({ query: {}, params: {} }), auth) as Promise<Result>,
    reachesLookup: (_spies, classroomSpy) => classroomSpy.mock.callCount()
  },
  {
    name: 'updateLesson',
    call: auth => lessonController.updateLesson(asReq({ params: { id: '1' }, body: { name: 'aula' } }), auth) as Promise<Result>,
    reachesLookup: (spies, _classroomSpy, updateSpy) => spies.qUser.mock.callCount() + updateSpy.mock.callCount()
  }
]

const setup = () => {
  const spies = stubTeacherLookups()
  mock.method(stController, 'studentsClassroomsNewImplementation', async () => [] as never)
  mock.method(stController, 'qStudentFullDetail', async () => null as never)
  mock.method(stController, 'qStates', async () => [] as never)
  mock.method(stController, 'qDisabilities', async () => [] as never)
  mock.method(stController, 'qAllTClassTx', async () => [] as never)
  const classroomSpy = mock.method(classroomController, 'getAllClassroomsByTestCategory', async () => ({ status: 200, data: [] }) as never)
  const updateSpy = mock.method(lessonController, 'updateLessonById', async () => ({ id: 1 }) as never)
  return { spies, classroomSpy, updateSpy }
}

describe('ALUN token collision with teacher id', () => {
  for (const [label, token] of [['student token', collidingToken], ['legacy user token', legacyCollidingToken]] as const) {
    for (const handler of handlers) {
      test(`${handler.name} returns 403 without teacher lookups (${label})`, async () => {
        const { spies, classroomSpy, updateSpy } = setup()
        const result = await handler.call(token)
        assert.equal(result.status, 403)
        assert.equal(handler.reachesLookup(spies, classroomSpy, updateSpy), 0)
        assert.equal(spies.qTeacherByUser.mock.callCount(), 0)
        assert.equal(spies.qTeacherClassrooms.mock.callCount(), 0)
        assert.equal(spies.qUser.mock.callCount(), 0)
        assert.equal(spies.qCurrentYear.mock.callCount(), 0)
        assert.equal(updateSpy.mock.callCount(), 0)
      })
    }
  }
})

describe('staff regression', () => {
  for (const handler of handlers) {
    test(`${handler.name} reaches lookups for staff`, async () => {
      const { spies, classroomSpy, updateSpy } = setup()
      const result = await handler.call(staffToken)
      assert.notEqual(result.status, 403)
      assert.ok(handler.reachesLookup(spies, classroomSpy, updateSpy) > 0)
    })
  }
})

describe('studentTestController', () => {
  const studentToken = asAuth({ student: 7, category: PER_CAT.ALUN })
  const query = { ref: '1' }

  test('returns 403 for staff tokens', async () => {
    const getTest = await studentTestController.getTest({}, { id: 1 }, query, staffToken)
    const update = await studentTestController.updateStudentAnswers({ testId: 1, studentId: 7, questions: [], token: null }, staffToken)
    const list = await studentTestController.allFilteredStudentTest({}, { year: 2025 }, {}, staffToken)
    assert.equal(getTest.status, 403)
    assert.equal(update.status, 403)
    assert.equal(list.status, 403)
  })

  test('allFilteredStudentTest uses the token student id', async () => {
    const updateSpy = mock.method(studentTestController, 'updateAllStudentTestStatus', async () => undefined as never)
    const listSpy = mock.method(studentTestController, 'qTestByStudentId', async () => [] as never)
    const result = await studentTestController.allFilteredStudentTest({}, { year: 2025 }, {}, studentToken)
    assert.equal(result.status, 200)
    assert.equal(updateSpy.mock.calls[0].arguments[0], 7)
    assert.equal(listSpy.mock.calls[0].arguments[0], 7)
  })

  test('getTest uses the token student id', async () => {
    mock.method(yearRepository, 'qCurrentYear', async () => ({ name: 2025 }) as never)
    mock.method(studentTestController, 'updateAllStudentTestStatus', async () => undefined as never)
    const testSpy = mock.method(studentTestController, 'qFilteredTestByStudentId', async () => null as never)
    const result = await studentTestController.getTest({}, { id: 1 }, query, studentToken)
    assert.equal(result.status, 404)
    assert.equal(testSpy.mock.calls[0].arguments[0], 7)
  })

  test('updateStudentAnswers scopes everything to the token student id', async () => {
    const executed: Executed[] = []
    stubPool(executed)
    const filterSpy = mock.method(studentTestController, 'qFilteredTestByStudentId', async () => ({ studentTestStatusId: 3, testId: 1, classroomId: 9, is_token_required: false }) as never)
    const body = {
      testId: 1,
      studentId: 99,
      token: null,
      questions: [
        { studentQuestionId: 11, answer: 'A', testQuestionId: 1, studentId: 99, rClassroomId: null },
        { studentQuestionId: 12, answer: 'B', testQuestionId: 2, studentId: 99, rClassroomId: null }
      ]
    }
    const result = await studentTestController.updateStudentAnswers(body, studentToken)
    assert.equal(result.status, 200)
    assert.equal(filterSpy.mock.calls[0].arguments[0], 7)
    const bulk = executed.find(el => el.sql.includes('UPDATE student_question'))
    assert.ok(bulk)
    assert.ok(bulk.sql.includes('AND studentId = ?'))
    assert.equal(bulk.params[bulk.params.length - 1], 7)
    assert.ok(bulk.params.includes(7))
    const statusUpdate = executed.find(el => el.sql.includes('UPDATE student_test_status'))
    assert.ok(statusUpdate)
    assert.equal(statusUpdate.params[1], 7)
    assert.equal(bulk.params.includes(99), false)
  })

  const submitBody = (token: { id: number, code: string } | null) => ({
    testId: 1,
    studentId: 7,
    token,
    questions: [{ studentQuestionId: 11, answer: 'A', testQuestionId: 1, studentId: 7, rClassroomId: null }]
  })

  const stubTest = (isTokenRequired: boolean | number | null | undefined) =>
    mock.method(studentTestController, 'qFilteredTestByStudentId', async () => ({ studentTestStatusId: 3, testId: 1, classroomId: 9, is_token_required: isTokenRequired }) as never)

  test('accepts a null token when the test does not require one', async () => {
    const executed: Executed[] = []
    stubPool(executed)
    stubTest(false)
    const result = await studentTestController.updateStudentAnswers(submitBody(null), studentToken)
    assert.equal(result.status, 200)
    assert.equal(executed.some(el => el.sql.includes('test_token')), false)
    assert.ok(executed.some(el => el.sql.includes('UPDATE student_question')))
  })

  for (const required of [null, undefined, true, 1]) {
    test(`rejects a missing token when is_token_required is ${String(required)}`, async () => {
      const executed: Executed[] = []
      stubPool(executed)
      stubTest(required)
      const result = await studentTestController.updateStudentAnswers(submitBody(null), studentToken)
      assert.equal(result.status, 400)
      assert.equal(executed.length, 0)
    })
  }

  test('consumes the token when the test requires one', async () => {
    const executed: Executed[] = []
    stubPool(executed)
    stubTest(true)
    const result = await studentTestController.updateStudentAnswers(submitBody({ id: 5, code: 'ABCDEFGHI' }), studentToken)
    assert.equal(result.status, 200)
    assert.ok(executed.some(el => el.sql.includes('UPDATE test_token')))
    assert.ok(executed.some(el => el.sql.includes('UPDATE student_question')))
  })
})

describe('lessonController.saveLessonExecution', () => {
  const req = asReq({ params: { id: '1' }, body: { grade: 5 } })

  test('returns 403 for staff', async () => {
    const result = await lessonController.saveLessonExecution(req, staffToken) as Result
    assert.equal(result.status, 403)
  })

  test('uses the token student id', async () => {
    mock.method(lessonController, 'qGetLessonById', async () => ({ id: 1 }) as never)
    const upsert = mock.method(lessonController, 'upsertStudentLesson', async () => ({ ok: true }) as never)
    const result = await lessonController.saveLessonExecution(req, asAuth({ student: 7, category: PER_CAT.ALUN })) as Result
    assert.equal(result.status, 200)
    assert.equal(upsert.mock.calls[0].arguments[0], 7)
  })
})

describe('SUBMIT_TEST_SCHEMA token contract', () => {
  const baseBody = { testId: 1, studentId: 7, questions: [{ studentQuestionId: 11, answer: 'A', testQuestionId: 1, studentId: 7, rClassroomId: null }] }

  const isValid = async (body: object): Promise<boolean> => {
    const req = { body }
    for (const chain of checkSchema(SUBMIT_TEST_SCHEMA)) { await chain.run(req) }
    return validationResult(req).isEmpty()
  }

  test('accepts a null token (test without access token)', async () => {
    assert.equal(await isValid({ ...baseBody, token: null }), true)
  })

  test('accepts a body without the token key', async () => {
    assert.equal(await isValid(baseBody), true)
  })

  test('accepts a token with id and code (legacy and token-required tests)', async () => {
    assert.equal(await isValid({ ...baseBody, token: { id: 5, code: 'ABCDEFGHI' } }), true)
  })

  test('rejects a token object without id or code', async () => {
    assert.equal(await isValid({ ...baseBody, token: {} }), false)
    assert.equal(await isValid({ ...baseBody, token: { id: 5 } }), false)
    assert.equal(await isValid({ ...baseBody, token: { code: 'ABCDEFGHI' } }), false)
  })

  test('still rejects a body without questions', async () => {
    assert.equal(await isValid({ testId: 1, studentId: 7, token: null }), false)
  })
})
