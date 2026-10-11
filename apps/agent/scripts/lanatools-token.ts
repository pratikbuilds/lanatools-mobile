// Gets a LanaTools MCP access token for local development and writes it to
// .dev.vars as LANATOOLS_MCP_TOKEN, until the app hands each user's own
// token to the agent (docs/PLAN.md, milestone 4).
//
// The first run registers a dev OAuth client with mcp.lanatools.sh and opens
// the normal lanatools.sh consent page in the browser. Later runs refresh
// the token without the browser. The client and its refresh token stay in
// .dev.lanatools.json, git-ignored and never loaded into the Worker.
//
//   npm run token --workspace apps/agent

import { createHash, randomBytes } from 'node:crypto'
import { execFile } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'

const ISSUER = 'https://mcp.lanatools.sh'
const RESOURCE = `${ISSUER}/mcp`
const PORT = 8976
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`
const STATE_FILE = new URL('../.dev.lanatools.json', import.meta.url)
const DEV_VARS = new URL('../.dev.vars', import.meta.url)

type Saved = { clientId: string; refreshToken: string | null }
type Tokens = {
  access_token: string
  refresh_token?: string
  expires_in?: number
}

const base64url = (bytes: Buffer) => bytes.toString('base64url')

function load(): Saved | null {
  if (!existsSync(STATE_FILE)) return null
  return JSON.parse(readFileSync(STATE_FILE, 'utf8')) as Saved
}

function save(saved: Saved) {
  writeFileSync(STATE_FILE, `${JSON.stringify(saved, null, 2)}\n`, {
    mode: 0o600,
  })
}

/** Sets LANATOOLS_MCP_TOKEN in .dev.vars, keeping every other line. */
function writeToken(token: string) {
  const line = `LANATOOLS_MCP_TOKEN=${token}`
  const current = existsSync(DEV_VARS) ? readFileSync(DEV_VARS, 'utf8') : ''
  const next = /^LANATOOLS_MCP_TOKEN=.*$/m.test(current)
    ? current.replace(/^LANATOOLS_MCP_TOKEN=.*$/m, line)
    : `${current.trimEnd()}\n${line}\n`.trimStart()
  writeFileSync(DEV_VARS, next, { mode: 0o600 })
}

async function token(body: Record<string, string>): Promise<Tokens> {
  const response = await fetch(`${ISSUER}/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  })
  const json = (await response.json()) as Tokens & { error?: string }
  if (!response.ok)
    throw new Error(`Token request failed: ${json.error ?? response.status}`)
  return json
}

async function register(): Promise<string> {
  const response = await fetch(`${ISSUER}/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_name: 'LanaTools Mobile (local agent)',
      redirect_uris: [REDIRECT_URI],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    }),
  })
  if (!response.ok)
    throw new Error(`Client registration failed: ${response.status}`)
  const { client_id } = (await response.json()) as { client_id: string }
  return client_id
}

/** Runs the browser consent and resolves with the authorization code. */
function consent(clientId: string, verifier: string): Promise<string> {
  const state = base64url(randomBytes(16))
  const url = new URL(`${ISSUER}/authorize`)
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    code_challenge: base64url(createHash('sha256').update(verifier).digest()),
    code_challenge_method: 'S256',
    state,
    resource: RESOURCE,
  }).toString()

  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const params = new URL(req.url ?? '/', REDIRECT_URI).searchParams
      if (!req.url?.startsWith('/callback')) {
        res.writeHead(404).end()
        return
      }
      const code = params.get('code')
      const ok = code && params.get('state') === state
      res
        .writeHead(ok ? 200 : 400, { 'content-type': 'text/plain' })
        .end(
          ok
            ? 'LanaTools is connected. You can close this tab.'
            : 'LanaTools did not connect.',
        )
      server.close()
      if (ok) resolve(code)
      else reject(new Error(params.get('error') ?? 'State did not match'))
    })
    server.listen(PORT, '127.0.0.1', () => {
      console.log(`Approve LanaTools in your browser:\n${url}\n`)
      execFile('open', [url.toString()])
    })
  })
}

async function main() {
  const saved = load()
  if (saved?.refreshToken) {
    try {
      const tokens = await token({
        grant_type: 'refresh_token',
        refresh_token: saved.refreshToken,
        client_id: saved.clientId,
      })
      save({
        clientId: saved.clientId,
        refreshToken: tokens.refresh_token ?? saved.refreshToken,
      })
      writeToken(tokens.access_token)
      console.log(`Refreshed LANATOOLS_MCP_TOKEN (${expiry(tokens)}).`)
      return
    } catch (error) {
      // Revoked in the dashboard, or expired: consent again.
      console.log(`${(error as Error).message}. Connecting again.`)
    }
  }

  const clientId = saved?.clientId ?? (await register())
  save({ clientId, refreshToken: null })
  const verifier = base64url(randomBytes(32))
  const code = await consent(clientId, verifier)
  const tokens = await token({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: clientId,
    code_verifier: verifier,
  })
  save({ clientId, refreshToken: tokens.refresh_token ?? null })
  writeToken(tokens.access_token)
  console.log(`Wrote LANATOOLS_MCP_TOKEN to .dev.vars (${expiry(tokens)}).`)
}

function expiry(tokens: Tokens) {
  return tokens.expires_in
    ? `valid for ${Math.round(tokens.expires_in / 60)} minutes`
    : 'no expiry given'
}

main().catch((error: unknown) => {
  console.error((error as Error).message)
  process.exit(1)
})
