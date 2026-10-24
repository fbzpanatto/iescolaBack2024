import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import { stripAnswerKeys } from '../src/utils/answerKeys'
import { PER_CAT } from '../src/utils/enums'

const student = { user: 1, category: PER_CAT.ALUN }
const teacher = { user: 2, category: PER_CAT.PROF }

const payload = () => ({
  id: 1,
  answer: 'A',
  testQuestions: [{ id: 2, correctLabel: 'B', optionsOrder: [1, 2], options: [{ label: 'A', correctAnswer: true }] }],
  nested: { correctAnswer: 'C', keep: 'x' }
})

describe('stripAnswerKeys', () => {
  test('returns the same reference for non-student users', () => {
    const data = payload()
    assert.equal(stripAnswerKeys(data, teacher), data)
  })

  test('removes answer keys at any depth for students', () => {
    assert.deepEqual(stripAnswerKeys(payload(), student), {
      id: 1,
      testQuestions: [{ id: 2, options: [{ label: 'A' }] }],
      nested: { keep: 'x' }
    })
  })

  test('does not mutate the input', () => {
    const data = payload()
    stripAnswerKeys(data, student)
    assert.deepEqual(data, payload())
  })
})
