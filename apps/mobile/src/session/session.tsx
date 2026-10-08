import { createContext, use, useMemo, useState } from 'react'
import { MOCK_ADDRESS } from '../agent/mock'
import type { ReactNode } from 'react'

// Who is signed in. Privy plugs in here (docs/PLAN.md, milestone 2). Until
// then sign-in is unavailable and says so, as the web sign-in page does
// without an app ID, unless the mock agent is on, in which case it signs
// in to a mock wallet so the whole flow can be used.

export type Session = {
  status: 'signedOut' | 'signedIn'
  /** Why sign-in cannot start in this build, if it cannot. */
  unavailable: string | null
  /** The embedded wallet's address once signed in. */
  address: string | null
  method: 'google' | 'wallet' | null
  signInWithGoogle: () => Promise<void>
  signInWithWallet: () => Promise<void>
  signOut: () => void
}

const SessionContext = createContext<Session | null>(null)

const PRIVY_APP_ID = process.env.EXPO_PUBLIC_PRIVY_APP_ID
export const MOCK_AGENT = process.env.EXPO_PUBLIC_MOCK_AGENT === '1'

export function SessionProvider({ children }: { children: ReactNode }) {
  const [method, setMethod] = useState<Session['method']>(null)

  const value = useMemo<Session>(() => {
    const unavailable =
      PRIVY_APP_ID || MOCK_AGENT
        ? null
        : 'Sign-in is unavailable in this build.'
    const signIn = (as: 'google' | 'wallet') => async () => {
      if (!MOCK_AGENT)
        throw new Error(unavailable ?? 'Sign-in is not connected yet.')
      await new Promise((resolve) => setTimeout(resolve, 700))
      setMethod(as)
    }
    return {
      status: method ? 'signedIn' : 'signedOut',
      unavailable,
      address: method ? MOCK_ADDRESS : null,
      method,
      signInWithGoogle: signIn('google'),
      signInWithWallet: signIn('wallet'),
      signOut: () => setMethod(null),
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
