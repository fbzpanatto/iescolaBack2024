import { PoolConnection } from "mysql2/promise";
import { connectionPool } from "./db";

const MAX_ATTEMPTS = 3
const RETRYABLE_ERRNOS: ReadonlySet<number> = new Set([1213, 1205])

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

const isRetryable = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null || !('errno' in error)) { return false }
  const { errno } = error as { errno: unknown }
  return typeof errno === 'number' && RETRYABLE_ERRNOS.has(errno)
}

export async function withConnection<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await connectionPool.getConnection()
  try { return await fn(conn) }
  finally { conn.release() }
}

// ⚠️ fn é reexecutada do zero em deadlock (1213) ou lock wait timeout (1205): precisa ser idempotente e não pode mutar seus parâmetros.
export async function withTransaction<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    let conn: PoolConnection | undefined
    try {
      conn = await connectionPool.getConnection()
      await conn.beginTransaction()
      const result = await fn(conn)
      await conn.commit()
      return result
    }
    catch (error: unknown) {
      if (conn) { await conn.rollback() }
      if (!isRetryable(error) || attempt >= MAX_ATTEMPTS) { throw error }
    }
    finally { if (conn) { conn.release() } }
    await sleep(50 * attempt)
  }
}
