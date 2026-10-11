import { createMiddleware } from 'hono/factory'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { JWTVerifyGetKey } from 'jose'

// Who is calling, and whether the conversation is theirs.
//
// Every request carries the app's Privy access token. It is checked against
// Privy's published keys for the LanaTools app (ES256, issuer privy.io,
// audience the app ID), so the agent never holds the Privy app secret.
//
// Conversation ids are `<user hash>.<uuid>`, issued by POST /conversations.
// A request may reach a conversation only if the id starts with the
// caller's hash. Privy user ids contain colons, so the id carries a hash.

/** Resolves a Privy access token to its Privy user id, or throws. */
export type Verify = (token: string) => Promise<string>

export function privyVerifier(
  appId: string,
  keys: JWTVerifyGetKey = createRemoteJWKSet(
    new URL(`https://auth.privy.io/api/v1/apps/${appId}/jwks.json`),
  ),
): Verify {
  return async (token) => {
    const { payload } = await jwtVerify(token, keys, {
      issuer: 'privy.io',
      audience: appId,
      algorithms: ['ES256'],
    })
    if (!payload.sub) throw new Error('The token names no user')
    return payload.sub
  }
}

/** A Privy user id as a short, path-safe hash: 22 base64url characters. */
export async function userHash(userId: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(userId),
  )
  return btoa(String.fromCharCode(...new Uint8Array(digest).slice(0, 16)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
}

export function conversationId(hash: string) {
  return `${hash}.${crypto.randomUUID()}`
}

/** The owner's hash in a conversation id, or null if it has none. */
export function ownerOf(id: string) {
  const [hash, rest] = id.split('.', 2)
  return hash && rest ? hash : null
}

export type AuthVariables = { userHash: string }

/** 401 without a valid Privy token; otherwise sets `userHash`. */
export function requireUser(verify: () => Verify) {
  return createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    const header = c.req.header('authorization') ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    // Outside the try: a misconfigured agent is a 500, not a bad token.
    const check = verify()
    let userId: string
    try {
      if (!token) throw new Error('No token')
      userId = await check(token)
    } catch {
      return c.json({ error: 'unauthorized' }, 401)
    }
    c.set('userHash', await userHash(userId))
    await next()
  })
}

/** 403 unless the `:id` conversation belongs to the caller. */
export const requireOwner = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const id = c.req.param('id') ?? ''
    if (ownerOf(id) !== c.get('userHash'))
      return c.json({ error: 'forbidden' }, 403)
    await next()
  },
)
