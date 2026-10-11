// Linking LanaTools to this app: an ordinary OAuth grant for the "LanaTools
// Mobile" client, approved in the app instead of on the web consent page.
//
// The app makes the PKCE pair, sends the user's choice with their Privy
// token to mcp.lanatools.sh/first-party/authorize, gets the code back in
// the response body (nothing is ever redirected), and exchanges it at
// /token. Refresh tokens rotate; `invalid_grant` means the user revoked the
// app in the dashboard. Pure functions apart from fetch, so tests run in
// Node with Node's crypto.

export const MCP_ORIGIN = 'https://mcp.lanatools.sh'
export const RESOURCE = `${MCP_ORIGIN}/mcp`
/** Registered once on production as a public client (PKCE, no secret). */
export const CLIENT_ID = 'lM9n__ljgQjW3U05'
/** Required by OAuth and registered, but never redirected to. */
export const REDIRECT_URI = 'lanatools://oauth/callback'

/** The tool families a grant can include, as LanaTools names them. */
export const TOOL_SCOPES = [
  'helius:read',
  'payments:pay',
  'jupiter:read',
  'phoenix:read',
  'phoenix:trade',
  'solana:transfer',
] as const
export type ToolScope = (typeof TOOL_SCOPES)[number]

/** Ticked until the user changes them, as on the web consent page. */
export const DEFAULT_SCOPES: readonly ToolScope[] = [
  'helius:read',
  'payments:pay',
]

/** What the user approved: tool families, and a USD limit with Pay. */
export type Grant = { scopes: ToolScope[]; limitUsd: string | null }

export type Tokens = {
  accessToken: string
  refreshToken: string
  /** Epoch milliseconds. */
  expiresAt: number
  grant: Grant
}

/** Randomness and SHA-256, from expo-crypto in the app, Node in tests. */
export type CryptoKit = {
  random: (bytes: number) => Uint8Array
  sha256: (text: string) => Promise<Uint8Array>
}

/** The grant was revoked or the client disconnected: link again. */
export class RevokedError extends Error {
  constructor() {
    super('LanaTools access was revoked')
  }
}

/** LanaTools refused or failed, with its message for the user. */
export class LinkError extends Error {}

export function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
}

const MAX_LIMIT_USD = 1000

/**
 * Why a choice cannot be sent, in the consent card's words, or null. The
 * same rules LanaTools applies: Pay needs a limit of $0 to $1,000 with at
 * most six decimals, and a limit needs Pay.
 */
export function choiceError(grant: Grant): string | null {
  const pay = grant.scopes.includes('payments:pay')
  if (!pay) return grant.limitUsd ? 'A spending limit needs Pay' : null
  const limit = grant.limitUsd?.trim().replace(/^\$/, '') ?? ''
  if (!limit) return 'Set a spending limit for Pay'
  if (!/^\d{1,7}(\.\d{1,6})?$/.test(limit) || Number(limit) > MAX_LIMIT_USD)
    return 'Set a limit between $0 and $1,000'
  return null
}

/** Whether to refresh now: within five minutes of expiry, or past it. */
export function needsRefresh(expiresAt: number, now = Date.now()) {
  return expiresAt - now < 5 * 60 * 1000
}

type TokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in?: number
  error?: string
}

function tokensFrom(
  body: TokenResponse,
  grant: Grant,
  previousRefresh: string | null,
  now: number,
): Tokens {
  const refreshToken = body.refresh_token ?? previousRefresh
  if (!body.access_token || !refreshToken)
    throw new LinkError('LanaTools returned no tokens. Try again.')
  return {
    accessToken: body.access_token,
    refreshToken,
    // An hour when LanaTools does not say.
    expiresAt: now + (body.expires_in ?? 3600) * 1000,
    grant,
  }
}

async function postToken(form: Record<string, string>) {
  const response = await fetch(`${MCP_ORIGIN}/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form).toString(),
  })
  const body = (await response.json().catch(() => ({}))) as TokenResponse
  return { ok: response.ok, body }
}

/**
 * Approves the grant with the user's Privy session and exchanges the code
 * for tokens. Throws `LinkError` with LanaTools' message when it refuses.
 */
export async function link(
  privyToken: string,
  grant: Grant,
  crypto: CryptoKit,
  now: () => number = Date.now,
): Promise<Tokens> {
  const verifier = base64url(crypto.random(32))
  const challenge = base64url(await crypto.sha256(verifier))
  const state = base64url(crypto.random(16))

  const response = await fetch(`${MCP_ORIGIN}/first-party/authorize`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${privyToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state,
      resource: RESOURCE,
      decision: 'approve',
      scopes: grant.scopes,
      ...(grant.limitUsd ? { limitUsd: grant.limitUsd.trim() } : {}),
    }),
  })
  const body = (await response.json().catch(() => ({}))) as {
    code?: string
    state?: string
    error?: string
  }
  if (!response.ok || !body.code)
    throw new LinkError(body.error ?? 'LanaTools could not connect. Try again.')
  if (body.state !== state)
    throw new LinkError('LanaTools answered for another request. Try again.')

  const exchanged = await postToken({
    grant_type: 'authorization_code',
    code: body.code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    code_verifier: verifier,
  })
  if (!exchanged.ok)
    throw new LinkError('LanaTools could not finish connecting. Try again.')
  return tokensFrom(exchanged.body, grant, null, now())
}

/** A fresh access token. Throws `RevokedError` once the grant is gone. */
export async function refresh(
  tokens: Tokens,
  now: () => number = Date.now,
): Promise<Tokens> {
  const result = await postToken({
    grant_type: 'refresh_token',
    refresh_token: tokens.refreshToken,
    client_id: CLIENT_ID,
  })
  if (result.body.error === 'invalid_grant') throw new RevokedError()
  if (!result.ok)
    throw new LinkError("Couldn't reach LanaTools. Check your connection.")
  return tokensFrom(result.body, tokens.grant, tokens.refreshToken, now())
}
