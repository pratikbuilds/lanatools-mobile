import { createContext } from 'react'
import type { SignInMethod } from './wallet'

/**
 * The wallet that signs the agent's transactions on this phone: the
 * embedded wallet for a Google user, the wallet app they signed in with
 * otherwise (over Mobile Wallet Adapter). It signs and never sends;
 * LanaTools sends.
 */
export type Signer = {
  address: string
  kind: 'embedded' | 'wallet'
  /** Signs a serialized transaction without changing it. */
  signTransaction: (transaction: Uint8Array) => Promise<Uint8Array>
  /** Signs the exact bytes of a message; returns the 64-byte signature. */
  signMessage: (message: Uint8Array) => Promise<Uint8Array>
}

/** Who is signed in, and how to sign in or out. */
export type Session = {
  /**
   * `loading` covers Privy starting up and the embedded wallet being made
   * after a sign-in; `walletError` is a signed-in user whose wallet could
   * not be opened.
   */
  status: 'loading' | 'signedOut' | 'signedIn' | 'walletError'
  /** Why sign-in cannot start in this build, if it cannot. */
  unavailable: string | null
  /** The embedded wallet's address once signed in. */
  address: string | null
  method: SignInMethod | null
  walletError: { message: string; action: 'create' | 'recover' } | null
  /** Rejects on failure, including a cancel; see `isUserCancel`. */
  signInWithGoogle: () => Promise<void>
  /** Rejects on failure, including a cancel; see `isUserCancel`. */
  signInWithWallet: () => Promise<void>
  /** Creates or recovers the embedded wallet after a `walletError`. */
  retryWallet: () => void
  signOut: () => Promise<void>
  /** The Privy access token the agent will verify. */
  getAccessToken: () => Promise<string | null>
  /** Null until signed in, and in builds without Privy. */
  signer: Signer | null
}

export const SessionContext = createContext<Session | null>(null)
