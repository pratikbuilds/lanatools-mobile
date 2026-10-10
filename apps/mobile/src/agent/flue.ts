import type { Message, Part, Provider, ToolPart } from './types'
import type {
  AgentStatus,
  FlueConversationMessage,
  FlueConversationPart,
} from '@flue/react'

// Flue's conversation, as the app draws it. Pure functions, so the chat
// renders the same whether the parts came from Flue or the mock agent.

/** MCP tools reach the model as `mcp__<server>__<tool>`. */
const MCP_PREFIX = /^mcp__lanatools__/

const HELIUS = new Set([
  'get_accounts',
  'get_token_info',
  'get_transaction_history',
  'get_transactions',
  'get_wallet_holdings',
])
const PAY = new Set([
  'call',
  'list_catalog',
  'search_catalog',
  'get_catalog_entry',
])

export function providerOf(tool: string): Provider {
  if (tool.startsWith('jupiter_')) return 'Jupiter'
  if (tool.startsWith('phoenix_')) return 'Phoenix'
  if (HELIUS.has(tool)) return 'Helius'
  if (PAY.has(tool)) return 'pay.sh'
  return 'LanaTools'
}

/** `7Ky2dWq4…Ba4T` addresses and long values, cut to fit one line. */
function short(value: string) {
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value))
    return `${value.slice(0, 4)}…${value.slice(-4)}`
  return value.length > 24 ? `${value.slice(0, 23)}…` : value
}

/** What a call asked for, in one line: `owner 7Ky2…Ba4T · limit 10`. */
export function summarize(input: unknown) {
  if (typeof input !== 'object' || input === null) return ''
  return Object.entries(input)
    .filter(([, value]) =>
      ['string', 'number', 'boolean'].includes(typeof value),
    )
    .slice(0, 2)
    .map(([key, value]) => `${key} ${short(String(value))}`)
    .join(' · ')
}

function toPart(part: FlueConversationPart): Part | null {
  switch (part.type) {
    case 'text':
      return { type: 'text', text: part.text }
    case 'reasoning':
      return { type: 'reasoning', text: part.text, state: part.state }
    case 'dynamic-tool': {
      const name = part.toolName.replace(MCP_PREFIX, '')
      const state: ToolPart['state'] =
        part.state === 'input-available'
          ? 'running'
          : part.state === 'output-error'
            ? 'error'
            : 'done'
      return {
        type: 'tool',
        id: part.toolCallId,
        name,
        provider: providerOf(name),
        state,
        summary: summarize(part.input),
        input: (part.input ?? {}) as Record<string, unknown>,
        output: part.output,
        error: part.errorText,
        durationMs: part.durationMs,
      }
    }
    default:
      return null
  }
}

function toMessage(message: FlueConversationMessage): Message {
  return {
    id: message.id,
    role: message.role === 'user' ? 'user' : 'assistant',
    createdAt: message.timestamp ? Date.parse(message.timestamp) : Date.now(),
    parts: message.parts.flatMap((part) => toPart(part) ?? []),
  }
}

const FAILED = 'Your agent ran into a problem. Try again.'
const UNREACHABLE =
  "Couldn't reach your agent. Check your connection and try again."

/** How a turn ended short of a reply, as the reply above it shows it. */
function settled(outcome: 'failed' | 'aborted'): Partial<Message> {
  return outcome === 'aborted' ? { stopped: true } : { error: FAILED }
}

function empty(after: string, fields: Partial<Message>): Message {
  return {
    id: `settled-${after}`,
    role: 'assistant',
    createdAt: Date.now(),
    parts: [],
    ...fields,
  }
}

/**
 * The visible thread. A turn that failed or was stopped marks the reply
 * above it; while the agent works, the latest reply is `streaming`, and a
 * placeholder stands in for it until its first part arrives.
 */
export function toThread(
  messages: FlueConversationMessage[],
  status: AgentStatus,
): Message[] {
  const thread: Message[] = []
  for (const message of messages) {
    if (message.settlement) {
      const outcome = settled(message.settlement.outcome)
      const last = thread.at(-1)
      if (last?.role === 'assistant')
        thread[thread.length - 1] = { ...last, ...outcome }
      else if (last) thread.push(empty(last.id, outcome))
      continue
    }
    if (message.display !== 'visible' || message.role === 'system') continue
    thread.push(toMessage(message))
  }

  const working = status === 'submitted' || status === 'streaming'
  const last = thread.at(-1)
  if (!last) return thread
  if (working && last.role === 'assistant') {
    thread[thread.length - 1] = { ...last, streaming: true }
  } else if (working) {
    thread.push({
      id: `pending-${last.id}`,
      role: 'assistant',
      createdAt: Date.now(),
      parts: [],
      streaming: true,
    })
  } else if (status === 'error' && last.role === 'user') {
    // The send itself failed: the message never reached the agent.
    thread.push(empty(last.id, { error: UNREACHABLE }))
  }
  return thread
}
