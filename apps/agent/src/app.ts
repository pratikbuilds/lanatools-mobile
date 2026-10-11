import { createAgentRouter } from '@flue/runtime/routing'
import { Lana } from './agents/lana.ts'
import { privyVerifier } from './auth.ts'
import { routes } from './routes.ts'
import type { Verify } from './auth.ts'

// Privy's keys are fetched once per Worker isolate and cached by jose.
let verifier: Verify | undefined
function verify() {
  const appId = process.env.PRIVY_APP_ID
  if (!appId) throw new Error('PRIVY_APP_ID is not set')
  verifier ??= privyVerifier(appId)
  return verifier
}

export default routes(verify, createAgentRouter(Lana))
