import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { AppState } from 'react-native'
import { useConversations } from '../agent/store'
import { useSession } from '../session/session'
import { fetchBalances } from './balances'
import type { Balances } from './balances'
import type { ReactNode } from 'react'

// The signed-in wallet's balances, kept fresh: on sign-in, when the app
// comes back to the front, every minute, and after each agent reply, since
// a reply may have paid for something.

export type WalletBalances = {
  balances: Balances | null
  loading: boolean
  error: boolean
  /** When the balances were last read, epoch ms. */
  updatedAt: number | null
  refresh: () => void
}

const EVERY_MS = 60_000

const BalancesContext = createContext<WalletBalances | null>(null)

export function BalancesProvider({ children }: { children: ReactNode }) {
  const session = useSession()
  const { working } = useConversations()
  // The wallet that signs and holds the funds: the wallet app for a wallet
  // sign-in, the embedded wallet for Google.
  const address =
    session.status === 'signedIn'
      ? (session.signer?.address ?? session.address)
      : null
  const [read, setRead] = useState<{
    address: string
    balances: Balances | null
    error: boolean
    at: number
  } | null>(null)
  // Only a refresh the user asked for shows as loading; the rest are quiet.
  const [refreshing, setRefreshing] = useState(false)

  // Answers are stored with their address, so one for an account that has
  // since signed out is never shown.
  const load = useCallback(() => {
    if (!address) return Promise.resolve()
    return fetchBalances(address)
      .then(
        (balances) => ({ balances, error: false }),
        () => ({ balances: null, error: true }),
      )
      .then(({ balances, error }) => {
        setRead((previous) => ({
          address,
          // On a failed read, keep the last good balances on screen.
          balances:
            balances ??
            (previous?.address === address ? previous.balances : null),
          error,
          at: Date.now(),
        }))
      })
  }, [address])

  const refresh = useCallback(() => {
    setRefreshing(true)
    void load().finally(() => setRefreshing(false))
  }, [load])

  useEffect(() => {
    void load()
    if (!address) return
    const timer = setInterval(() => void load(), EVERY_MS)
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void load()
    })
    return () => {
      clearInterval(timer)
      sub.remove()
    }
  }, [address, load])

  // After a reply: the agent may have spent USDC.
  const wasWorking = useRef(working)
  useEffect(() => {
    if (wasWorking.current && !working) void load()
    wasWorking.current = working
  }, [working, load])

  const current = read?.address === address ? read : null
  const value = useMemo<WalletBalances>(
    () => ({
      balances: current?.balances ?? null,
      loading: refreshing || (address !== null && current === null),
      error: current?.error ?? false,
      updatedAt: current?.at ?? null,
      refresh,
    }),
    [address, current, refreshing, refresh],
  )

  return <BalancesContext value={value}>{children}</BalancesContext>
}

export function useBalances() {
  const balances = use(BalancesContext)
  if (!balances) throw new Error('useBalances needs a BalancesProvider')
  return balances
}
