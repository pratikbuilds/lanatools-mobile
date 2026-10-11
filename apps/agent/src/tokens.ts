// Each user's LanaTools access token, as their app last handed it over.
//
// The app keeps the refresh token; the agent only ever holds an access
// token, which expires within the hour. It is stored encrypted (AES-GCM,
// bound to the user's hash) and read back only until it expires, so the
// agent never keeps a credential that outlives the token itself.

/** The slice of D1 the store uses, so tests can pass an in-memory one. */
export type Db = {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      run(): Promise<unknown>
      first<T>(): Promise<T | null>
    }
  }
  exec(sql: string): Promise<unknown>
}

export type TokenStore = {
  save(userHash: string, token: string, expiresAt: number): Promise<void>
  /** The user's token, or null if there is none or it has expired. */
  get(userHash: string): Promise<string | null>
  remove(userHash: string): Promise<void>
}

const SCHEMA = `CREATE TABLE IF NOT EXISTS lanatools_tokens (user_hash TEXT PRIMARY KEY, iv TEXT NOT NULL, token TEXT NOT NULL, expires_at INTEGER NOT NULL)`

const encoder = new TextEncoder()

function toBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
}

function fromBase64(text: string) {
  return Uint8Array.from(atob(text), (c) => c.charCodeAt(0))
}

export function tokenStore(
  db: Db,
  keyBase64: string,
  now: () => number = Date.now,
): TokenStore {
  let ready: Promise<unknown> | undefined
  const table = () => (ready ??= db.exec(SCHEMA))
  const key = crypto.subtle.importKey(
    'raw',
    fromBase64(keyBase64),
    'AES-GCM',
    false,
    ['encrypt', 'decrypt'],
  )

  return {
    async save(userHash, token, expiresAt) {
      await table()
      const iv = crypto.getRandomValues(new Uint8Array(12))
      const sealed = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv, additionalData: encoder.encode(userHash) },
        await key,
        encoder.encode(token),
      )
      await db
        .prepare(
          `INSERT INTO lanatools_tokens (user_hash, iv, token, expires_at) VALUES (?1, ?2, ?3, ?4)
           ON CONFLICT (user_hash) DO UPDATE SET iv = ?2, token = ?3, expires_at = ?4`,
        )
        .bind(
          userHash,
          toBase64(iv),
          toBase64(new Uint8Array(sealed)),
          expiresAt,
        )
        .run()
      // Expired tokens of anyone go on the next save.
      await db
        .prepare('DELETE FROM lanatools_tokens WHERE expires_at <= ?1')
        .bind(now())
        .run()
    },

    async get(userHash) {
      await table()
      const row = await db
        .prepare(
          'SELECT iv, token FROM lanatools_tokens WHERE user_hash = ?1 AND expires_at > ?2',
        )
        .bind(userHash, now())
        .first<{ iv: string; token: string }>()
      if (!row) return null
      try {
        const opened = await crypto.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv: fromBase64(row.iv),
            additionalData: encoder.encode(userHash),
          },
          await key,
          fromBase64(row.token),
        )
        return new TextDecoder().decode(opened)
      } catch {
        // Sealed with another key or for another user: unusable.
        return null
      }
    },

    async remove(userHash) {
      await table()
      await db
        .prepare('DELETE FROM lanatools_tokens WHERE user_hash = ?1')
        .bind(userHash)
        .run()
    },
  }
}

/** The longest a handed-over token is kept, whatever expiry it claims. */
export const MAX_TOKEN_LIFE_MS = 24 * 60 * 60 * 1000

/**
 * The expiry the app sent with a token, as epoch milliseconds: a number in
 * the future, capped at a day. Null if it is missing or makes no sense.
 */
export function parseExpiry(value: string | undefined, now = Date.now()) {
  const at = Number(value)
  if (!value || !Number.isFinite(at) || at <= now) return null
  return Math.min(at, now + MAX_TOKEN_LIFE_MS)
}
