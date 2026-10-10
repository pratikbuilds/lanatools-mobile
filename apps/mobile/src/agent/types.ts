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

/** An unsigned transaction a tool prepared, waiting for the user. */
export type TransactionPart = {
  type: 'transaction'
  id: string
  state: 'awaiting' | 'signed' | 'declined'
  title: string
  network: 'Solana mainnet'
  pay: { amount: string; token: string }
  receive: { amount: string; token: string }
  feeSol: string
  route: string
  /** Seconds left before the blockhash expires, when it was prepared. */
  expiresInS: number
  signature?: string
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
