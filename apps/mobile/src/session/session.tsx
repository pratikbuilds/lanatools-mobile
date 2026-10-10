import { use, useMemo, useState } from 'react'
import { MOCK_ADDRESS } from '../agent/mock'
import { MOCK_AGENT, PRIVY_APP_ID, PRIVY_CLIENT_ID } from './config'
import { SessionContext } from './context'
import { PrivySession } from './privy'
import type { Session } from './context'
import type { SignInMethod } from './wallet'
import type { ReactNode } from 'react'

export type { Session } from './context'
export { MOCK_AGENT } from './config'
export { methodLabel } from './wallet'

/**
 * Privy when the build has its app and client IDs. Without them, sign-in
 * is unavailable and says so, as the web sign-in page does without an app
 * ID, unless the mock agent is on: then it signs in to a mock wallet so the
 * whole flow can be used.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  if (PRIVY_APP_ID && PRIVY_CLIENT_ID)
    return (
      <PrivySession appId={PRIVY_APP_ID} clientId={PRIVY_CLIENT_ID}>
        {children}
      </PrivySession>
    )
  return <LocalSession>{children}</LocalSession>
}

function LocalSession({ children }: { children: ReactNode }) {
  const [method, setMethod] = useState<SignInMethod | null>(null)

  const value = useMemo<Session>(() => {
    const unavailable = MOCK_AGENT
      ? null
      : 'Sign-in is unavailable in this build.'
    const signIn = (as: SignInMethod) => async () => {
      if (!MOCK_AGENT) throw new Error(unavailable ?? 'Sign-in is off.')
      await new Promise((resolve) => setTimeout(resolve, 700))
      setMethod(as)
    }
    return {
      status: method ? 'signedIn' : 'signedOut',
      unavailable,
      address: method ? MOCK_ADDRESS : null,
      method,
      walletError: null,
      signInWithGoogle: signIn('google'),
      signInWithWallet: signIn('wallet'),
      retryWallet: () => undefined,
      signOut: async () => setMethod(null),
      getAccessToken: async () => null,
    }
  }, [method])

  return <SessionContext value={value}>{children}</SessionContext>
}

export function useSession() {
  const session = use(SessionContext)
  if (!session) throw new Error('useSession needs a SessionProvider')
  return session
}

/** `7Ky2…Ba4T`, the dashboard's compact address. */
export function shortAddress(address: string) {
  return `${address.slice(0, 4)}…${address.slice(-4)}`
}
