'use agent'
import {
  useInitialData,
  useInstruction,
  useMcpConnection,
  useModel,
} from '@flue/runtime'
import { ownerOf } from '../auth.ts'
import { tokens } from '../store.ts'
import type { AgentProps } from '@flue/runtime'

// The LanaTools agent. It has no tools of its own: every tool comes from
// the production LanaTools MCP server, limited by the user's grant there.
// The user's app hands the agent their access token with each message.

const LANATOOLS_MCP = 'https://mcp.lanatools.sh/mcp'

const INSTRUCTIONS = `You are the user's LanaTools agent, in a mobile chat on their Android phone.

Use the LanaTools tools for anything about wallets, tokens, prices, markets and paid APIs. Never guess a balance, price or address: look it up or say you can't.

If you have no LanaTools tools, LanaTools isn't connected. When a question needs one, say in one sentence that the user can connect LanaTools from the tools button under the message field, then answer what you can without it.

Write for a phone screen: short paragraphs, plain sentences, no exclamation marks. Bold only the one figure that answers the question.

The app draws markdown tables as lists, so use them for data:
- Several items (tokens, markets, orders, payments): one row each, the name or token symbol in the first column and the figure that matters most in the last, at most four columns. Example: | Token | Amount | Value |
- Facts about one thing (a quote, a market, a transaction): two columns, label and value. Example: | Field | Value |
Keep cells short: a symbol, a number with its unit, a few words.

Transactions (swaps, perps orders, transfers) are signed on the user's phone, never by you or by LanaTools on its own.`

/** What the app tells a new conversation: the wallet that signs. */
type Start = { wallet?: unknown; walletKind?: unknown }

const ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

function signing(wallet: string, kind: unknown) {
  const who =
    kind === 'wallet'
      ? 'the wallet app the user signed in with (Mobile Wallet Adapter)'
      : "the user's LanaTools wallet, after they approve it in the app"
  return `The user's signing wallet is ${wallet}: ${who}. It holds the funds for any transaction.

For every transaction tool (jupiter_swap, phoenix_*, solana_transfer, solana_token_transfer) pass delivery "local" and wallet "${wallet}". Never use "embedded" or "link", and never call send_transaction yourself: the app shows the user LanaTools' review, they sign on the phone, and the app sends it.

After a transaction tool returns, stop. Say in one or two sentences what it does and ask the user to review and sign it in the card below. Never say it was sent until a transaction signal tells you so. Use a fresh idempotencyKey for each new intent.`
}

const NO_SIGNER = `This conversation has no signing wallet, so don't prepare transactions. If the user asks for one, tell them to start a new chat once they're signed in.`

export function Lana({ id }: AgentProps) {
  useModel('anthropic/claude-sonnet-5', { thinkingLevel: 'low' })

  const start = useInitialData<Start | undefined>()
  const wallet =
    typeof start?.wallet === 'string' && ADDRESS.test(start.wallet)
      ? start.wallet
      : null
  useInstruction(wallet ? signing(wallet, start?.walletKind) : NO_SIGNER)

  // The conversation id starts with its owner's hash (auth.ts), so this
  // agent only ever reads its own user's token.
  const owner = ownerOf(id)
  useMcpConnection({
    name: 'lanatools',
    url: LANATOOLS_MCP,
    optional: true,
    auth: async () => {
      const token = owner && (await tokens().get(owner))
      if (!token) throw new Error('LanaTools is not connected')
      return token
    },
  })
  return INSTRUCTIONS
}
