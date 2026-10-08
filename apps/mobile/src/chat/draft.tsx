import { createContext, use, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

// The message being written, kept outside the chat screen so the sign-in
// sheet (its own route) can see it and nothing is lost while the user signs
// in.

type Draft = {
  text: string
  setText: (text: string) => void
  /** True when the user tried to send `text` and was asked to sign in. */
  waiting: boolean
  setWaiting: (waiting: boolean) => void
}

const DraftContext = createContext<Draft | null>(null)

export function DraftProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useState('')
  const [waiting, setWaiting] = useState(false)
  const value = useMemo(
    () => ({ text, setText, waiting, setWaiting }),
    [text, waiting],
  )
  return <DraftContext value={value}>{children}</DraftContext>
}

export function useDraft() {
  const draft = use(DraftContext)
  if (!draft) throw new Error('useDraft needs a DraftProvider')
  return draft
}
