import type {
  Message,
  Part,
  Provider,
  ToolPart,
  TransactionPart,
} from './types'
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

/**
 * The first complete JSON object in `text`, by matching braces outside
 * strings, so text after it (Flue appends the plain content) is ignored.
 */
function firstObject(text: string): unknown {
  const start = text.indexOf('{')
  if (start === -1) return null
  let depth = 0
  let inString = false
  for (let i = start; i < text.length; i++) {
    const char = text[i]
    if (inString) {
      if (char === '\\') i++
      else if (char === '"') inString = false
    } else if (char === '"') inString = true
    else if (char === '{') depth++
    else if (char === '}' && --depth === 0) {
      try {
        return JSON.parse(text.slice(start, i + 1))
      } catch {
        return null
      }
    }
  }
  return null
}

/** A tool result's JSON: its structured content, wherever Flue put it. */
function resultJson(output: unknown): unknown {
  if (typeof output === 'string') {
    const marker = output.indexOf('Structured content:')
    return firstObject(marker === -1 ? output : output.slice(marker))
  }
  if (output && typeof output === 'object' && 'structuredContent' in output)
    return output.structuredContent
  return output
}

type TransactionResult = {
  id?: unknown
  tool?: unknown
  delivery?: unknown
  status?: unknown
  expiresAt?: unknown
  review?: {
    title?: unknown
    description?: unknown
    actionLabel?: unknown
    fields?: { label?: unknown; value?: unknown }[]
  }
  transaction?: { transaction?: unknown; account?: unknown }
}

/**
 * The transaction a LanaTools tool prepared for this phone to sign: a
 * "local" result that is ready and carries the unsigned bytes. Anything
 * else (a link, an embedded send, an error) is just a tool call.
 */
export function transactionFrom(output: unknown): TransactionPart | null {
  const result = resultJson(output) as TransactionResult | null
  if (!result || typeof result !== 'object') return null
  const { id, tool, review, transaction } = result
  if (
    result.delivery !== 'local' ||
    result.status !== 'ready' ||
    typeof id !== 'string' ||
    typeof transaction?.account !== 'string' ||
    typeof transaction.transaction !== 'string' ||
    typeof review?.title !== 'string'
  )
    return null
  return {
    type: 'transaction',
    id,
    tool: typeof tool === 'string' ? tool : 'transaction',
    state: 'awaiting',
    review: {
      title: review.title,
      description:
        typeof review.description === 'string' ? review.description : '',
      actionLabel:
        typeof review.actionLabel === 'string' ? review.actionLabel : 'Sign',
      fields: (review.fields ?? []).flatMap((field) =>
        typeof field.label === 'string' && typeof field.value === 'string'
          ? [{ label: field.label, value: field.value }]
          : [],
      ),
    },
    wallet: transaction.account,
    expiresAt:
      typeof result.expiresAt === 'number'
        ? result.expiresAt
        : Date.now() + 15 * 60_000,
  }
}

/**
 * LanaTools' tools that prepare a transaction. Only their results become a
 * card to sign: not get_transaction_status, not a paid API's JSON.
 */
export const TRANSACTION_TOOLS = new Set([
  'jupiter_swap',
  'solana_transfer',
  'solana_token_transfer',
  'phoenix_activate_account',
  'phoenix_deposit',
  'phoenix_withdraw',
  'phoenix_market_order',
  'phoenix_limit_order',
  'phoenix_cancel_orders',
  'phoenix_close_position',
])

function toParts(part: FlueConversationPart): Part[] {
  const mapped = toPart(part)
  if (!mapped) return []
  if (
    mapped.type !== 'tool' ||
    mapped.state !== 'done' ||
    !TRANSACTION_TOOLS.has(mapped.name)
  )
    return [mapped]
  const transaction = transactionFrom(mapped.output)
  return transaction ? [mapped, transaction] : [mapped]
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
    parts: message.parts.flatMap(toParts),
  }
}

const FAILED = 'Your agent ran into a problem. Try again.'
/** A new chat the agent would not start: unreachable, or signed out. */
export const CANT_START =
  "Couldn't start a chat with your agent. Check your connection and try again."

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
