import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Hono } from 'hono'
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from 'jose'
import { ownerOf, privyVerifier, userHash } from './auth.ts'
import { routes } from './routes.ts'

const APP_ID = 'test-app'
const ALICE = 'did:privy:alice'
const BOB = 'did:privy:bob'

const privy = await generateKeyPair('ES256')
const forger = await generateKeyPair('ES256')
const jwks = createLocalJWKSet({
  keys: [{ ...(await exportJWK(privy.publicKey)), alg: 'ES256' }],
})

function token(
  sub: string,
  { key = privy.privateKey, audience = APP_ID, issuer = 'privy.io' } = {},
) {
  return new SignJWT({ sid: 'session' })
    .setProtectedHeader({ alg: 'ES256' })
    .setSubject(sub)
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(key)
}

// Stands in for Flue's agent router, which only runs inside a Worker.
const agent = new Hono()
agent.all('/:id', (c) => c.json({ reached: c.req.param('id') }))
agent.all('/:id/abort', (c) => c.json({ aborted: c.req.param('id') }))

const verifier = privyVerifier(APP_ID, jwks)
const app = routes(() => verifier, agent)

function call(path: string, bearer?: string, method = 'POST') {
  return app.request(path, {
    method,
    headers: bearer ? { authorization: `Bearer ${bearer}` } : {},
  })
}

async function newConversation(sub: string) {
  const response = await call('/conversations', await token(sub))
  assert.equal(response.status, 201)
  return ((await response.json()) as { id: string }).id
}

test('health needs no token', async () => {
  const response = await call('/health', undefined, 'GET')
  assert.equal(response.status, 200)
})

test('a conversation without a token is refused', async () => {
  assert.equal((await call('/conversations')).status, 401)
  assert.equal((await call('/agents/lana/x.y')).status, 401)
})

test('a forged token is refused', async () => {
  const forged = await token(ALICE, { key: forger.privateKey })
  assert.equal((await call('/conversations', forged)).status, 401)
})

test("another app's token is refused", async () => {
  const other = await token(ALICE, { audience: 'another-app' })
  assert.equal((await call('/conversations', other)).status, 401)
  const issuer = await token(ALICE, { issuer: 'example.com' })
  assert.equal((await call('/conversations', issuer)).status, 401)
})

test("a new conversation's id starts with the user's hash", async () => {
  const id = await newConversation(ALICE)
  assert.equal(ownerOf(id), await userHash(ALICE))
})

test('the owner reaches their conversation', async () => {
  const id = await newConversation(ALICE)
  const alice = await token(ALICE)
  const response = await call(`/agents/lana/${id}`, alice)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { reached: id })
  assert.equal((await call(`/agents/lana/${id}/abort`, alice)).status, 200)
})

test("another user's conversation is forbidden", async () => {
  const id = await newConversation(ALICE)
  const bob = await token(BOB)
  assert.equal((await call(`/agents/lana/${id}`, bob)).status, 403)
  assert.equal((await call(`/agents/lana/${id}`, bob, 'GET')).status, 403)
  assert.equal((await call(`/agents/lana/${id}/abort`, bob)).status, 403)
})

test('an id without an owner is forbidden', async () => {
  const alice = await token(ALICE)
  assert.equal((await call('/agents/lana/plain-id', alice)).status, 403)
})
