import { useCallback, useEffect, useState } from 'react'
import * as SecureStore from 'expo-secure-store'
import type { Outcome } from './transactions'

// What became of each prepared transaction on this phone, kept across
// restarts. The thread rebuilds its cards from the agent's tool results,
// which always say "ready", so without this a sent swap would ask to be
// signed again after a restart.

const keyFor = (id: string) => `lt-tx.${id}`

/**
 * The recorded outcomes of the transactions `ids`, read once each, and a
 * way to record a new one.
 */
export function useTransactionOutcomes(ids: string[]) {
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({})
  const [asked] = useState(() => new Set<string>())
  const key = ids.join(',')

  useEffect(() => {
    for (const id of key.split(',')) {
      if (!id || asked.has(id)) continue
      asked.add(id)
      SecureStore.getItemAsync(keyFor(id))
        .then((text) => {
          if (!text) return
          const saved = JSON.parse(text) as Outcome
          // A newer outcome recorded meanwhile wins.
          setOutcomes((all) => (id in all ? all : { ...all, [id]: saved }))
        })
        .catch(() => {})
    }
  }, [asked, key])

  const record = useCallback((id: string, outcome: Outcome) => {
    setOutcomes((all) => ({ ...all, [id]: outcome }))
    SecureStore.setItemAsync(keyFor(id), JSON.stringify(outcome)).catch(
      () => {},
    )
  }, [])

  return { outcomes, record }
}
