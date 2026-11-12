import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import { parseContact } from '../src/controller/contact'

const valid = { name: 'Maria Silva', email: 'maria@escola.org', institution: 'Colégio X', segment: 'Escola privada', message: 'Gostaria de conhecer a plataforma.' }

describe('parseContact', () => {
  test('accepts a valid contact and trims it', () => {
    assert.deepEqual(parseContact({ ...valid, name: '  Maria   Silva ' }), valid)
  })

  test('rejects a missing body, a bad email, a short name and a short message', () => {
    assert.equal(parseContact(undefined), null)
    for (const bad of [{ email: 'maria@escola' }, { email: 'a b@c.com' }, { name: 'M' }, { message: 'oi' }]) {
      assert.equal(parseContact({ ...valid, ...bad }), null)
    }
  })

  test('folds line breaks out of the single-line fields so they cannot inject mail headers', () => {
    const parsed = parseContact({ ...valid, name: 'Maria\r\nBcc: x@y.com' })
    assert.equal(parsed?.name, 'Maria Bcc: x@y.com')
  })

  test('caps the field sizes', () => {
    const parsed = parseContact({ ...valid, message: 'a'.repeat(5000), institution: 'b'.repeat(500) })
    assert.equal(parsed?.message.length, 3000)
    assert.equal(parsed?.institution.length, 160)
  })
})
