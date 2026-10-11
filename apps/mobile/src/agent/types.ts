// A conversation as the app draws it. The parts mirror what Flue streams
// (text, reasoning, dynamic-tool), so the real agent can replace the mock
// without the UI changing.

export type ToolState = 'running' | 'done' | 'error'

/** The tool families a LanaTools grant can include, and LanaTools' own. */
export type Provider = 'Helius' | 'Jupiter' | 'Phoenix' | 'pay.sh' | 'LanaTools'

export type TextPart = { type: 'text'; text: string }

export type ReasoningPart = {
  type: 'reasoning'
  text: string
  state: 'streaming' | 'done'
  /** How long the agent thought, when known. */
  durationMs?: number
}

export type ToolPart = {
  type: 'tool'
  id: string
  /** The MCP tool, as LanaTools names it: `get_wallet_holdings`. */
  name: string
  provider: Provider
  state: ToolState
  /** One line on what the call asked for, for the card's subtitle. */
  summary: string
  input: Record<string, unknown>
  output?: unknown
  error?: string
  durationMs?: number
  /** A paid call's charge, in USDC. Lime: money that moved. */
  costUsd?: number
}

/** What LanaTools says a transaction does, in its own words. */
export type TransactionReview = {
  title: string
  description: string
  /** The button's word for it: "Swap", "Send", "Place order". */
  actionLabel: string
  fields: { label: string; value: string }[]
}

/**
 * An unsigned transaction a LanaTools tool prepared for the user's wallet
 * ("local" delivery). Nothing moves until the user signs it on this phone;
 * the app then sends it through LanaTools and tells the agent.
 */
export type TransactionPart = {
  type: 'transaction'
  /** LanaTools' request id, for get_transaction_status and send_transaction. */
  id: string
  /** The tool that prepared it: `jupiter_swap`, `phoenix_market_order`. */
  tool: string
  /** `pending`: signed and handed to LanaTools, not yet confirmed. */
  state: 'awaiting' | 'sent' | 'pending' | 'declined' | 'failed'
  review: TransactionReview
  /** The wallet that signs and pays the fee. */
  wallet: string
  /** Epoch ms after which LanaTools will not send it. */
  expiresAt: number
  signature?: string | null
  error?: string
}

export type Part = TextPart | ReasoningPart | ToolPart | TransactionPart

export type Message = {
  id: string
  role: 'user' | 'assistant'
  parts: Part[]
  createdAt: number
  /** True while the agent is still writing this message. */
  streaming?: boolean
  /** The user stopped the agent before it finished. */
  stopped?: boolean
  /** Why the agent could not finish, in words for the user. */
  error?: string
}

export type Conversation = {
  id: string
  title: string
  updatedAt: number
  messages: Message[]
}
