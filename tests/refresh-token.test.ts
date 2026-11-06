process.env.SECRET = 'test-secret'

import test, { describe, mock, afterEach, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { AddressInfo } from 'node:net'
import { Server } from 'node:http'
import express, { Request, Response } from 'express'
import { decode, sign } from 'jsonwebtoken'
import { LoginRouter } from '../src/routes/login'
import authorization from '../src/middleware/authorization'
import { authRepository } from '../src/repositories/auth.repository'

type Json = Record<string, any>

let server: Server
let baseUrl = ''

const call = async (path: string, init: { body?: Json, token?: string } = {}) => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (init.token) { headers.Authorization = `Bearer ${init.token}` }
  const res = await fetch(baseUrl + path, { method: init.body ? 'POST' : 'GET', headers, body: init.body ? JSON.stringify(init.body) : undefined })
  return { status: res.status, body: await res.json() as Json }
}

const studentRow = { id: 7, name: 'Aluno', ra: '123456', dv: '7', categoryId: 10, birthDate: '01/01/2015' }

const loginStudent = async () => {
  mock.method(authRepository, 'qStudentByRa', async () => studentRow)
  return (await call('/login/student', { body: { ra: '1234567', birthDate: '01/01/2015' } })).body.data
}

before(async () => {
  const app = express()
  app.use(express.json())
  app.use('/login', LoginRouter)
  app.get('/me', authorization, (req: Request, res: Response) => { res.status(200).json(req.user) })
  server = app.listen(0)
  await new Promise<void>(resolve => server.once('listening', () => resolve()))
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

after(() => { server.close() })

afterEach(() => mock.restoreAll())

describe('refresh token', () => {
  test('login returns refreshToken as the last key and keeps the previous keys in order', async () => {
    const data = await loginStudent()
    assert.deepEqual(Object.keys(data), ['token', 'expiresIn', 'role', 'person', 'studentId', 'refreshToken'])
  })

  test('POST /login/refresh issues a new access token rebuilt from the database', async () => {
    const { refreshToken } = await loginStudent()
    mock.method(authRepository, 'qStudentSession', async () => ({ studentId: 7, ra: '123456', dv: '7', categoryId: 10 }))

    const reply = await call('/login/refresh', { body: { refreshToken } })
    assert.equal(reply.status, 200)
    assert.deepEqual(Object.keys(reply.body.data), ['token', 'expiresIn'])

    const me = await call('/me', { token: reply.body.data.token })
    assert.equal(me.status, 200)
    assert.deepEqual([me.body.student, me.body.ra, me.body.category], [7, '1234567', 10])
  })

  test('the refresh token is not accepted as an access token', async () => {
    const { refreshToken } = await loginStudent()
    assert.equal((await call('/me', { token: refreshToken })).status, 401)
  })

  test('an access token is not accepted as a refresh token', async () => {
    const { token } = await loginStudent()
    const reply = await call('/login/refresh', { body: { token, refreshToken: token } })
    assert.equal(reply.status, 401)
  })

  test('answers 401 when the account no longer exists or the body is missing', async () => {
    const { refreshToken } = await loginStudent()
    mock.method(authRepository, 'qStudentSession', async () => undefined)
    assert.equal((await call('/login/refresh', { body: { refreshToken } })).status, 401)
    assert.equal((await call('/login/refresh', { body: {} })).status, 401)
  })

  test('the new access token never outlives the refresh token', async () => {
    const refreshToken = sign({ user: 3, email: 'p@escola.app', category: 2, typ: 'refresh' }, 'test-secret', { expiresIn: 60 })
    mock.method(authRepository, 'qUserSession', async () => ({ userId: 3, email: 'p@escola.app', categoryId: 2 }))

    const reply = await call('/login/refresh', { body: { refreshToken } })
    assert.equal(reply.status, 200)
    const refreshExp = (decode(refreshToken) as { exp: number }).exp
    assert.ok(reply.body.data.expiresIn <= refreshExp)
  })

  test('an expired refresh token answers 401', async () => {
    const refreshToken = sign({ user: 3, email: 'p@escola.app', category: 2, typ: 'refresh', exp: Math.floor(Date.now() / 1000) - 10 }, 'test-secret')
    assert.equal((await call('/login/refresh', { body: { refreshToken } })).status, 401)
  })
})
