process.env.SECRET = 'test-secret'

import test, { describe, mock, afterEach, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { AddressInfo } from 'node:net'
import { Server } from 'node:http'
import express, { Request, Response } from 'express'
import type { PoolConnection } from 'mysql2/promise'
import { checkEnv } from '../src/utils/env'
import { allowedFrontOrigin, corsMiddleware } from '../src/middleware/cors'
import { loginLimiter, TOO_MANY_ATTEMPTS_MESSAGE } from '../src/middleware/rateLimit'
import { LoginRouter } from '../src/routes/login'
import { PasswordRouter } from '../src/routes/password'
import { authRepository } from '../src/repositories/auth.repository'
import { connectionPool } from '../src/services/db'

type Json = Record<string, unknown>
interface Reply { status: number, body: Json, headers: Headers }

const PROD_ENV: NodeJS.ProcessEnv = {
  NODE_ENV: 'production', SECRET: 's', SERVER_PORT: '5000', DB_HOST: 'h', DB_USER: 'u', DB_NAME: 'n', DB_PASS: '',
  FRONT_URL: 'https://escola.app/login', RESET_URL: 'https://escola.app/reset-password?token=',
  EMAIL: 'e', EMAIL_PASS: 'p', AWS_REGION: 'r', AWS_ACCESS_KEY_ID: 'a', AWS_SECRET_ACCESS_KEY: 'k', AWS_S3_BUCKET: 'b'
}

const DEV_ENV: NodeJS.ProcessEnv = { ...PROD_ENV, NODE_ENV: 'development', FRONT_URL: undefined, FRONT_URL_DEV: 'http://localhost:4200/login', RESET_URL_DEV: 'http://localhost:4200/reset-password?token=' }

let server: Server
let baseUrl = ''

const post = async (path: string, body: Json): Promise<Reply> => {
  const res = await fetch(baseUrl + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return { status: res.status, body: await res.json() as Json, headers: res.headers }
}

before(async () => {
  const app = express()
  app.use(express.json())
  app.use('/login', LoginRouter)
  app.use('/reset-password', PasswordRouter)
  app.post('/ok', loginLimiter, (_req: Request, res: Response) => { res.status(200).json({ status: 200 }) })
  server = app.listen(0)
  await new Promise<void>(resolve => server.once('listening', () => resolve()))
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

after(() => { server.close() })

afterEach(() => mock.restoreAll())

describe('checkEnv', () => {
  test('passes with the production variables', () => {
    assert.deepEqual(checkEnv(PROD_ENV), { missing: [], warnings: [] })
  })

  test('requires FRONT_URL_DEV instead of FRONT_URL in development', () => {
    assert.deepEqual(checkEnv(DEV_ENV), { missing: [], warnings: [] })
    assert.deepEqual(checkEnv({ ...DEV_ENV, FRONT_URL_DEV: undefined }).missing, ['FRONT_URL_DEV'])
  })

  test('reports missing, blank and invalid required variables by name', () => {
    const env = { ...PROD_ENV, SECRET: '', SERVER_PORT: undefined, DB_PASS: undefined, FRONT_URL: 'not a url' }
    assert.deepEqual(checkEnv(env).missing, ['SECRET', 'SERVER_PORT', 'DB_PASS', 'FRONT_URL'])
  })

  test('accepts an empty DB_PASS', () => {
    assert.deepEqual(checkEnv({ ...PROD_ENV, DB_PASS: '' }).missing, [])
  })

  test('only warns about email, reset url and S3 variables', () => {
    const env = { ...PROD_ENV, EMAIL: undefined, RESET_URL: undefined, AWS_S3_BUCKET: '' }
    assert.deepEqual(checkEnv(env), { missing: [], warnings: ['EMAIL', 'AWS_S3_BUCKET', 'RESET_URL'] })
  })
})

describe('cors', () => {
  test('derives the allowed origin from FRONT_URL / FRONT_URL_DEV following NODE_ENV', () => {
    assert.equal(allowedFrontOrigin(PROD_ENV), 'https://escola.app')
    assert.equal(allowedFrontOrigin(DEV_ENV), 'http://localhost:4200')
  })

  test('answers the preflight with the front origin and without credentials', async () => {
    const app = express()
    app.use(corsMiddleware(PROD_ENV))
    app.get('/', (_req: Request, res: Response) => { res.json({ message: 'OK' }) })
    const local = app.listen(0)
    await new Promise<void>(resolve => local.once('listening', () => resolve()))
    const url = `http://127.0.0.1:${(local.address() as AddressInfo).port}/`
    try {
      const preflight = await fetch(url, { method: 'OPTIONS', headers: { Origin: 'https://escola.app', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type' } })
      assert.equal(preflight.status, 200)
      assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://escola.app')
      assert.equal(preflight.headers.get('access-control-allow-headers'), 'authorization,content-type')
      assert.equal(preflight.headers.get('access-control-allow-credentials'), null)

      const foreign = await fetch(url, { headers: { Origin: 'https://evil.example' } })
      assert.equal(foreign.headers.get('access-control-allow-origin'), 'https://escola.app')
      assert.deepEqual(await foreign.json(), { message: 'OK' })
    }
    finally { local.close() }
  })
})

describe('POST /login rate limit', () => {
  test('blocks the 11th wrong attempt for the same email with the { status, message } envelope', async () => {
    mock.method(authRepository, 'qLogin', async () => null)
    for (let i = 0; i < 10; i++) {
      const reply = await post('/login', { email: 'Prof@Escola.app', password: 'x' })
      assert.deepEqual([reply.status, reply.body], [401, { status: 401, message: 'Credenciais Inválidas' }])
    }
    const blocked = await post('/login', { email: ' prof@escola.app ', password: 'x' })
    assert.equal(blocked.status, 429)
    assert.deepEqual(blocked.body, { status: 429, message: TOO_MANY_ATTEMPTS_MESSAGE })
    assert.deepEqual(Object.keys(blocked.body), ['status', 'message'])
    assert.ok(Number(blocked.headers.get('retry-after')) > 0)

    const other = await post('/login', { email: 'outro@escola.app', password: 'x' })
    assert.equal(other.status, 401)
  })

  test('does not count server errors', async () => {
    mock.method(authRepository, 'qLogin', async () => { throw new Error('db down') })
    mock.method(console, 'error', () => undefined)
    for (let i = 0; i < 15; i++) {
      const reply = await post('/login', { email: 'db@escola.app', password: 'x' })
      assert.equal(reply.status, 500)
    }
  })

  test('does not count successful requests', async () => {
    for (let i = 0; i < 15; i++) { assert.equal((await post('/ok', { email: 'ok@escola.app' })).status, 200) }
  })

  test('leaves /login/student without limit', async () => {
    mock.method(authRepository, 'qStudentByRa', async () => null)
    for (let i = 0; i < 25; i++) {
      const reply = await post('/login/student', { ra: '1234567', birthDate: '01/01/2015' })
      assert.notEqual(reply.status, 429)
    }
  })
})

describe('POST /reset-password rate limit', () => {
  test('blocks the 6th request for the same email within the hour without reaching the controller', async () => {
    let connections = 0
    const conn = {
      beginTransaction: async () => undefined,
      query: async () => [[]],
      rollback: async () => undefined,
      release: () => undefined
    } as unknown as PoolConnection
    mock.method(connectionPool, 'getConnection', async () => { connections++; return conn })

    for (let i = 0; i < 5; i++) {
      const reply = await post('/reset-password', { email: 'reset@escola.app' })
      assert.deepEqual([reply.status, reply.body], [404, { status: 404, message: 'Não foi possível encontrar o usuário informado.' }])
    }
    const blocked = await post('/reset-password', { email: 'RESET@escola.app' })
    assert.deepEqual([blocked.status, blocked.body], [429, { status: 429, message: TOO_MANY_ATTEMPTS_MESSAGE }])
    assert.equal(connections, 5)
  })
})
