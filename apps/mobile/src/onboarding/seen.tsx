import { createContext, use, useEffect, useMemo, useState } from 'react'
import * as SecureStore from 'expo-secure-store'
import type { ReactNode } from 'react'

// Whether this device has seen the introduction. It shows once, on the first
// launch, and again only when asked for from settings.

const KEY = 'lt-onboarded'

type Onboarding = {
  /** False until the flag is read; the splash stays up until then. */
  ready: boolean
  seen: boolean
  finish: () => void
}

const OnboardingContext = createContext<Onboarding | null>(null)

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    SecureStore.getItemAsync(KEY)
      .then((value) => setSeen(value === '1'))
      // Unreadable: show the introduction, which is harmless.
      .catch(() => {})
      .finally(() => setReady(true))
  }, [])

  const value = useMemo<Onboarding>(
    () => ({
      ready,
      seen,
      finish: () => {
        setSeen(true)
        SecureStore.setItemAsync(KEY, '1').catch(() => {})
      },
    }),
    [ready, seen],
  )

  return <OnboardingContext value={value}>{children}</OnboardingContext>
}

export function useOnboarding() {
  const onboarding = use(OnboardingContext)
  if (!onboarding) throw new Error('useOnboarding needs an OnboardingProvider')
  return onboarding
}
