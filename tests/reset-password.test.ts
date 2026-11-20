import test, { describe, mock, afterEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { connectionPool } from '../src/services/db'
import * as email from '../src/services/email'
import { passwordController } from '../src/controller/password'
import { authRepository } from '../src/repositories/auth.repository'
import { isDuplicateUserEmail } from '../src/utils/helpers'

type Responder = (sql: string) => unknown[]

const stubPool = (respond: Responder, queries: string[]) =>
  mock.method(connectionPool, 'getConnection', async () => ({
    beginTransaction: async (): Promise<void> => {},
    commit: async (): Promise<void> => {},
    rollback: async (): Promise<void> => {},
    release: (): void => {},
    query: async (sql: string): Promise<[unknown[]]> => { queries.push(sql); return [respond(sql)] }
  }) as never)

const user = { id: 7, email: 'prof@escola.org', categoryId: 3 }
const resetUser = { user_id: 7, user_email: 'prof@escola.org', person_id: 1, person_name: 'Prof', category_id: 3 }

afterEach(() => mock.restoreAll())
after(async () => { await connectionPool.end() })

describe('requestTokenForResetPassword', () => {
  test('locks the user and resends the live token without replacing it', async () => {
    const queries: string[] = []
    const sent = mock.method(email, 'resetPasswordEmailService', async () => {})
    stubPool(sql => sql.includes('FROM user') ? [user] : sql.includes('FROM token_reset') ? [{ token: 'live-token' }] : [], queries)

    const result = await passwordController.requestTokenForResetPassword({ body: { email: user.email } } as never)

    assert.equal(result.status, 200)
    assert.deepEqual(sent.mock.calls.map(call => call.arguments), [[user.email, 'live-token']])
    assert.ok(queries[0].includes('FOR UPDATE'))
    assert.ok(!queries.some(sql => sql.includes('INSERT INTO token_reset')))
  })

  test('creates and sends a new token when none is live', async () => {
    const queries: string[] = []
    const sent = mock.method(email, 'resetPasswordEmailService', async () => {})
    stubPool(sql => sql.includes('FROM user') ? [user] : [], queries)

    const result = await passwordController.requestTokenForResetPassword({ body: { email: user.email } } as never)

    assert.equal(result.status, 200)
    assert.ok(queries.some(sql => sql.includes('INSERT INTO token_reset')))
    assert.equal(sent.mock.callCount(), 1)
    assert.notEqual(sent.mock.calls[0].arguments[1], 'live-token')
  })
})

describe('qResetPassword', () => {
  const run = (stored: unknown[]) => {
    const queries: string[] = []
    stubPool(sql => sql.includes('FROM user') ? [resetUser] : sql.includes('FROM token_reset') ? stored : [], queries)
    return authRepository.qResetPassword(resetUser.user_email, 'link-token', 'hash')
  }

  test('reports a used link when no token is stored', async () => { assert.equal((await run([])).outcome, 'token_used') })
  test('reports a replaced link when a different token is stored', async () => { assert.equal((await run([{ token: 'newer' }])).outcome, 'token_replaced') })
  test('resets when the stored token matches', async () => { assert.equal((await run([{ token: 'link-token' }])).outcome, 'ok') })
})

describe('isDuplicateUserEmail', () => {
  test('matches only the user email unique index', () => {
    assert.equal(isDuplicateUserEmail({ code: 'ER_DUP_ENTRY', message: "Duplicate entry 'a@b.c' for key 'user.UQ_user_email'" }), true)
    assert.equal(isDuplicateUserEmail({ code: 'ER_DUP_ENTRY', message: "Duplicate entry '7' for key 'user.REL_6aac'" }), false)
    assert.equal(isDuplicateUserEmail(new Error('boom')), false)
  })
})
