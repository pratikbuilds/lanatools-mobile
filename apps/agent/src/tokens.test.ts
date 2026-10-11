import assert from 'node:assert/strict'
import { test } from 'node:test'
import { memoryDb } from './test-db.ts'
import { MAX_TOKEN_LIFE_S, parseExpiry, tokenStore } from './tokens.ts'

const KEY = Buffer.alloc(32, 7).toString('base64')
const OTHER_KEY = Buffer.alloc(32, 9).toString('base64')
const HOUR = 60 * 60 * 1000

test('a saved token reads back until it expires', async () => {
  let now = 1_000_000
  const store = tokenStore(memoryDb(), KEY, () => now)
  await store.save('alice', 'token-a', now + HOUR)
  assert.equal(await store.get('alice'), 'token-a')
  now += HOUR
  assert.equal(await store.get('alice'), null)
})

test('a newer token replaces the old one', async () => {
  const store = tokenStore(memoryDb(), KEY, () => 0)
  await store.save('alice', 'first', HOUR)
  await store.save('alice', 'second', HOUR)
  assert.equal(await store.get('alice'), 'second')
})

test('each user reads only their own token', async () => {
  const store = tokenStore(memoryDb(), KEY, () => 0)
  await store.save('alice', 'token-a', HOUR)
  assert.equal(await store.get('bob'), null)
})

test('tokens are stored encrypted', async () => {
  const db = memoryDb()
  await tokenStore(db, KEY, () => 0).save('alice', 'secret-token', HOUR)
  const row = await db
    .prepare('SELECT token FROM lanatools_tokens WHERE user_hash = ?1')
    .bind('alice')
    .first<{ token: string }>()
  assert.ok(row)
  assert.ok(!Buffer.from(row.token, 'base64').toString().includes('secret'))
})

test('a token sealed with another key does not open', async () => {
  const db = memoryDb()
  await tokenStore(db, OTHER_KEY, () => 0).save('alice', 'token-a', HOUR)
  assert.equal(await tokenStore(db, KEY, () => 0).get('alice'), null)
})

test('removing forgets the token', async () => {
  const store = tokenStore(memoryDb(), KEY, () => 0)
  await store.save('alice', 'token-a', HOUR)
  await store.remove('alice')
  assert.equal(await store.get('alice'), null)
})

test('an expiry is the seconds left, on the agent clock, capped at an hour', () => {
  const now = 1_000_000
  assert.equal(parseExpiry(undefined, now), null)
  assert.equal(parseExpiry('soon', now), null)
  assert.equal(parseExpiry('0', now), null)
  assert.equal(parseExpiry('-5', now), null)
  assert.equal(parseExpiry('600', now), now + 600_000)
  assert.equal(parseExpiry('86400', now), now + MAX_TOKEN_LIFE_S * 1000)
})

test('a failed table setup is retried, not cached', async () => {
  let calls = 0
  const db = memoryDb()
  const flaky = {
    ...db,
    exec: async (sql: string) => {
      calls += 1
      if (calls === 1) throw new Error('D1 busy')
      return db.exec(sql)
    },
  }
  const store = tokenStore(flaky, KEY, () => 0)
  await assert.rejects(store.get('alice'), /D1 busy/)
  await store.save('alice', 'token-a', HOUR)
  assert.equal(await store.get('alice'), 'token-a')
})
