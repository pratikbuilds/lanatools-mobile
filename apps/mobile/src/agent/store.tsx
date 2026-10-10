import { MOCK_AGENT } from '../session/session'
import { FlueConversationsProvider } from './flue-store'
import { MockConversationsProvider } from './mock-store'
import type { ReactNode } from 'react'

export { useConversations } from './context'

/**
 * Conversations with the Flue agent or, with EXPO_PUBLIC_MOCK_AGENT=1, the
 * mock that plays back scripted replies.
 */
export function ConversationsProvider({ children }: { children: ReactNode }) {
  return MOCK_AGENT ? (
    <MockConversationsProvider>{children}</MockConversationsProvider>
  ) : (
    <FlueConversationsProvider>{children}</FlueConversationsProvider>
  )
}
