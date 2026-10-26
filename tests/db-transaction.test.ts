import test, { describe, mock, afterEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { connectionPool } from '../src/services/db'
import { withTransaction, withConnection } from '../src/services/dbTransaction'

type Event = 'getConnection' | 'begin' | 'commit' | 'rollback' | 'release'

const dbError = (message: string, errno?: number): Error & { errno?: number } => Object.assign(new Error(message), errno ? { errno } : {})

const stubPool = (events: Event[]) =>
  mock.method(connectionPool, 'getConnection', async () => {
    events.push('getConnection')
    return {
      beginTransaction: async (): Promise<void> => { events.push('begin') },
      commit: async (): Promise<void> => { events.push('commit') },
      rollback: async (): Promise<void> => { events.push('rollback') },
      release: (): void => { events.push('release') }
    } as never
  })

afterEach(() => mock.restoreAll())
after(async () => { await connectionPool.end() })

describe('withTransaction', () => {
  test('commits and releases on success', async () => {
    const events: Event[] = []
    stubPool(events)
    const result = await withTransaction(async () => 42)
    assert.equal(result, 42)
    assert.deepEqual(events, ['getConnection', 'begin', 'commit', 'release'])
  })

  test('rolls back, releases and rethrows non-retryable errors without retrying', async () => {
    const events: Event[] = []
    stubPool(events)
    await assert.rejects(withTransaction(async () => { throw dbError('boom', 1062) }), /boom/)
    assert.deepEqual(events, ['getConnection', 'begin', 'rollback', 'release'])
  })

  test('retries a deadlock (1213) and succeeds on the next attempt', async () => {
    const events: Event[] = []
    stubPool(events)
    let calls = 0
    const result = await withTransaction(async () => { calls++; if (calls === 1) { throw dbError('Deadlock found', 1213) } return 'ok' })
    assert.equal(result, 'ok')
    assert.equal(calls, 2)
    assert.deepEqual(events, ['getConnection', 'begin', 'rollback', 'release', 'getConnection', 'begin', 'commit', 'release'])
  })

  test('gives up after 3 lock wait timeouts (1205) and propagates the original error', async () => {
    const events: Event[] = []
    stubPool(events)
    let calls = 0
    await assert.rejects(withTransaction(async () => { calls++; throw dbError('Lock wait timeout', 1205) }), (error: Error & { errno?: number }) => error.errno === 1205)
    assert.equal(calls, 3)
    assert.equal(events.filter(e => e === 'release').length, 3)
  })
})

describe('withConnection', () => {
  test('releases the connection even when the callback throws', async () => {
    const events: Event[] = []
    stubPool(events)
    await assert.rejects(withConnection(async () => { throw new Error('fail') }), /fail/)
    assert.deepEqual(events, ['getConnection', 'release'])
  })
})
