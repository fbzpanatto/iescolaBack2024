import test, { describe, mock, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import type { Response } from 'express'
import { sendResponse, INTERNAL_ERROR_MESSAGE } from '../src/utils/sendResponse'

type Sent = { statusCode?: number, body?: unknown }

const fakeRes = (sent: Sent): Response => {
  const res = {
    status(code: number) { sent.statusCode = code; return res },
    json(body: unknown) { sent.body = body; return res }
  }
  return res as unknown as Response
}

afterEach(() => mock.restoreAll())

describe('sendResponse', () => {
  test('passes non-500 responses through unchanged', () => {
    for (const response of [{ status: 200, data: { id: 1 } }, { status: 404, message: 'Data not found' }, { status: 403, message: 'Sem permissão.' }]) {
      const sent: Sent = {}
      sendResponse(fakeRes(sent), response)
      assert.equal(sent.statusCode, response.status)
      assert.deepEqual(sent.body, response)
    }
  })

  test('hides the raw message of 500 responses, keeps key order and logs the original', () => {
    const errors: unknown[] = []
    mock.method(console, 'error', (...args: unknown[]) => { errors.push(...args) })
    const sent: Sent = {}
    sendResponse(fakeRes(sent), { status: 500, message: "ER_NO_SUCH_TABLE: Table 'x' doesn't exist" })
    assert.equal(sent.statusCode, 500)
    assert.deepEqual(sent.body, { status: 500, message: INTERNAL_ERROR_MESSAGE })
    assert.deepEqual(Object.keys(sent.body as object), ['status', 'message'])
    assert.deepEqual(errors, ["ER_NO_SUCH_TABLE: Table 'x' doesn't exist"])
  })

  test('leaves 500 responses without a message untouched', () => {
    const sent: Sent = {}
    sendResponse(fakeRes(sent), { status: 500, error: 'Erro ao gerar URL de upload' })
    assert.deepEqual(sent.body, { status: 500, error: 'Erro ao gerar URL de upload' })
  })
})
