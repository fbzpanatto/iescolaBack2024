import test, { describe, mock, afterEach, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { AddressInfo } from 'node:net'
import { Server } from 'node:http'
import express, { NextFunction, Request, Response } from 'express'
import { TestRouter } from '../src/routes/test'
import { testQuestionRepository } from '../src/repositories/test-question.repository'
import { catalogRepository } from '../src/repositories/catalog.repository'
import { connectionPool } from '../src/services/db'
import { PER_CAT } from '../src/utils/enums'

type Json = Record<string, any>

let server: Server
let baseUrl = ''

const samplePdf = readFileSync(join(__dirname, 'answer-key', 'answer-key-7.pdf'))

const send = async (body: Uint8Array, contentType = 'application/pdf'): Promise<{ status: number, body: Json }> => {
  const res = await fetch(`${baseUrl}/test/import-answer-key`, { method: 'POST', headers: { 'Content-Type': contentType }, body })
  return { status: res.status, body: await res.json() as Json }
}

before(async () => {
  const app = express()
  app.use((req: Request, _res: Response, next: NextFunction) => { req.user = { user: 1, category: PER_CAT.ADMN }; next() })
  app.use('/test', TestRouter)
  server = app.listen(0)
  await new Promise<void>(resolve => server.once('listening', () => resolve()))
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

after(async () => { server.close(); await connectionPool.end() })

afterEach(() => mock.restoreAll())

describe('POST /test/import-answer-key validation', () => {
  test('rejects an empty body', async () => {
    const reply = await send(new Uint8Array(0))
    assert.equal(reply.status, 400)
    assert.equal(reply.body.message, 'Envie um arquivo PDF.')
  })

  test('rejects a body that is not a PDF', async () => {
    const reply = await send(new TextEncoder().encode('{"not":"a pdf"}'))
    assert.equal(reply.status, 400)
    assert.equal(reply.body.message, 'O arquivo enviado não é um PDF válido.')
  })

  test('rejects another content type', async () => {
    const reply = await send(samplePdf, 'text/plain')
    assert.equal(reply.status, 400)
    assert.equal(reply.body.message, 'Envie um arquivo PDF.')
  })

  test('rejects a body above 10 MB with a JSON 400', async () => {
    const reply = await send(new Uint8Array(10 * 1024 * 1024 + 1))
    assert.equal(reply.status, 400)
    assert.equal(reply.body.message, 'O arquivo excede o limite de 10 MB.')
  })

  test('rejects a file that starts like a PDF but cannot be read', async () => {
    const reply = await send(new TextEncoder().encode('%PDF-1.4 broken'))
    assert.equal(reply.status, 400)
    assert.equal(reply.body.message, 'Não foi possível ler o PDF.')
  })
})

describe('POST /test/import-answer-key with the 7th grade sample', () => {
  test('resolves skills and disciplines with one query each', async () => {
    const skills = mock.method(testQuestionRepository, 'qSkillsByReferences', async (references: string[]) => {
      assert.ok(!references.includes('F07HI13A') || references.length > 1)
      return references.filter(reference => reference !== 'F07HI13A').map((reference, index) => ({ id: index + 1, reference, description: 'x' }))
    })
    const disciplines = mock.method(catalogRepository, 'qDisciplines', async () => [{ id: 3, name: 'HISTÓRIA' }, { id: 4, name: 'GEOGRAFIA' }, { id: 5, name: 'CIÊNCIAS' }] as never)

    const reply = await send(samplePdf)

    assert.equal(reply.status, 200)
    assert.equal(skills.mock.callCount(), 1)
    assert.equal(disciplines.mock.callCount(), 1)
    assert.equal(reply.body.data.year, 7)
    assert.deepEqual(reply.body.data.blocks.map((block: Json) => block.disciplineId), [4, 3, 5])
    const history = reply.body.data.blocks[1].questions
    assert.equal(history.length, 6)
    assert.equal(history[4].reference, 'F07HI13A')
    assert.equal(history[4].skillId, null)
    assert.notEqual(history[3].skillId, null)
    assert.deepEqual(reply.body.data.blocks[2].questions.map((question: Json) => question.answer), ['B', 'A', 'C', 'B', 'A', 'D'])
  })

  test('discipline without a match gets disciplineId null', async () => {
    mock.method(testQuestionRepository, 'qSkillsByReferences', async () => [])
    mock.method(catalogRepository, 'qDisciplines', async () => [{ id: 5, name: 'Ciencias' }] as never)
    const reply = await send(samplePdf)
    assert.deepEqual(reply.body.data.blocks.map((block: Json) => block.disciplineId), [null, null, 5])
  })
})
