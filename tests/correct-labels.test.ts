import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import { canonicalLabelsFor, displayLabelsFor, normalizeCorrectLabels } from '../src/utils/correctLabels'

describe('normalizeCorrectLabels', () => {
  test('accepts a single label', () => {
    assert.equal(normalizeCorrectLabels('c'), 'C')
  })

  test('accepts two labels and sorts them', () => {
    assert.equal(normalizeCorrectLabels('DA'), 'AD')
    assert.equal(normalizeCorrectLabels('ad'), 'AD')
  })

  test('rejects empty, null and undefined', () => {
    assert.equal(normalizeCorrectLabels(''), null)
    assert.equal(normalizeCorrectLabels(null), null)
    assert.equal(normalizeCorrectLabels(undefined), null)
  })

  test('rejects more than two labels, repeated labels and unknown labels', () => {
    assert.equal(normalizeCorrectLabels('ABC'), null)
    assert.equal(normalizeCorrectLabels('AA'), null)
    assert.equal(normalizeCorrectLabels('AE'), null)
    assert.equal(normalizeCorrectLabels('A,D'), null)
  })
})

describe('label mapping with optionsOrder', () => {
  test('is identity without optionsOrder', () => {
    assert.equal(displayLabelsFor('AD', null), 'AD')
    assert.equal(canonicalLabelsFor('AD', null), 'AD')
  })

  test('maps canonical to display and back for two labels', () => {
    const order = 'DCBA'
    assert.equal(displayLabelsFor('AB', order), 'CD')
    assert.equal(canonicalLabelsFor('CD', order), 'AB')
  })

  test('round trips for every permutation sample', () => {
    for (const order of ['BACD', 'DCBA', 'CDAB']) {
      for (const labels of ['A', 'B', 'AD', 'BC', 'CD']) {
        assert.equal(canonicalLabelsFor(displayLabelsFor(labels, order), order), labels)
      }
    }
  })

  test('single label behaves as before', () => {
    assert.equal(displayLabelsFor('A', 'DCBA'), 'D')
    assert.equal(canonicalLabelsFor('D', 'DCBA'), 'A')
  })
})
