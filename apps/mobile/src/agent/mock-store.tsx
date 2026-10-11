import { useCallback, useMemo, useRef, useState } from 'react'
import { scriptFor, seedConversations } from './mock'
import { NEW, StoreContext } from './context'
import type { Store } from './context'
import type { Conversation, Message, Part } from './types'
import type { ReactNode } from 'react'

// The mock agent's conversations (EXPO_PUBLIC_MOCK_AGENT=1). It plays back
// scripts: tool calls run and settle, text streams in word by word, and a
// prepared transaction waits for the user.

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new Error('stopped'))
    })
  })

export function MockConversationsProvider({
  children,
}: {
  children: ReactNode
}) {
  const [conversations, setConversations] = useState(() => seedConversations())
  const [activeId, setActiveId] = useState<string>(NEW)
  const [working, setWorking] = useState(false)
  const abort = useRef<AbortController | null>(null)

  const update = useCallback(
    (id: string, change: (c: Conversation) => Conversation) =>
      setConversations((all) => all.map((c) => (c.id === id ? change(c) : c))),
    [],
  )

  const updateMessage = useCallback(
    (cid: string, mid: string, change: (m: Message) => Message) =>
      update(cid, (c) => ({
        ...c,
        updatedAt: Date.now(),
        messages: c.messages.map((m) => (m.id === mid ? change(m) : m)),
      })),
    [update],
  )

  const play = useCallback(
    async (cid: string, mid: string, parts: Part[], signal: AbortSignal) => {
      const push = (part: Part) =>
        updateMessage(cid, mid, (m) => ({ ...m, parts: [...m.parts, part] }))
      const replaceLast = (part: Part) =>
        updateMessage(cid, mid, (m) => ({
          ...m,
          parts: [...m.parts.slice(0, -1), part],
        }))

      await wait(450, signal)
      for (const part of parts) {
        if (part.type === 'tool') {
          push({ ...part, state: 'running', output: undefined })
          await wait(part.durationMs ?? 600, signal)
          replaceLast(part)
          await wait(150, signal)
        } else if (part.type === 'reasoning') {
          push({ ...part, state: 'streaming', durationMs: undefined })
          await wait(900, signal)
          replaceLast({ ...part, state: 'done', durationMs: 900 })
        } else if (part.type === 'text') {
          // A few words at a time, as the stream would arrive, at about
          // 15 updates a second so the list is not re-rendered per word.
          const words = part.text.split(/(?<=\s)/)
          push({ type: 'text', text: '' })
          for (let end = 3; end < words.length + 3; end += 3) {
            replaceLast({ type: 'text', text: words.slice(0, end).join('') })
            await wait(55 + Math.random() * 35, signal)
          }
        } else {
          push(part)
        }
      }
    },
    [updateMessage],
  )

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || working) return
      const now = Date.now()
      const script = scriptFor(trimmed)
      const cid = activeId === NEW ? `c-${now}` : activeId
      const user: Message = {
        id: `m-${now}`,
        role: 'user',
        createdAt: now,
        parts: [{ type: 'text', text: trimmed }],
      }
      const reply: Message = {
        id: `m-${now + 1}`,
        role: 'assistant',
        createdAt: now + 1,
        parts: [],
        streaming: true,
      }
      if (activeId === NEW) {
        setConversations((all) => [
          {
            id: cid,
            title: script.title,
            updatedAt: now,
            messages: [user, reply],
          },
          ...all,
        ])
        setActiveId(cid)
      } else {
        update(cid, (c) => ({
          ...c,
          updatedAt: now,
          messages: [...c.messages, user, reply],
        }))
      }

      const controller = new AbortController()
      abort.current = controller
      setWorking(true)
      play(cid, reply.id, script.parts, controller.signal)
        .catch(() => {})
        .finally(() => {
          updateMessage(cid, reply.id, (m) => ({
            ...m,
            streaming: false,
            stopped: controller.signal.aborted || undefined,
            // A stopped tool call never finished.
            parts: m.parts.map((p) =>
              p.type === 'tool' && p.state === 'running'
                ? { ...p, state: 'error', error: 'Stopped' }
                : p,
            ),
          }))
          setWorking(false)
          abort.current = null
        })
    },
    [activeId, play, update, updateMessage, working],
  )

  const value = useMemo<Store>(
    () => ({
      conversations,
      active: conversations.find((c) => c.id === activeId) ?? null,
      working,
      open: (id) => {
        abort.current?.abort()
        setActiveId(id)
      },
      newChat: () => {
        abort.current?.abort()
        setActiveId(NEW)
      },
      send,
      stop: () => abort.current?.abort(),
      rename: (id, title) => update(id, (c) => ({ ...c, title })),
      remove: (id) => {
        setConversations((all) => all.filter((c) => c.id !== id))
        if (id === activeId) setActiveId(NEW)
      },
      settleTransaction: (messageId, partId, outcome) => {
        const cid = conversations.find((c) =>
          c.messages.some((m) => m.id === messageId),
        )?.id
        if (!cid) return
        updateMessage(cid, messageId, (m) => ({
          ...m,
          parts: m.parts.map((p) =>
            p.type === 'transaction' && p.id === partId
              ? { ...p, ...outcome }
              : p,
          ),
        }))
      },
    }),
    [activeId, conversations, send, update, updateMessage, working],
  )

  return <StoreContext value={value}>{children}</StoreContext>
}
