import { DatabaseSync } from 'node:sqlite'
import type { Db } from './tokens.ts'

/** An in-memory SQLite database shaped like the slice of D1 the store uses. */
export function memoryDb(): Db {
  const sqlite = new DatabaseSync(':memory:')
  return {
    prepare(sql) {
      const statement = sqlite.prepare(sql)
      return {
        bind(...values) {
          const params = values as (string | number | null)[]
          return {
            run: async () => statement.run(...params),
            first: async <T>() =>
              (statement.get(...params) as T | undefined) ?? null,
          }
        },
      }
    },
    exec: async (sql) => sqlite.exec(sql),
  }
}
