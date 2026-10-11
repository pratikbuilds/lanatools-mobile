import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  PrivyProvider,
  useEmbeddedSolanaWallet,
  useLoginWithOAuth,
  useLoginWithSiws,
  usePrivy,
} from '@privy-io/expo'
import {
  MobileWalletProvider,
  createSolanaMainnet,
  fromUint8Array,
  toUint8Array,
  useMobileWallet,
} from '@wallet-ui/react-native-kit'
import { getTransactionDecoder, getTransactionEncoder } from '@solana/kit'
import { APP_IDENTITY, SIWS_DOMAIN, SIWS_URI } from './config'
import {
  errorMessage,
  externalWalletFrom,
  solanaStatusFrom,
  walletStateFrom,
} from './wallet'
import { SessionContext } from './context'
import type { Session, Signer } from './context'
import type { ReactNode } from 'react'

// Privy, the way perp-ai integrates it: Google or a Solana wallet on the
// phone (Mobile Wallet Adapter, then Sign In With Solana) gets the user in,
// and either way the session is the user's Privy embedded Solana wallet.
// The wallet they signed in with only proves who they are.

// MWA sessions are for mainnet. Sign-in sends nothing to this RPC; it
// only names the chain the wallet authorizes.
const cluster = createSolanaMainnet('https://api.mainnet-beta.solana.com')

export function PrivySession({
  appId,
  clientId,
  children,
}: {
  appId: string
  clientId: string
  children: ReactNode
}) {
  return (
    <PrivyProvider
      appId={appId}
      clientId={clientId}
      config={{ embedded: { solana: { createOnLogin: 'all-users' } } }}
    >
      <MobileWalletProvider cluster={cluster} identity={APP_IDENTITY}>
        <SessionFromPrivy>{children}</SessionFromPrivy>
      </MobileWalletProvider>
    </PrivyProvider>
  )
}

function SessionFromPrivy({ children }: { children: ReactNode }) {
  return <SessionContext value={usePrivySession()}>{children}</SessionContext>
}

function usePrivySession(): Session {
  const { error, isReady, user, logout, getAccessToken } = usePrivy()
  const solana = useEmbeddedSolanaWallet()
  const oauth = useLoginWithOAuth()
  const siws = useLoginWithSiws()
  const mobileWallet = useMobileWallet()
  const embedded = solana.wallets?.[0]
  const createWallet = solana.create
  const recoverWallet = solana.recover
  const solanaStatus = solanaStatusFrom(solana.status)
  const privyError = error
    ? errorMessage(error, 'Could not restore your session.')
    : null
  // A wallet failure belongs to the user it happened to, so it clears
  // when they sign out.
  const [failure, setFailure] = useState<{
    userId: string
    message: string
  } | null>(null)
  const userId = user?.id ?? null
  const createError =
    failure && failure.userId === userId ? failure.message : null
  const setCreateError = useCallback(
    (message: string | null) =>
      setFailure(message && userId ? { userId, message } : null),
    [userId],
  )

  // `createOnLogin` covers new sign-ins. A user restored from an earlier
  // session without a wallet gets one here, and this is the only place
  // that creates one.
  const needsWallet =
    isReady &&
    !!user &&
    !privyError &&
    !embedded &&
    solanaStatus === 'not-created' &&
    !createError
  useEffect(() => {
    if (!needsWallet || !createWallet) return
    let cancelled = false
    createWallet().catch((caught: unknown) => {
      if (!cancelled)
        setCreateError(errorMessage(caught, 'Could not create your wallet.'))
    })
    return () => {
      cancelled = true
    }
  }, [needsWallet, createWallet, setCreateError])

  const retryWallet = useCallback(() => {
    setCreateError(null)
    if (solanaStatus === 'needs-recovery') {
      recoverWallet?.().catch((caught: unknown) => {
        setCreateError(errorMessage(caught, 'Could not recover your wallet.'))
      })
    } else if (solanaStatus === 'error' || solanaStatus === 'disconnected') {
      createWallet?.().catch((caught: unknown) => {
        setCreateError(errorMessage(caught, 'Could not create your wallet.'))
      })
    }
  }, [createWallet, recoverWallet, solanaStatus, setCreateError])

  const { login: loginWithOAuth } = oauth
  const signInWithGoogle = useCallback(async () => {
    const signedIn = await loginWithOAuth({ provider: 'google' })
    // Privy resolves with no user when Google's page is closed.
    if (!signedIn) throw new Error('Google sign-in cancelled.')
  }, [loginWithOAuth])

  // Connect to whichever wallet app the user picks, then have it sign
  // Privy's Sign In With Solana message. No transaction, no funds.
  const { connect, signMessages, disconnect } = mobileWallet
  const { generateMessage, login: loginWithSiws } = siws
  const signInWithWallet = useCallback(async () => {
    const account = await connect()
    const { message } = await generateMessage({
      from: { domain: SIWS_DOMAIN, uri: SIWS_URI },
      wallet: { address: account.address.toString() },
    })
    const signed = await signMessages(new TextEncoder().encode(message))
    const signature = signed instanceof Uint8Array ? signed : signed[0]
    if (!signature) throw new Error('The wallet returned no signature.')
    await loginWithSiws({ message, signature: fromUint8Array(signature) })
  }, [connect, generateMessage, signMessages, loginWithSiws])

  // Sign out of Privy even if the wallet app is gone and can't be told.
  const signOut = useCallback(async () => {
    try {
      await logout()
    } finally {
      await disconnect().catch(() => undefined)
    }
  }, [logout, disconnect])

  // Transactions are signed by the wallet the user came in with: their
  // wallet app over MWA, or for a Google user the embedded wallet, each
  // after they approve it in the app.
  const external = user ? externalWalletFrom(user.linked_accounts) : null
  const { signTransaction: signWithWallet, account: walletAccount } =
    mobileWallet
  const signer = useMemo<Signer | null>(() => {
    if (external)
      return {
        address: external,
        kind: 'wallet',
        signTransaction: async (bytes) => {
          // After a restart the wallet app is asked to authorize again.
          const account = walletAccount ?? (await connect())
          if (account.address.toString() !== external)
            throw new Error(
              `Switch your wallet app to ${external.slice(0, 4)}…${external.slice(-4)}, the wallet you signed in with.`,
            )
          const signed = await signWithWallet(
            getTransactionDecoder().decode(bytes),
          )
          return new Uint8Array(getTransactionEncoder().encode(signed))
        },
        signMessage: async (message) => {
          const account = walletAccount ?? (await connect())
          if (account.address.toString() !== external)
            throw new Error(
              'Switch your wallet app to the wallet you signed in with.',
            )
          const signed = await signMessages(message)
          const signature = signed instanceof Uint8Array ? signed : signed[0]
          if (!signature) throw new Error('The wallet returned no signature.')
          return signature
        },
      }
    if (!embedded) return null
    return {
      address: embedded.address,
      kind: 'embedded',
      signTransaction: async (bytes) => {
        const provider = await embedded.getProvider()
        const { signedTransaction } = await provider.request({
          method: 'signTransaction',
          params: { transaction: bytes },
        })
        return signedTransaction
      },
      signMessage: async (message) => {
        const provider = await embedded.getProvider()
        const { signature } = await provider.request({
          method: 'signMessage',
          params: { message: fromUint8Array(message) },
        })
        return toUint8Array(signature)
      },
    }
  }, [external, embedded, walletAccount, connect, signWithWallet, signMessages])

  const state = walletStateFrom({
    isReady,
    user: user ? { id: user.id, linked_accounts: user.linked_accounts } : null,
    embeddedAddress: embedded?.address ?? null,
    solanaStatus,
    privyError,
    createError,
  })
  const status = state.status
  const address = status === 'signedIn' ? state.address : null
  const method = status === 'signedIn' ? state.method : null
  const problem = status === 'walletError' ? state.message : null
  const action = status === 'walletError' ? state.action : null

  return useMemo<Session>(
    () => ({
      status,
      unavailable: null,
      address,
      method,
      walletError: problem && action ? { message: problem, action } : null,
      signInWithGoogle,
      signInWithWallet,
      retryWallet,
      signOut,
      getAccessToken,
      signer: status === 'signedIn' ? signer : null,
    }),
    [
      signer,
      status,
      address,
      method,
      problem,
      action,
      signInWithGoogle,
      signInWithWallet,
      retryWallet,
      signOut,
      getAccessToken,
    ],
  )
}
