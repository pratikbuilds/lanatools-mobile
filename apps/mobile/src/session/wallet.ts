// What a Privy user and their embedded Solana wallet mean for the app.
// Pure, so it runs under `node --test` without React Native. Ported from
// the Privy integration in perp-ai (src/wallet/session.ts).

export type SignInMethod = 'google' | 'wallet'

export type SolanaWalletStatus =
  | 'connected'
  | 'connecting'
  | 'reconnecting'
  | 'disconnected'
  | 'needs-recovery'
  | 'creating'
  | 'not-created'
  | 'error'

export type WalletState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | {
      status: 'signedIn'
      userId: string
      address: string
      method: SignInMethod
    }
  | { status: 'walletError'; message: string; action: 'create' | 'recover' }

export type LinkedLoginAccount = {
  type: string
  latest_verified_at?: number | null
  verified_at?: number
  wallet_client_type?: string | null
  connector_type?: string | null
}

/**
 * How the user last signed in: the most recently verified Google account or
 * external wallet. The embedded wallet is not a way in, so it never counts.
 */
export function signInMethodFrom(accounts: LinkedLoginAccount[]): SignInMethod {
  let best: { method: SignInMethod; at: number } | null = null
  for (const account of accounts) {
    const method = methodOf(account)
    if (!method) continue
    const at = account.latest_verified_at ?? account.verified_at ?? 0
    if (!best || at > best.at) best = { method, at }
  }
  return best?.method ?? 'google'
}

function methodOf(account: LinkedLoginAccount): SignInMethod | undefined {
  switch (account.type) {
    case 'google_oauth':
      return 'google'
    case 'wallet':
      // A Sign In With Solana wallet may carry no client type at all.
      return account.wallet_client_type === 'privy' ||
        account.connector_type === 'embedded'
        ? undefined
        : 'wallet'
    default:
      return undefined
  }
}

/** How the settings and drawer name a sign-in method. */
export function methodLabel(method: SignInMethod) {
  return method === 'wallet' ? 'Solana wallet' : 'Google'
}

/**
 * The app's view of Privy. A user only counts as signed in once their
 * embedded wallet is there: the agent and every signature use it, never the
 * wallet they signed in with.
 */
export function walletStateFrom(input: {
  isReady: boolean
  user: { id: string; linked_accounts: LinkedLoginAccount[] } | null
  embeddedAddress: string | null
  solanaStatus: SolanaWalletStatus | null
  privyError: string | null
  createError: string | null
}): WalletState {
  if (!input.isReady) return { status: 'loading' }
  if (!input.user) return { status: 'signedOut' }
  if (input.embeddedAddress) {
    return {
      status: 'signedIn',
      userId: input.user.id,
      address: input.embeddedAddress,
      method: signInMethodFrom(input.user.linked_accounts),
    }
  }
  const failed = input.createError ?? input.privyError
  if (failed)
    return { status: 'walletError', message: failed, action: 'create' }
  switch (input.solanaStatus) {
    case 'needs-recovery':
      return {
        status: 'walletError',
        message: 'Your wallet needs to be recovered before it can be used.',
        action: 'recover',
      }
    case 'error':
    case 'disconnected':
      return {
        status: 'walletError',
        message: 'Your wallet could not be opened.',
        action: 'create',
      }
    case 'connected':
    case 'connecting':
    case 'reconnecting':
    case 'creating':
    case 'not-created':
    case null:
      return { status: 'loading' }
  }
}

export function solanaStatusFrom(status: string): SolanaWalletStatus | null {
  switch (status) {
    case 'connected':
    case 'connecting':
    case 'reconnecting':
    case 'disconnected':
    case 'needs-recovery':
    case 'creating':
    case 'not-created':
    case 'error':
      return status
    default:
      return null
  }
}

/**
 * Closing Google's page or declining in the wallet app. Not a failure, so
 * the sheet says nothing. MWA reports a declined authorization as -1.
 */
export function isUserCancel(error: unknown) {
  const text = error instanceof Error ? error.message : String(error)
  return /cancel|dismiss|denied|declined|user.?reject|-1/i.test(text)
}

/** No app on the phone answers Mobile Wallet Adapter requests. */
export function isNoWallet(error: unknown) {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String(error.code)
      : ''
  const text = error instanceof Error ? error.message : String(error)
  return code === 'ERROR_WALLET_NOT_FOUND' || /no installed wallet/i.test(text)
}

export function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}
