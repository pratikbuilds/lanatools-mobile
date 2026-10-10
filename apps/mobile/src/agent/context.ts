import { createContext, use } from 'react'
import type { Conversation } from './types'

// What every screen reads: the conversations, from whichever agent is on.

/** The active id before a new chat's first message. */
export const NEW = 'new'

export type ConversationSummary = Omit<Conversation, 'messages'>

export type Store = {
  conversations: ConversationSummary[]
  active: Conversation | null
  /** True while the agent is writing in the active conversation. */
  working: boolean
  open: (id: string) => void
  newChat: () => void
  send: (text: string) => void
  stop: () => void
  rename: (id: string, title: string) => void
  remove: (id: string) => void
  /** Settles a prepared transaction after the user signs or declines it. */
  settleTransaction: (
    messageId: string,
    partId: string,
    state: 'signed' | 'declined',
  ) => void
}

export const StoreContext = createContext<Store | null>(null)

export function useConversations() {
  const store = use(StoreContext)
  if (!store) throw new Error('useConversations needs a ConversationsProvider')
  return store
}

/** A new chat's title: its first line, cut to fit the app bar. */
export function titleFrom(text: string) {
  const line = text.trim().split('\n')[0] ?? ''
  return line.length > 40 ? `${line.slice(0, 39).trimEnd()}…` : line
}
