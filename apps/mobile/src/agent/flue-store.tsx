import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFlueAgent } from '@flue/react'
import { createFlueClient } from '@flue/sdk'
import { useLanaTools } from '../lanatools/link'
import { useSession } from '../session/session'
import { AGENT_URL } from './config'
import { NEW, StoreContext, titleFrom } from './context'
import { CANT_START, toThread } from './flue'
import type { ConversationSummary, Store } from './context'
import type { Message } from './types'
import type { ReactNode } from 'react'

// Conversations with the LanaTools agent on Flue. The agent keeps each
// conversation's messages; the app follows the active one live and keeps
// only the list of conversations, for this session.
//
// Every request carries the user's Privy access token. The agent issues
// conversation ids tied to that user and refuses anyone else's. Requests
// also hand over the user's LanaTools access token, refreshed first if it
// is about to expire, for the agent's tool calls.

type Headers = () => Promise<Record<string, string>>

async function startConversation(headers: Headers) {
  const response = await fetch(`${AGENT_URL}/conversations`, {
    method: 'POST',
    headers: await headers(),
  })
  if (!response.ok)
    throw new Error(
      `The agent answered ${response.status}: ${await response.text()}`,
    )
  const { id } = (await response.json()) as { id: string }
  return id
}

/** A chat the agent never started: the message, and why it went nowhere. */
function unstarted(id: string, text: string): Message[] {
  return [
    {
      id: `${id}-u`,
      role: 'user',
      createdAt: Date.now(),
      parts: [{ type: 'text', text }],
    },
    {
      id: `${id}-a`,
      role: 'assistant',
      createdAt: Date.now(),
      parts: [],
      error: CANT_START,
    },
  ]
}

export function FlueConversationsProvider({
  children,
}: {
  children: ReactNode
}) {
  const session = useSession()
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activeId, setActiveId] = useState(NEW)
  const [starting, setStarting] = useState(false)
  // Chats whose first message never reached the agent, by local id.
  const [failed, setFailed] = useState<Record<string, string>>({})
  // A new chat's first message, sent once its conversation is followed.
  const first = useRef<string | null>(null)

  // Called on every request and reconnect, so a refreshed token is always
  // the one sent.
  const { getAccessToken } = session
  const { accessToken } = useLanaTools()
  const headers = useCallback<Headers>(async () => {
    const [token, lanatools] = await Promise.all([
      getAccessToken(),
      accessToken(),
    ])
    const headers: Record<string, string> = {}
    if (token) headers.authorization = `Bearer ${token}`
    if (lanatools) {
      headers['x-lanatools-token'] = lanatools.token
      headers['x-lanatools-token-expires'] = String(lanatools.expiresAt)
    }
    return headers
  }, [accessToken, getAccessToken])

  const client = useMemo(
    () =>
      activeId === NEW || activeId in failed
        ? undefined
        : createFlueClient({
            url: `${AGENT_URL}/agents/lana/${activeId}`,
            headers,
          }),
    [activeId, failed, headers],
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
    () =>
      activeId in failed
        ? unstarted(activeId, failed[activeId] ?? '')
        : toThread(agent.messages, agent.status),
    [activeId, agent.messages, agent.status, failed],
  )
  const working =
    starting || agent.status === 'submitted' || agent.status === 'streaming'

  const value = useMemo<Store>(() => {
    const summary = conversations.find((c) => c.id === activeId)
    const touch = (id: string) =>
      setConversations((all) =>
        all.map((c) => (c.id === id ? { ...c, updatedAt: Date.now() } : c)),
      )
    const add = (id: string, text: string) =>
      setConversations((all) => [
        { id, title: titleFrom(text), updatedAt: Date.now() },
        ...all,
      ])
    const start = async (text: string) => {
      setStarting(true)
      try {
        const id = await startConversation(headers)
        add(id, text)
        first.current = text
        setActiveId(id)
      } catch (error) {
        // The thread shows a short message; the cause goes to the logs.
        console.warn('Could not start a conversation', error)
        const id = `unstarted-${Date.now()}`
        add(id, text)
        setFailed((all) => ({ ...all, [id]: text }))
        setActiveId(id)
      } finally {
        setStarting(false)
      }
    }
    return {
      conversations,
      active: summary ? { ...summary, messages } : null,
      working,
      open: setActiveId,
      newChat: () => setActiveId(NEW),
      send: (text) => {
        const trimmed = text.trim()
        if (!trimmed || working) return
        if (activeId === NEW || activeId in failed) {
          void start(trimmed)
          return
        }
        sendMessage(trimmed).catch(() => {})
        touch(activeId)
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
  }, [
    activeId,
    client,
    conversations,
    failed,
    headers,
    messages,
    sendMessage,
    working,
  ])

  return <StoreContext value={value}>{children}</StoreContext>
}
