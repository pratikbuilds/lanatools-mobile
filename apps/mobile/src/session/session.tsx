import { createContext, use, useMemo } from 'react'
import type { ReactNode } from 'react'

// Who is signed in. Privy plugs in here (docs/PLAN.md, milestone 2); until
// a Privy app is configured, sign-in is unavailable and says so, as the web
// sign-in page does without an app ID.

export type Session = {
  status: 'signedOut' | 'signedIn'
  /** Why sign-in cannot start in this build, if it cannot. */
  unavailable: string | null
  /** The embedded wallet's address once signed in. */
  address: string | null
  signInWithGoogle: () => Promise<void>
  signInWithWallet: () => Promise<void>
}

const SessionContext = createContext<Session | null>(null)

const PRIVY_APP_ID = process.env.EXPO_PUBLIC_PRIVY_APP_ID

export function SessionProvider({ children }: { children: ReactNode }) {
  const value = useMemo<Session>(() => {
    const unavailable = PRIVY_APP_ID
      ? null
      : 'Sign-in is unavailable in this build.'
    const notYet = async () => {
      throw new Error(unavailable ?? 'Sign-in is not connected yet.')
    }
    return {
      status: 'signedOut',
      unavailable,
      address: null,
      signInWithGoogle: notYet,
      signInWithWallet: notYet,
    }
  }, [])
  return <SessionContext value={value}>{children}</SessionContext>
}

export function useSession() {
  const session = use(SessionContext)
  if (!session) throw new Error('useSession needs a SessionProvider')
  return session
}
