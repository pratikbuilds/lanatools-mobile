import { useEffect, useMemo, useRef, useState } from 'react'
import { useFlueAgent } from '@flue/react'
import { createFlueClient } from '@flue/sdk'
import { NEW, StoreContext, titleFrom } from './context'
import { toThread } from './flue'
import type { ConversationSummary, Store } from './context'
import type { ReactNode } from 'react'

// Conversations with the LanaTools agent on Flue. The agent keeps each
// conversation's messages; the app follows the active one live and keeps
// only the list of conversations, for this session.

const AGENT_URL = process.env.EXPO_PUBLIC_AGENT_URL ?? 'http://localhost:8787'

/** A conversation id; until the agent issues them (docs/PLAN.md, auth). */
function newId() {
  const random = Array.from({ length: 4 }, () =>
    Math.floor(Math.random() * 0x100000000).toString(36),
  )
  return [Date.now().toString(36), ...random].join('')
}

export function FlueConversationsProvider({
  children,
}: {
  children: ReactNode
}) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activeId, setActiveId] = useState(NEW)
  // A new chat's first message, sent once its conversation is followed.
  const first = useRef<string | null>(null)

  const client = useMemo(
    () =>
      activeId === NEW
        ? undefined
        : createFlueClient({ url: `${AGENT_URL}/agents/lana/${activeId}` }),
    [activeId],
  )
  const agent = useFlueAgent({ client })
  const { sendMessage, refresh } = agent

  useEffect(() => {
    const text = first.current
    if (!text || !client) return
    first.current = null
    // The hook found no conversation at this id when it mounted, so once
    // the first message has created one, it looks again and follows it. A
    // failed send stays in the thread with its error.
    sendMessage(text).then(refresh, () => {})
  }, [client, refresh, sendMessage])

  const messages = useMemo(
    () => toThread(agent.messages, agent.status),
    [agent.messages, agent.status],
  )
  const working = agent.status === 'submitted' || agent.status === 'streaming'

  const value = useMemo<Store>(() => {
    const summary = conversations.find((c) => c.id === activeId)
    const touch = (id: string) =>
      setConversations((all) =>
        all.map((c) => (c.id === id ? { ...c, updatedAt: Date.now() } : c)),
      )
    return {
      conversations,
      active: summary ? { ...summary, messages } : null,
      working,
      open: setActiveId,
      newChat: () => setActiveId(NEW),
      send: (text) => {
        const trimmed = text.trim()
        if (!trimmed || working) return
        if (activeId !== NEW) {
          sendMessage(trimmed).catch(() => {})
          touch(activeId)
          return
        }
        const id = newId()
        setConversations((all) => [
          { id, title: titleFrom(trimmed), updatedAt: Date.now() },
          ...all,
        ])
        first.current = trimmed
        setActiveId(id)
      },
      stop: () => void client?.abort(),
      rename: (id, title) =>
        setConversations((all) =>
          all.map((c) => (c.id === id ? { ...c, title } : c)),
        ),
      remove: (id) => {
        setConversations((all) => all.filter((c) => c.id !== id))
        if (id === activeId) setActiveId(NEW)
      },
      // The agent prepares no transactions yet (docs/PLAN.md, milestone 6).
      settleTransaction: () => {},
    }
  }, [activeId, client, conversations, messages, sendMessage, working])

  return <StoreContext value={value}>{children}</StoreContext>
}
