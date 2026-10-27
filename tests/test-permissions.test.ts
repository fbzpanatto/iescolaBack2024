import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import permissions from '../src/utils/permissions'
import { PER_CAT, TEST_CATEGORIES_IDS } from '../src/utils/enums'
import { testAccessService } from '../src/services/test-access.service'

const METHODS = ['GET', 'POST', 'PUT', 'DELETE'] as const

const EXPECTED: Record<number, Record<typeof METHODS[number], boolean>> = {
  [PER_CAT.ADMN]: { GET: true, POST: true, PUT: true, DELETE: true },
  [PER_CAT.SUPE]: { GET: true, POST: true, PUT: true, DELETE: false },
  [PER_CAT.FORM]: { GET: true, POST: true, PUT: true, DELETE: false },
}

const READ_ONLY = { GET: true, POST: false, PUT: false, DELETE: false }

describe('permissions on the test entity', () => {
  for (const category of Object.values(PER_CAT)) {
    const expected = EXPECTED[category] ?? READ_ONLY
    test(`category ${category} gets ${JSON.stringify(expected)}`, () => {
      for (const method of METHODS) {
        assert.equal(permissions(category, 'test', method), expected[method], `${method} for category ${category}`)
      }
    })
  }
})

describe('restricted creators (SUPE and FORM)', () => {
  test('only SUPE and FORM are restricted', () => {
    for (const category of Object.values(PER_CAT)) {
      const restricted = category === PER_CAT.SUPE || category === PER_CAT.FORM
      assert.equal(testAccessService.isRestrictedCreator({ user: 1, category }), restricted)
    }
  })

  test('only SIM_ITA and AVL_ITA are allowed', () => {
    for (const id of Object.values(TEST_CATEGORIES_IDS)) {
      const allowed = id === TEST_CATEGORIES_IDS.SIM_ITA || id === TEST_CATEGORIES_IDS.AVL_ITA
      assert.equal(testAccessService.isCategoryAllowedForRestricted(id), allowed)
      assert.equal(testAccessService.isCategoryAllowedForRestricted(String(id)), allowed)
    }
    assert.equal(testAccessService.isCategoryAllowedForRestricted(undefined), false)
  })
})
