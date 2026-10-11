import { env } from 'cloudflare:workers'
import { tokenStore } from './tokens.ts'
import type { TokenStore } from './tokens.ts'

// One token store per Worker isolate, shared by the routes and the agent.
let store: TokenStore | undefined
export function tokens() {
  store ??= tokenStore(env.DB, env.LANATOOLS_TOKEN_KEY)
  return store
}
