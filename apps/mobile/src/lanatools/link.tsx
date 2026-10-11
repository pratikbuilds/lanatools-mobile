import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import * as Crypto from 'expo-crypto'
import * as SecureStore from 'expo-secure-store'
import { AGENT_URL } from '../agent/config'
import { useSession } from '../session/session'
import { RevokedError, link as approve, needsRefresh, refresh } from './oauth'
import type { CryptoKit, Grant, Tokens } from './oauth'
import type { ReactNode } from 'react'

// This user's LanaTools connection. The tokens stay on the phone, in
// SecureStore under the user's wallet address; the agent only ever gets an
// access token, with each message.

/**
 * `revoked`: the user disconnected LanaTools Mobile in the dashboard, so
 * the app asks them to connect again.
 */
export type LinkStatus = 'loading' | 'unlinked' | 'linked' | 'revoked'

export type AccessToken = { token: string; expiresAt: number }

export type LanaToolsLink = {
  status: LinkStatus
  /** What the user approved, while linked. */
  grant: Grant | null
  /** Rejects with `LinkError` and LanaTools' reason when it refuses. */
  connect: (grant: Grant) => Promise<void>
  disconnect: () => Promise<void>
  /** A current access token, refreshed first if it is about to expire. */
  accessToken: () => Promise<AccessToken | null>
}

const kit: CryptoKit = {
  random: (bytes) => Crypto.getRandomBytes(bytes),
  sha256: async (text) =>
    new Uint8Array(
      await Crypto.digest(
        Crypto.CryptoDigestAlgorithm.SHA256,
        new TextEncoder().encode(text),
      ),
    ),
}

/** Base58 addresses are valid SecureStore keys as they are. */
const keyFor = (address: string) => `lanatools.tokens.${address}`

const LinkContext = createContext<LanaToolsLink | null>(null)

export function LanaToolsProvider({ children }: { children: ReactNode }) {
  const session = useSession()
  const address = session.status === 'signedIn' ? session.address : null
  const { getAccessToken } = session
  // What SecureStore holds for this address, once read. Status follows
  // from it, so a sign-out or another user never shows stale tokens.
  const [saved, setSaved] = useState<{
    address: string
    tokens: Tokens | null
    revoked: boolean
  } | null>(null)
  const tokens = useRef<Tokens | null>(null)
  // One refresh at a time: refresh tokens rotate, so a second would fail.
  const refreshing = useRef<Promise<Tokens | null> | null>(null)

  const store = useCallback(
    async (next: Tokens | null, revoked = false) => {
      if (!address) return
      tokens.current = next
      setSaved({ address, tokens: next, revoked })
      await (next
        ? SecureStore.setItemAsync(keyFor(address), JSON.stringify(next))
        : SecureStore.deleteItemAsync(keyFor(address)))
    },
    [address],
  )

  // Read this user's tokens when they sign in.
  useEffect(() => {
    tokens.current = null
    if (!address) return
    let live = true
    SecureStore.getItemAsync(keyFor(address))
      .then((text) => (text ? (JSON.parse(text) as Tokens) : null))
      .catch(() => null)
      .then((found) => {
        if (!live) return
        tokens.current = found
        setSaved({ address, tokens: found, revoked: false })
      })
    return () => {
      live = false
    }
  }, [address])

  const current = saved?.address === address ? saved : null
  const status: LinkStatus = !address
    ? session.status === 'loading'
      ? 'loading'
      : 'unlinked'
    : !current
      ? 'loading'
      : current.tokens
        ? 'linked'
        : current.revoked
          ? 'revoked'
          : 'unlinked'
  const grant = current?.tokens?.grant ?? null

  const accessToken = useCallback(async (): Promise<AccessToken | null> => {
    const current = tokens.current
    if (!current) return null
    if (!needsRefresh(current.expiresAt))
      return { token: current.accessToken, expiresAt: current.expiresAt }
    refreshing.current ??= refresh(current)
      .then(async (next) => {
        await store(next)
        return next
      })
      .catch(async (error: unknown) => {
        if (error instanceof RevokedError) {
          await store(null, true)
          return null
        }
        // Offline or LanaTools busy: the old token while it lasts.
        return current.expiresAt > Date.now() ? current : null
      })
      .finally(() => {
        refreshing.current = null
      })
    const next = await refreshing.current
    return next ? { token: next.accessToken, expiresAt: next.expiresAt } : null
  }, [store])

  const value = useMemo<LanaToolsLink>(
    () => ({
      status,
      grant,
      connect: async (choice) => {
        const privy = await getAccessToken()
        if (!privy) throw new Error('Sign in first')
        await store(await approve(privy, choice, kit))
      },
      disconnect: async () => {
        await store(null)
        // The agent forgets the access token it holds too. Best effort: it
        // expires within the hour anyway.
        const privy = await getAccessToken()
        if (privy)
          await fetch(`${AGENT_URL}/lanatools/token`, {
            method: 'DELETE',
            headers: { authorization: `Bearer ${privy}` },
          }).catch(() => {})
      },
      accessToken,
    }),
    [accessToken, getAccessToken, grant, status, store],
  )

  return <LinkContext value={value}>{children}</LinkContext>
}

export function useLanaTools() {
  const link = use(LinkContext)
  if (!link) throw new Error('useLanaTools needs a LanaToolsProvider')
  return link
}
