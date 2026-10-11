import assert from 'node:assert/strict'
import { createHash, randomBytes } from 'node:crypto'
import { afterEach, test } from 'node:test'
import {
  CLIENT_ID,
  LinkError,
  REDIRECT_URI,
  RevokedError,
  base64url,
  choiceError,
  link,
  needsRefresh,
  refresh,
} from './oauth.ts'
import type { CryptoKit, Tokens } from './oauth.ts'

const kit: CryptoKit = {
  random: (n) => new Uint8Array(randomBytes(n)),
  sha256: async (text) =>
    new Uint8Array(createHash('sha256').update(text).digest()),
}

type Call = { url: string; init: RequestInit }
const realFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = realFetch
})

/** Answers each request in turn and records what was sent. */
function serve(...answers: ((call: Call) => [number, unknown])[]) {
  const calls: Call[] = []
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    const call = { url: String(url), init }
    calls.push(call)
    const answer = answers.shift()
    if (!answer) throw new Error(`Unexpected request to ${url}`)
    const [status, body] = answer(call)
    return new Response(JSON.stringify(body), { status })
  }) as typeof fetch
  return calls
}

const json = (call: Call) =>
  JSON.parse(String(call.init.body)) as Record<string, unknown>
const form = (call: Call) => new URLSearchParams(String(call.init.body))

test('a choice needs a limit exactly when it includes Pay', () => {
  assert.equal(choiceError({ scopes: ['helius:read'], limitUsd: null }), null)
  assert.equal(
    choiceError({ scopes: ['payments:pay'], limitUsd: null }),
    'Set a spending limit for Pay',
  )
  assert.equal(choiceError({ scopes: ['payments:pay'], limitUsd: '$5' }), null)
  assert.equal(
    choiceError({ scopes: ['payments:pay'], limitUsd: '0.50' }),
    null,
  )
  assert.equal(
    choiceError({ scopes: ['payments:pay'], limitUsd: '1001' }),
    'Set a limit between $0 and $1,000',
  )
  assert.equal(
    choiceError({ scopes: ['payments:pay'], limitUsd: 'five' }),
    'Set a limit between $0 and $1,000',
  )
  assert.equal(
    choiceError({ scopes: ['helius:read'], limitUsd: '5' }),
    'A spending limit needs Pay',
  )
})

test('tokens refresh within five minutes of expiry', () => {
  const now = 1_000_000
  assert.equal(needsRefresh(now + 10 * 60_000, now), false)
  assert.equal(needsRefresh(now + 4 * 60_000, now), true)
  assert.equal(needsRefresh(now - 1, now), true)
})

test('linking sends PKCE with the Privy token, then exchanges the code', async () => {
  const calls = serve(
    (call) => [200, { code: 'the-code', state: json(call).state }],
    () => [
      200,
      { access_token: 'access', refresh_token: 'refresh', expires_in: 3600 },
    ],
  )
  const grant = { scopes: ['helius:read' as const], limitUsd: null }
  const tokens = await link('privy-token', grant, kit, () => 1000)

  const [authorize, exchange] = calls
  assert.ok(authorize && exchange)
  assert.equal(authorize.url, 'https://mcp.lanatools.sh/first-party/authorize')
  assert.equal(
    (authorize.init.headers as Record<string, string>).authorization,
    'Bearer privy-token',
  )
  const body = json(authorize)
  assert.equal(body.client_id, CLIENT_ID)
  assert.equal(body.redirect_uri, REDIRECT_URI)
  assert.equal(body.code_challenge_method, 'S256')
  assert.deepEqual(body.scopes, ['helius:read'])
  assert.equal('limitUsd' in body, false)

  const sent = form(exchange)
  assert.equal(exchange.url, 'https://mcp.lanatools.sh/token')
  assert.equal(sent.get('grant_type'), 'authorization_code')
  assert.equal(sent.get('code'), 'the-code')
  // The verifier hashes to the challenge sent with the request.
  const verifier = sent.get('code_verifier') ?? ''
  assert.equal(body.code_challenge, base64url(await kit.sha256(verifier)))

  assert.deepEqual(tokens, {
    accessToken: 'access',
    refreshToken: 'refresh',
    expiresAt: 1000 + 3600 * 1000,
    grant,
  })
})

test("LanaTools' refusal reaches the user", async () => {
  serve(() => [400, { error: 'Set a spending limit' }])
  await assert.rejects(
    link('privy', { scopes: ['payments:pay'], limitUsd: null }, kit),
    (error: unknown) =>
      error instanceof LinkError && error.message === 'Set a spending limit',
  )
})

test('a code for another state is refused', async () => {
  serve(() => [200, { code: 'the-code', state: 'someone-else' }])
  await assert.rejects(
    link('privy', { scopes: [], limitUsd: null }, kit),
    LinkError,
  )
})

const linked: Tokens = {
  accessToken: 'old',
  refreshToken: 'refresh-1',
  expiresAt: 0,
  grant: { scopes: ['helius:read'], limitUsd: null },
}

test('a refresh rotates the refresh token', async () => {
  const calls = serve(() => [
    200,
    { access_token: 'new', refresh_token: 'refresh-2', expires_in: 60 },
  ])
  const tokens = await refresh(linked, () => 0)
  assert.equal(form(calls[0]!).get('refresh_token'), 'refresh-1')
  assert.equal(tokens.accessToken, 'new')
  assert.equal(tokens.refreshToken, 'refresh-2')
  assert.equal(tokens.expiresAt, 60_000)
})

test('a revoked grant fails the refresh as revoked', async () => {
  serve(() => [400, { error: 'invalid_grant' }])
  await assert.rejects(refresh(linked), RevokedError)
})

test('a network failure on refresh is not a revocation', async () => {
  serve(() => [503, { error: 'temporarily_unavailable' }])
  await assert.rejects(refresh(linked), LinkError)
})
